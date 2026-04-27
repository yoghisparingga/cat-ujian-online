import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";

const schema = z.object({
  eventType: z.enum([
    "TAB_BLUR",
    "TAB_FOCUS",
    "WINDOW_CLOSE",
    "VISIBILITY_HIDDEN",
    "VISIBILITY_VISIBLE",
    "HEARTBEAT",
  ]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const participant = await requireParticipant();
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.participantId !== participant.id) {
    return Response.json({ error: "Session tidak ditemukan" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.attemptActivityLog.create({
      data: {
        sessionId,
        eventType: parsed.data.eventType,
        metadata: parsed.data.metadata ? JSON.parse(JSON.stringify(parsed.data.metadata)) : Prisma.JsonNull,
      },
    }),
    prisma.examSession.update({
      where: { id: sessionId },
      data: { lastSeenAt: new Date() },
    }),
  ]);

  return Response.json({ ok: true });
}
