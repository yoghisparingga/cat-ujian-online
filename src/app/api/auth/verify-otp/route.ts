import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { verifyOtp } from "@/lib/otp";
import { indonesianPhoneSchema } from "@/lib/phone";
import { setParticipantSession } from "@/lib/session";

const schema = z.object({
  phone: indonesianPhoneSchema,
  code: z.string().regex(/^\d{6}$/),
  purpose: z.enum(["REGISTER", "LOGIN", "VERIFY_PHONE", "LINK_PHONE"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const verified = await verifyOtp({
    phoneNumber: parsed.data.phone,
    code: parsed.data.code,
    purpose: parsed.data.purpose,
  });
  if (!verified.ok) return Response.json({ error: verified.error }, { status: 400 });

  const participant = await prisma.participant.findUnique({
    where: { normalizedPhoneNumber: parsed.data.phone },
  });
  if (!participant) return Response.json({ error: "Peserta tidak ditemukan" }, { status: 404 });

  if (!participant.phoneVerified) {
    await prisma.participant.update({
      where: { id: participant.id },
      data: { phoneVerified: true },
    });
  }
  await setParticipantSession(participant.id);

  const activeSession = await prisma.examSession.findFirst({
    where: { participantId: participant.id, status: "IN_PROGRESS" },
    orderBy: { startedAt: "desc" },
    select: { id: true },
  });

  return Response.json({
    ok: true,
    redirectTo: activeSession ? `/exam/${activeSession.id}` : "/dashboard",
  });
}
