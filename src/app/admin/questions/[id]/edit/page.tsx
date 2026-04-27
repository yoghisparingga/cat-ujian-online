import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QuestionForm } from "../../QuestionForm";

export const dynamic = "force-dynamic";

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [question, categories] = await Promise.all([
    prisma.question.findUnique({
      where: { id },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
  ]);
  if (!question) notFound();
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Edit Soal</h1>
      <QuestionForm
        categories={categories}
        existing={{
          id: question.id,
          categoryId: question.categoryId,
          text: question.text,
          type: question.type,
          explanation: question.explanation,
          options: question.options.map((o) => ({
            text: o.text,
            score: o.score,
            isCorrect: o.isCorrect,
            order: o.order,
          })),
        }}
      />
    </main>
  );
}
