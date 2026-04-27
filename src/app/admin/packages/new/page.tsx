import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PackageForm } from "../PackageForm";

export const dynamic = "force-dynamic";

export default async function NewPackagePage() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
  return (
    <main className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Tambah Paket Try Out</h1>
      <PackageForm
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          questionCount: c._count.questions,
        }))}
      />
    </main>
  );
}
