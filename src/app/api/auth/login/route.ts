import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { isValidIndonesianPhoneNumber, normalizeIndonesianPhoneNumber } from "@/lib/phone";

const schema = z.object({
  phone: z.string().min(8).max(30).refine(isValidIndonesianPhoneNumber, {
    message: "Nomor WhatsApp Indonesia tidak valid",
  }),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const normalizedPhone = normalizeIndonesianPhoneNumber(parsed.data.phone);
  const participant = await prisma.participant.findUnique({
    where: { normalizedPhoneNumber: normalizedPhone },
  });
  if (!participant) {
    return Response.json({ error: "Nomor WhatsApp belum terdaftar" }, { status: 401 });
  }
  const otp = await requestOtp({
    phoneNumber: normalizedPhone,
    purpose: "LOGIN",
    participantId: participant.id,
  });
  if (!otp.ok) return Response.json({ error: otp.error }, { status: otp.status });
  return Response.json({ ok: true, requiresOtp: true, phone: normalizedPhone, debugCode: otp.debugCode });
}
