import { requireAdmin } from "@/lib/auth";
import { QuestionImportClient } from "./QuestionImportClient";

export const dynamic = "force-dynamic";

export default async function QuestionImportPage() {
  await requireAdmin();
  return (
    <main className="p-8 max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Import Soal</h1>
          <p className="text-sm text-zinc-600 mt-1">
            XLS/XLSX diprioritaskan. DOCX/PDF tersedia sebagai parser basic dengan preview dan validasi sebelum simpan.
          </p>
        </div>
        <form action="/api/admin/questions/import/template" method="GET">
          <button type="submit" className="btn-secondary">
          Download Template XLSX
          </button>
        </form>
      </div>
      <QuestionImportClient />
      <div className="card p-5 text-sm text-zinc-600 space-y-2">
        <div className="font-semibold text-zinc-900">Catatan parser DOCX/PDF</div>
        <p>
          Parser DOCX/PDF membaca teks mentah dan mencoba mengenali blok soal. Format tabel/kolom,
          gambar tertanam, dan layout PDF kompleks masih perlu koreksi manual di preview sebelum disimpan.
        </p>
      </div>
    </main>
  );
}
