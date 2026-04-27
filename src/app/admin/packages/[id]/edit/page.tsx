import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PackageForm } from "../../PackageForm";

export const dynamic = "force-dynamic";

export default async function EditPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const [pkg, categories] = await Promise.all([
    prisma.package.findUnique({
      where: { id },
      include: { packageCategories: true },
    }),
    prisma.category.findMany({
      include: { _count: { select: { questions: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!pkg) notFound();
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Edit Paket Try Out</h1>
      <PackageForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          questionCount: c._count.questions,
        }))}
        existing={{
          id: pkg.id,
          code: pkg.code,
          name: pkg.name,
          description: pkg.description,
          durationMinutes: pkg.durationMinutes,
          isActive: pkg.isActive,
          composition: pkg.packageCategories.map((pc) => ({
            categoryId: pc.categoryId,
            questionCount: pc.questionCount,
          })),
        }}
      />
    </main>
  );
}
