"use client";

import { useRouter } from "next/navigation";

export function DeleteQuestionButton({ id }: { id: string }) {
  const router = useRouter();
  async function onDelete() {
    if (!confirm("Hapus soal ini?")) return;
    await fetch(`/api/admin/questions/${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <button onClick={onDelete} className="text-red-600 hover:underline">
      Hapus
    </button>
  );
}
