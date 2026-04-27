"use client";

import { useRouter } from "next/navigation";

export function DeletePackageButton({ id }: { id: string }) {
  const router = useRouter();
  async function onDelete() {
    if (!confirm("Hapus paket ini? Semua PIN dan sesi yang terkait akan terhapus.")) return;
    const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Gagal menghapus");
      return;
    }
    router.refresh();
  }
  return (
    <button onClick={onDelete} className="text-red-600 hover:underline">
      Hapus
    </button>
  );
}
