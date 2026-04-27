import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  await requireAdmin();
  const sessions = await prisma.examSession.findMany({
    where: { status: "IN_PROGRESS" },
    include: {
      participant: true,
      package: true,
      activityLogs: { orderBy: { createdAt: "desc" }, take: 5 },
      answers: { select: { id: true } },
    },
    orderBy: { lastSeenAt: "desc" },
  });

  return (
    <main className="p-8 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">Monitoring Ujian</h1>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Peserta</th>
              <th className="px-4 py-2 font-medium">Paket</th>
              <th className="px-4 py-2 font-medium">Last Seen</th>
              <th className="px-4 py-2 font-medium">Jawaban</th>
              <th className="px-4 py-2 font-medium">Aktivitas Terakhir</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-zinc-500">
                  Tidak ada sesi berjalan.
                </td>
              </tr>
            )}
            {sessions.map((session) => (
              <tr key={session.id} className="border-t border-zinc-100 align-top">
                <td className="px-4 py-2">
                  <div className="font-medium">{session.participant.name}</div>
                  <div className="text-xs text-zinc-500">
                    {session.participant.email || session.participant.normalizedPhoneNumber}
                  </div>
                </td>
                <td className="px-4 py-2">{session.package.name}</td>
                <td className="px-4 py-2 text-xs">{session.lastSeenAt.toLocaleString()}</td>
                <td className="px-4 py-2">{session.answers.length}</td>
                <td className="px-4 py-2 text-xs">
                  {session.activityLogs.map((log) => (
                    <div key={log.id}>
                      {log.eventType} — {log.createdAt.toLocaleTimeString()}
                    </div>
                  ))}
                  <Link href={`/admin/results`} className="text-blue-600 hover:underline">
                    Lihat hasil
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
