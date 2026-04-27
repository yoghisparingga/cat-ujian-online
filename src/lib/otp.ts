import crypto from "crypto";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "./db";
import { normalizeIndonesianPhoneNumber } from "./phone";
import { whatsAppService } from "./whatsapp";

const OTP_SECRET = process.env.OTP_SECRET || process.env.SESSION_SECRET || "dev-otp-secret-change-me";
const EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES || "5");
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || "60");
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || "5");
const SHOW_DEV_OTP = process.env.SHOW_DEV_OTP === "true" || process.env.NODE_ENV !== "production";

export function generateOtpCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtpCode(code: string, normalizedPhoneNumber: string, purpose: OtpPurpose): string {
  return crypto
    .createHmac("sha256", OTP_SECRET)
    .update(`${purpose}:${normalizedPhoneNumber}:${code}`)
    .digest("hex");
}

export async function requestOtp({
  phoneNumber,
  purpose,
  participantId,
}: {
  phoneNumber: string;
  purpose: OtpPurpose;
  participantId?: string | null;
}) {
  const normalizedPhoneNumber = normalizeIndonesianPhoneNumber(phoneNumber);
  const now = new Date();
  const cooldownStart = new Date(now.getTime() - RESEND_COOLDOWN_SECONDS * 1000);
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000);

  const [recent, hourlyCount] = await Promise.all([
    prisma.otpCode.findFirst({
      where: {
        normalizedPhoneNumber,
        purpose,
        createdAt: { gte: cooldownStart },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.otpCode.count({
      where: {
        normalizedPhoneNumber,
        purpose,
        createdAt: { gte: hourStart },
      },
    }),
  ]);

  if (recent) {
    return {
      ok: false as const,
      error: `Tunggu ${RESEND_COOLDOWN_SECONDS} detik sebelum meminta OTP baru`,
      status: 429,
    };
  }
  if (hourlyCount >= 5) {
    return {
      ok: false as const,
      error: "Batas request OTP per jam tercapai",
      status: 429,
    };
  }

  const code = generateOtpCode();
  const expiresAt = new Date(now.getTime() + EXPIRES_MINUTES * 60_000);
  await prisma.$transaction([
    prisma.otpCode.updateMany({
      where: {
        normalizedPhoneNumber,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: now },
    }),
    prisma.otpCode.create({
      data: {
        participantId,
        phoneNumber,
        normalizedPhoneNumber,
        codeHash: hashOtpCode(code, normalizedPhoneNumber, purpose),
        purpose,
        expiresAt,
      },
    }),
  ]);

  const sendResult = await whatsAppService.sendOtp(normalizedPhoneNumber, code, purpose);
  if (!sendResult.ok) {
    await prisma.otpCode.updateMany({
      where: {
        normalizedPhoneNumber,
        purpose,
        consumedAt: null,
        invalidatedAt: null,
      },
      data: { invalidatedAt: new Date() },
    });
    return {
      ok: false as const,
      error: sendResult.errorMessage || "Gagal mengirim OTP WhatsApp",
      status: 502,
    };
  }

  return {
    ok: true as const,
    normalizedPhoneNumber,
    expiresAt,
    debugCode: SHOW_DEV_OTP ? sendResult.debugCode : undefined,
  };
}

export async function verifyOtp({
  phoneNumber,
  code,
  purpose,
}: {
  phoneNumber: string;
  code: string;
  purpose: OtpPurpose;
}) {
  const normalizedPhoneNumber = normalizeIndonesianPhoneNumber(phoneNumber);
  const row = await prisma.otpCode.findFirst({
    where: {
      normalizedPhoneNumber,
      purpose,
      consumedAt: null,
      invalidatedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!row) return { ok: false as const, error: "OTP tidak ditemukan atau sudah tidak berlaku" };
  if (row.expiresAt.getTime() < Date.now()) return { ok: false as const, error: "OTP sudah expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false as const, error: "Percobaan OTP melebihi batas" };

  const expected = row.codeHash;
  const actual = hashOtpCode(code, normalizedPhoneNumber, purpose);
  const isMatch =
    expected.length === actual.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));

  if (!isMatch) {
    await prisma.otpCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false as const, error: "Kode OTP salah" };
  }

  await prisma.otpCode.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true as const, otp: row };
}
