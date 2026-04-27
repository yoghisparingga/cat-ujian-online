import { requireAdmin } from "@/lib/auth";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireAdmin();
  return (
    <main className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">Kategori Soal</h1>
      <CategoriesClient />
    </main>
  );
}
