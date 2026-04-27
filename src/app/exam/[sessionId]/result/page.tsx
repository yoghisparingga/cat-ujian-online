import Link from "next/link";
import { notFound } from "next/navigation";
import { requireParticipant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { finalizeSession, isExpired } from "@/lib/exam";

export const dynamic = "force-dynamic";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const participant = await requireParticipant();
  let session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      package: true,
      answers: { include: { question: { include: { category: true } } } },
    },
  });
  if (!session || session.participantId !== participant.id) notFound();

  if (session.status === "IN_PROGRESS" && isExpired(session)) {
    await finalizeSession(session.id);
    session = await prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        package: true,
        answers: { include: { question: { include: { category: true } } } },
      },
    });
    if (!session) notFound();
  }

  const order = session.questionOrder as string[];
  const totalQuestions = order.length;

  // Aggregate per category
  const perCategory: Record<string, { name: string; score: number; count: number; max: number }> = {};
  for (const a of session.answers) {
    const cat = a.question.category;
    const existing = perCategory[cat.id] ?? {
      name: cat.name,
      score: 0,
      count: 0,
      max: 0,
    };
    existing.score += a.score;
    existing.count += 1;
    perCategory[cat.id] = existing;
  }
  // Compute max per category from question types in the session
  const sessionQuestions = await prisma.question.findMany({
    where: { id: { in: order } },
    include: { category: true },
  });
  for (const q of sessionQuestions) {
    const existing = perCategory[q.category.id] ?? {
      name: q.category.name,
      score: 0,
      count: 0,
      max: 0,
    };
    existing.max += 5; // both MC and Likert have max 5 per question
    perCategory[q.category.id] = existing;
  }
  const totalMax = totalQuestions * 5;

  return (
    <main className="flex-1">
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Hasil Ujian</h1>
          <p className="text-sm text-zinc-600">{session.package.name}</p>
        </div>

        <div className="card p-6 space-y-3">
          <div className="text-sm text-zinc-600">Status</div>
          <div className="text-lg font-semibold">
            {session.status === "SUBMITTED"
              ? "Selesai"
              : session.status === "EXPIRED"
              ? "Habis Waktu"
              : "Sedang Berlangsung"}
          </div>
          <div className="text-sm text-zinc-600">Skor Total</div>
          <div className="text-4xl font-bold tracking-tight">
            {session.totalScore}{" "}
            <span className="text-lg font-normal text-zinc-500">/ {totalMax}</span>
          </div>
          <div className="text-xs text-zinc-500">
            Soal terjawab {session.answers.length} dari {totalQuestions}
          </div>
        </div>

        <div className="card p-6">
          <div className="font-semibold mb-3">Detail per Kategori</div>
          <div className="space-y-3">
            {Object.values(perCategory).map((c) => {
              const pct = c.max > 0 ? Math.round((c.score / c.max) * 100) : 0;
              return (
                <div key={c.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-zinc-600">
                      {c.score} / {c.max} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-zinc-900"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Link href="/dashboard" className="btn-secondary">
          &larr; Kembali ke Dashboard
        </Link>
      </div>
    </main>
  );
}
