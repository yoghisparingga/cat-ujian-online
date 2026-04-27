import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setParticipantSession } from "@/lib/session";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(6).max(40),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, email, phone } = parsed.data;

  const existing = await prisma.participant.findUnique({ where: { email } });
  if (existing) {
    return Response.json({ error: "Email sudah terdaftar" }, { status: 409 });
  }

  const participant = await prisma.participant.create({
    data: { name, email: email.toLowerCase(), phone },
  });
  await setParticipantSession(participant.id);
  return Response.json({ ok: true, participant: { id: participant.id, name: participant.name } });
}
