import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const sessions = await prisma.examSession.findMany({
    include: {
      participant: true,
      package: true,
      answers: { include: { question: { include: { category: true } } } },
    },
    orderBy: { startedAt: "desc" },
  });
  const results = sessions.map((s) => {
    const perCategory: Record<string, { name: string; score: number; count: number }> = {};
    for (const a of s.answers) {
      const cat = a.question.category;
      const existing = perCategory[cat.id] ?? { name: cat.name, score: 0, count: 0 };
      existing.score += a.score;
      existing.count += 1;
      perCategory[cat.id] = existing;
    }
    return {
      id: s.id,
      participant: {
        id: s.participant.id,
        name: s.participant.name,
        email: s.participant.email,
        normalizedPhoneNumber: s.participant.normalizedPhoneNumber,
      },
      packageName: s.package.name,
      status: s.status,
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
      totalScore: s.totalScore,
      answeredCount: s.answers.length,
      perCategory: Object.values(perCategory),
    };
  });
  return Response.json({ results });
}
