import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { computeRemainingSeconds, finalizeSession, isExpired } from "@/lib/exam";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const participant = await requireParticipant();
  const { sessionId } = await ctx.params;

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { package: true, answers: true },
  });
  if (!session || session.participantId !== participant.id) {
    return Response.json({ error: "Session tidak ditemukan" }, { status: 404 });
  }

  // Auto-finalize if expired
  if (session.status === "IN_PROGRESS" && isExpired(session)) {
    await finalizeSession(session.id);
    const refreshed = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: { package: true, answers: true },
    });
    if (!refreshed) return Response.json({ error: "Session tidak ditemukan" }, { status: 404 });
    return buildResponse(refreshed);
  }

  return buildResponse(session);
}

type SessionWithIncludes = NonNullable<Awaited<ReturnType<typeof prisma.examSession.findUnique>>> & {
  package: NonNullable<Awaited<ReturnType<typeof prisma.package.findUnique>>>;
  answers: Awaited<ReturnType<typeof prisma.answer.findMany>>;
};

async function buildResponse(session: SessionWithIncludes) {
  const order = session.questionOrder as string[];
  const questions = await prisma.question.findMany({
    where: { id: { in: order } },
    include: { options: { orderBy: { order: "asc" } }, category: true },
  });
  const byId = new Map(questions.map((q) => [q.id, q]));
  const orderedQuestions = order.map((id) => byId.get(id)).filter((q): q is NonNullable<typeof q> => Boolean(q));

  const answersByQuestion = new Map(session.answers.map((a) => [a.questionId, a.optionId]));

  return Response.json({
    session: {
      id: session.id,
      status: session.status,
      durationMinutes: session.durationMinutes,
      remainingSeconds: computeRemainingSeconds(session),
      packageName: session.package.name,
      totalScore: session.totalScore,
    },
    questions: orderedQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      category: { id: q.category.id, name: q.category.name },
      options: q.options.map((o) => ({
        id: o.id,
        text: o.text,
        order: o.order,
        // Hide score/isCorrect from participant during exam
      })),
      selectedOptionId: answersByQuestion.get(q.id) ?? null,
    })),
  });
}
