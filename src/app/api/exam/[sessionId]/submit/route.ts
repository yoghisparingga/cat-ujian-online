import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { finalizeSession } from "@/lib/exam";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const participant = await requireParticipant();
  const { sessionId } = await ctx.params;
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.participantId !== participant.id) {
    return Response.json({ error: "Session tidak ditemukan" }, { status: 404 });
  }
  const finalized = await finalizeSession(sessionId);
  return Response.json({ ok: true, status: finalized?.status, totalScore: finalized?.totalScore });
}
