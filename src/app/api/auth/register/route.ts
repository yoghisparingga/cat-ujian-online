import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestOtp } from "@/lib/otp";
import { indonesianPhoneSchema } from "@/lib/phone";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160).optional().or(z.literal("")),
  phone: indonesianPhoneSchema,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, phone } = parsed.data;
  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;

  const [existingEmail, existingPhone] = await Promise.all([
    email ? prisma.participant.findUnique({ where: { email } }) : null,
    prisma.participant.findUnique({ where: { normalizedPhoneNumber: phone } }),
  ]);
  if (existingEmail) {
    return Response.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }
  if (existingPhone) {
    return Response.json({ error: "Nomor WhatsApp sudah terdaftar" }, { status: 409 });
  }

  const participant = await prisma.participant.create({
    data: { name, email, phone, normalizedPhoneNumber: phone, phoneVerified: false },
  });
  const otp = await requestOtp({
    phoneNumber: phone,
    purpose: "REGISTER",
    participantId: participant.id,
  });
  if (!otp.ok) {
    await prisma.participant.delete({ where: { id: participant.id } }).catch(() => undefined);
    return Response.json({ error: otp.error }, { status: otp.status });
  }

  return Response.json({
    ok: true,
    requiresOtp: true,
    phone,
    debugCode: otp.debugCode,
    participant: { id: participant.id, name: participant.name },
  });
}
