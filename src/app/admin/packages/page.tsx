import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DeletePackageButton } from "./DeletePackageButton";

export const dynamic = "force-dynamic";

export default async function PackagesPage() {
  await requireAdmin();
  const packages = await prisma.package.findMany({
    include: {
      packageCategories: { include: { category: true } },
      _count: { select: { pins: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Paket Try Out</h1>
        <Link href="/admin/packages/new" className="btn-primary">
          + Tambah Paket
        </Link>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Durasi</th>
              <th className="px-4 py-2 font-medium">Komposisi</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">PIN</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {packages.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-4 text-zinc-500">
                  Belum ada paket.
                </td>
              </tr>
            )}
            {packages.map((p) => {
              const total = p.packageCategories.reduce((s, pc) => s + pc.questionCount, 0);
              return (
                <tr key={p.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-zinc-500">{p.code}</div>
                  </td>
                  <td className="px-4 py-2">{p.durationMinutes} menit</td>
                  <td className="px-4 py-2">
                    <div className="text-xs text-zinc-600">
                      {total} soal:{" "}
                      {p.packageCategories
                        .map((pc) => `${pc.category.name} (${pc.questionCount})`)
                        .join(", ")}
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    {p.isActive ? (
                      <span className="text-emerald-700 text-xs font-medium">Aktif</span>
                    ) : (
                      <span className="text-zinc-500 text-xs">Nonaktif</span>
                    )}
                  </td>
                  <td className="px-4 py-2">{p._count.pins}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <Link href={`/admin/packages/${p.id}/edit`} className="text-blue-600 hover:underline">
                      Edit
                    </Link>
                    <DeletePackageButton id={p.id} />
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
