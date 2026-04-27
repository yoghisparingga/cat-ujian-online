import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { setParticipantSession } from "@/lib/session";

const schema = z.object({
  email: z.string().email(),
  phone: z.string().min(6).max(40),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { email, phone } = parsed.data;
  const participant = await prisma.participant.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!participant || participant.phone !== phone) {
    return Response.json({ error: "Email atau no telpon salah" }, { status: 401 });
  }
  await setParticipantSession(participant.id);
  return Response.json({ ok: true });
}
