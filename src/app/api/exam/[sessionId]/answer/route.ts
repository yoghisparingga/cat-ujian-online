import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { isExpired, finalizeSession } from "@/lib/exam";

const schema = z.object({
  questionId: z.string().min(1),
  optionId: z.string().min(1),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const participant = await requireParticipant();
  const { sessionId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { questionId, optionId } = parsed.data;

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.participantId !== participant.id) {
    return Response.json({ error: "Session tidak ditemukan" }, { status: 404 });
  }
  if (session.status !== "IN_PROGRESS") {
    return Response.json({ error: "Sesi sudah selesai" }, { status: 400 });
  }
  if (isExpired(session)) {
    await finalizeSession(sessionId);
    return Response.json({ error: "Waktu ujian sudah habis" }, { status: 400 });
  }

  const order = session.questionOrder as string[];
  if (!order.includes(questionId)) {
    return Response.json({ error: "Soal bukan bagian dari sesi" }, { status: 400 });
  }

  const option = await prisma.option.findUnique({ where: { id: optionId } });
  if (!option || option.questionId !== questionId) {
    return Response.json({ error: "Opsi tidak valid" }, { status: 400 });
  }

  await prisma.answer.upsert({
    where: { sessionId_questionId: { sessionId, questionId } },
    create: { sessionId, questionId, optionId, score: option.score },
    update: { optionId, score: option.score },
  });

  return Response.json({ ok: true });
}
