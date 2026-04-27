import { prisma } from "./db";
import type { ExamSession } from "@prisma/client";

export function computeRemainingSeconds(session: ExamSession): number {
  const endMs = session.expiresAt?.getTime() ?? session.startedAt.getTime() + session.durationMinutes * 60_000;
  const remaining = Math.floor((endMs - Date.now()) / 1000);
  return Math.max(0, remaining);
}

export function isExpired(session: ExamSession): boolean {
  return computeRemainingSeconds(session) <= 0;
}

export async function finalizeSession(sessionId: string) {
  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { answers: true },
  });
  if (!session) return null;
  if (session.status !== "IN_PROGRESS") return session;

  const totalScore = session.answers.reduce((sum, a) => sum + a.score, 0);
  return prisma.examSession.update({
    where: { id: sessionId },
    data: {
      status: isExpired(session) ? "EXPIRED" : "SUBMITTED",
      submittedAt: new Date(),
      totalScore,
    },
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePin4(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
