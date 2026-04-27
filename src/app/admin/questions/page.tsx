import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DeleteQuestionButton } from "./DeleteQuestionButton";

export const dynamic = "force-dynamic";

export default async function QuestionsPage() {
  await requireAdmin();
  const [questions, categories] = await Promise.all([
    prisma.question.findMany({
      include: { category: true, _count: { select: { options: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Bank Soal</h1>
        <Link href="/admin/questions/new" className="btn-primary">
          + Tambah Soal
        </Link>
      </div>
      {categories.length === 0 && (
        <div className="card p-4 text-sm text-amber-700 bg-amber-50 border-amber-200 mb-4">
          Anda perlu menambah <Link href="/admin/categories" className="underline">kategori</Link> terlebih dahulu sebelum membuat soal.
        </div>
      )}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Soal</th>
              <th className="px-4 py-2 font-medium">Kategori</th>
              <th className="px-4 py-2 font-medium">Tipe</th>
              <th className="px-4 py-2 font-medium">Opsi</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {questions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-zinc-500">
                  Belum ada soal.
                </td>
              </tr>
            )}
            {questions.map((q) => (
              <tr key={q.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 max-w-xl">
                  <div className="line-clamp-2">{q.text}</div>
                </td>
                <td className="px-4 py-2">{q.category.name}</td>
                <td className="px-4 py-2">
                  {q.type === "MULTIPLE_CHOICE" ? "Pilihan Ganda" : "Likert"}
                </td>
                <td className="px-4 py-2">{q._count.options}</td>
                <td className="px-4 py-2 text-right space-x-2">
                  <Link
                    href={`/admin/questions/${q.id}/edit`}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                  <DeleteQuestionButton id={q.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
