import Link from "next/link";
import { requireParticipant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LogoutButton } from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const participant = await requireParticipant();
  const pins = await prisma.participantPin.findMany({
    where: { participantId: participant.id },
    include: {
      package: {
        include: {
          packageCategories: { include: { category: true } },
        },
      },
      session: { select: { id: true, status: true, totalScore: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-semibold text-lg">CAT Ujian Online</h1>
            <p className="text-xs text-zinc-500">
              Halo, {participant.name} ({participant.email})
            </p>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold mb-1">Paket Try Out</h2>
            <p className="text-sm text-zinc-600">
              Pilih paket yang sudah diberikan PIN-nya untuk Anda.
            </p>
          </div>

          {pins.length === 0 ? (
            <div className="card p-8 text-center text-zinc-600">
              Belum ada paket yang ditugaskan kepada Anda. Silakan hubungi admin
              untuk mendapatkan PIN.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {pins.map((p) => {
                const totalSoal = p.package.packageCategories.reduce(
                  (sum, pc) => sum + pc.questionCount,
                  0
                );
                const status = p.session?.status;
                return (
                  <div key={p.id} className="card p-6 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg">{p.package.name}</h3>
                      {p.package.description && (
                        <p className="text-sm text-zinc-600 mt-0.5">
                          {p.package.description}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 space-y-0.5">
                      <div>Durasi: {p.package.durationMinutes} menit</div>
                      <div>Total soal: {totalSoal}</div>
                      <div>
                        Kategori:{" "}
                        {p.package.packageCategories
                          .map((pc) => `${pc.category.name} (${pc.questionCount})`)
                          .join(", ")}
                      </div>
                    </div>
                    <div className="pt-2">
                      {status === "SUBMITTED" || status === "EXPIRED" ? (
                        <div className="space-y-2">
                          <div className="text-sm">
                            Status:{" "}
                            <span className="font-medium">
                              {status === "SUBMITTED" ? "Selesai" : "Habis Waktu"}
                            </span>
                            {" — Skor: "}
                            <span className="font-semibold">{p.session?.totalScore}</span>
                          </div>
                          <Link
                            href={`/exam/${p.session?.id}/result`}
                            className="btn-secondary text-xs"
                          >
                            Lihat hasil
                          </Link>
                        </div>
                      ) : status === "IN_PROGRESS" ? (
                        <Link
                          href={`/exam/${p.session?.id}`}
                          className="btn-primary"
                        >
                          Lanjutkan Ujian
                        </Link>
                      ) : (
                        <Link
                          href={`/exam/start/${p.id}`}
                          className="btn-primary"
                        >
                          Mulai Ujian
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
