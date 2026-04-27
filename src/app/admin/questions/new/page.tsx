import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuestionForm } from "../QuestionForm";

export const dynamic = "force-dynamic";

export default async function NewQuestionPage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Tambah Soal</h1>
      <QuestionForm categories={categories} />
    </main>
  );
}
