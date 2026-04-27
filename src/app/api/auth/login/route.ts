import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { indonesianPhoneSchema } from "@/lib/phone";

const schema = z.object({
  phone: indonesianPhoneSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { phone } = parsed.data;
  const participant = await prisma.participant.findUnique({
    where: { normalizedPhoneNumber: phone },
  });
  if (!participant) {
    return Response.json({ error: "Nomor WhatsApp belum terdaftar" }, { status: 401 });
  }
  const otp = await requestOtp({
    phoneNumber: phone,
    purpose: "LOGIN",
    participantId: participant.id,
  });
  if (!otp.ok) return Response.json({ error: otp.error }, { status: otp.status });
  return Response.json({ ok: true, requiresOtp: true, phone, debugCode: otp.debugCode });
}
