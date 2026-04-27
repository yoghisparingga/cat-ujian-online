import { OtpPurpose, WhatsAppMessageStatus } from "@prisma/client";
import { prisma } from "./db";
import { normalizeIndonesianPhoneNumber } from "./phone";

export type SendMessageResult = {
  ok: boolean;
  status: WhatsAppMessageStatus;
  response?: unknown;
  errorMessage?: string;
  debugCode?: string;
};

export interface WhatsAppProvider {
  sendMessage(phoneNumber: string, message: string, messageType?: string): Promise<SendMessageResult>;
}

const DEFAULT_TEMPLATES: Record<OtpPurpose, string> = {
  LOGIN: "Kode OTP login CAT Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.",
  REGISTER: "Kode OTP registrasi CAT Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.",
  VERIFY_PHONE: "Kode verifikasi nomor WhatsApp Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.",
  LINK_PHONE: "Kode verifikasi nomor WhatsApp Anda adalah {{code}}. Berlaku selama {{minutes}} menit. Jangan berikan kode ini kepada siapa pun.",
};

export async function getWhatsAppSetting() {
  const existing = await prisma.whatsAppSetting.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.whatsAppSetting.create({ data: {} });
}

export class CustomWhatsAppGatewayProvider implements WhatsAppProvider {
  async sendMessage(phoneNumber: string, message: string, messageType = "CUSTOM"): Promise<SendMessageResult> {
    const normalizedPhoneNumber = normalizeIndonesianPhoneNumber(phoneNumber);
    const setting = await getWhatsAppSetting();
    const senderId = setting.senderId || process.env.WHATSAPP_SENDER_ID || "";
    const apiKey = setting.apiKeyEncrypted || process.env.WHATSAPP_API_KEY || "";
    const urlEndpoint = setting.urlEndpoint || process.env.WHATSAPP_URL_ENDPOINT || "";
    const payload = {
      sender_id: senderId,
      phone_number: normalizedPhoneNumber,
      message,
    };

    if (!setting.isActive || !senderId || !apiKey || !urlEndpoint) {
      await this.logMessage({
        phoneNumber,
        normalizedPhoneNumber,
        messageType,
        payload,
        response: { simulated: true, reason: "Gateway WhatsApp belum aktif/lengkap" },
        status: "SENT",
      });
      return {
        ok: true,
        status: "SENT",
        response: { simulated: true },
        debugCode: extractOtpFromMessage(message),
      };
    }

    try {
      const response = await fetch(urlEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      const parsedResponse = parseJsonOrText(responseText);
      const status: WhatsAppMessageStatus = response.ok ? "SENT" : "FAILED";
      await this.logMessage({
        phoneNumber,
        normalizedPhoneNumber,
        messageType,
        payload,
        response: parsedResponse,
        status,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      });
      return {
        ok: response.ok,
        status,
        response: parsedResponse,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Gagal mengirim WhatsApp";
      await this.logMessage({
        phoneNumber,
        normalizedPhoneNumber,
        messageType,
        payload,
        status: "FAILED",
        errorMessage,
      });
      return { ok: false, status: "FAILED", errorMessage };
    }
  }

  private async logMessage({
    phoneNumber,
    normalizedPhoneNumber,
    messageType,
    payload,
    response,
    status,
    errorMessage,
  }: {
    phoneNumber: string;
    normalizedPhoneNumber: string;
    messageType: string;
    payload: Record<string, string>;
    response?: unknown;
    status: WhatsAppMessageStatus;
    errorMessage?: string;
  }) {
    await prisma.whatsAppMessageLog.create({
      data: {
        providerName: "CustomWhatsAppGatewayProvider",
        phoneNumber,
        normalizedPhoneNumber,
        messageType,
        payload,
        response: response === undefined ? undefined : (response as object),
        status,
        errorMessage,
      },
    });
  }
}

export class WhatsAppService {
  getActiveProvider(): WhatsAppProvider {
    return new CustomWhatsAppGatewayProvider();
  }

  renderTemplate(template: string, variables: Record<string, string | number>) {
    return Object.entries(variables).reduce(
      (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
      template
    );
  }

  async sendOtp(phoneNumber: string, code: string, purpose: OtpPurpose) {
    const setting = await getWhatsAppSetting();
    const minutes = Number(process.env.OTP_EXPIRES_MINUTES || "5");
    const template =
      purpose === "LOGIN"
        ? setting.loginOtpTemplate
        : purpose === "REGISTER"
        ? setting.registrationOtpTemplate
        : setting.verifyPhoneOtpTemplate || DEFAULT_TEMPLATES[purpose];
    return this.sendMessage(phoneNumber, this.renderTemplate(template, { code, minutes }), `OTP_${purpose}`);
  }

  async sendMessage(phoneNumber: string, message: string, messageType?: string) {
    return this.getActiveProvider().sendMessage(phoneNumber, message, messageType);
  }

  async testSendMessage(phoneNumber: string, message: string) {
    return this.sendMessage(phoneNumber, message, "TEST");
  }
}

function parseJsonOrText(text: string) {
  try {
    return JSON.parse(text) as object;
  } catch {
    return { raw: text };
  }
}

function extractOtpFromMessage(message: string) {
  return message.match(/\b\d{6}\b/)?.[0];
}

export const whatsAppService = new WhatsAppService();
