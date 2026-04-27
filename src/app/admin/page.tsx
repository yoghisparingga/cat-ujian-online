import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();
  const [participants, categories, questions, packages, pins, sessions] = await Promise.all([
    prisma.participant.count(),
    prisma.category.count(),
    prisma.question.count(),
    prisma.package.count(),
    prisma.participantPin.count(),
    prisma.examSession.count(),
  ]);
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Peserta" value={participants} />
        <Stat label="Kategori" value={categories} />
        <Stat label="Soal" value={questions} />
        <Stat label="Paket" value={packages} />
        <Stat label="PIN" value={pins} />
        <Stat label="Sesi Ujian" value={sessions} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
    </div>
  );
}
