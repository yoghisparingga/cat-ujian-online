import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminResultsPage() {
  await requireAdmin();
  const sessions = await prisma.examSession.findMany({
    include: {
      participant: true,
      package: true,
      answers: { include: { question: { include: { category: true } } } },
    },
    orderBy: { startedAt: "desc" },
  });

  return (
    <main className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Hasil Ujian</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Peserta</th>
              <th className="px-4 py-2 font-medium">Paket</th>
              <th className="px-4 py-2 font-medium">Mulai</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Skor Total</th>
              <th className="px-4 py-2 font-medium">Per Kategori</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-3 text-zinc-500">
                  Belum ada sesi ujian.
                </td>
              </tr>
            )}
            {sessions.map((s) => {
              const perCategory: Record<string, { name: string; score: number; count: number }> = {};
              for (const a of s.answers) {
                const c = a.question.category;
                const existing = perCategory[c.id] ?? { name: c.name, score: 0, count: 0 };
                existing.score += a.score;
                existing.count += 1;
                perCategory[c.id] = existing;
              }
              return (
                <tr key={s.id} className="border-t border-zinc-100 align-top">
                  <td className="px-4 py-2">
                    <div className="font-medium">{s.participant.name}</div>
                    <div className="text-xs text-zinc-500">{s.participant.email}</div>
                  </td>
                  <td className="px-4 py-2">{s.package.name}</td>
                  <td className="px-4 py-2 text-xs">{new Date(s.startedAt).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`text-xs ${
                        s.status === "SUBMITTED"
                          ? "text-emerald-700"
                          : s.status === "EXPIRED"
                          ? "text-amber-700"
                          : "text-blue-700"
                      }`}
                    >
                      {s.status === "SUBMITTED"
                        ? "Selesai"
                        : s.status === "EXPIRED"
                        ? "Habis Waktu"
                        : "Berlangsung"}
                    </span>
                  </td>
                  <td className="px-4 py-2 font-semibold">{s.totalScore}</td>
                  <td className="px-4 py-2 text-xs">
                    {Object.values(perCategory).map((c) => (
                      <div key={c.name}>
                        {c.name}: {c.score} ({c.count})
                      </div>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
