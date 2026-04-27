import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWhatsAppSetting } from "@/lib/whatsapp";

const schema = z.object({
  senderId: z.string().max(160).optional(),
  apiKey: z.string().max(500).optional(),
  urlEndpoint: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
  loginOtpTemplate: z.string().min(1).max(500),
  registrationOtpTemplate: z.string().min(1).max(500),
  verifyPhoneOtpTemplate: z.string().min(1).max(500),
});

export async function GET() {
  await requireAdmin();
  const setting = await getWhatsAppSetting();
  return Response.json({
    setting: {
      senderId: setting.senderId ?? "",
      apiKey: setting.apiKeyEncrypted ? "********" : "",
      urlEndpoint: setting.urlEndpoint ?? "",
      isActive: setting.isActive,
      loginOtpTemplate: setting.loginOtpTemplate,
      registrationOtpTemplate: setting.registrationOtpTemplate,
      verifyPhoneOtpTemplate: setting.verifyPhoneOtpTemplate,
    },
  });
}

export async function PUT(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const current = await getWhatsAppSetting();
  const data = parsed.data;
  const setting = await prisma.whatsAppSetting.update({
    where: { id: current.id },
    data: {
      senderId: data.senderId || null,
      apiKeyEncrypted: data.apiKey && data.apiKey !== "********" ? data.apiKey : current.apiKeyEncrypted,
      urlEndpoint: data.urlEndpoint || null,
      isActive: data.isActive,
      loginOtpTemplate: data.loginOtpTemplate,
      registrationOtpTemplate: data.registrationOtpTemplate,
      verifyPhoneOtpTemplate: data.verifyPhoneOtpTemplate,
    },
  });
  return Response.json({ ok: true, setting: { id: setting.id } });
}
