"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: string; name: string; questionCount: number };
type Composition = { categoryId: string; questionCount: number };
type Existing = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  isActive: boolean;
  composition: Composition[];
};

export function PackageForm({
  categories,
  existing,
}: {
  categories: Category[];
  existing?: Existing;
}) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name || "");
  const [description, setDescription] = useState(existing?.description || "");
  const [durationMinutes, setDurationMinutes] = useState(existing?.durationMinutes ?? 60);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [composition, setComposition] = useState<Composition[]>(
    existing?.composition ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function addCategory(categoryId: string) {
    if (!categoryId) return;
    if (composition.find((c) => c.categoryId === categoryId)) return;
    setComposition([...composition, { categoryId, questionCount: 1 }]);
  }
  function updateCount(categoryId: string, count: number) {
    setComposition((cs) =>
      cs.map((c) => (c.categoryId === categoryId ? { ...c, questionCount: count } : c))
    );
  }
  function remove(categoryId: string) {
    setComposition((cs) => cs.filter((c) => c.categoryId !== categoryId));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (composition.length === 0) {
      setError("Tambahkan minimal 1 kategori");
      return;
    }
    for (const c of composition) {
      const cat = categories.find((cc) => cc.id === c.categoryId);
      if (cat && c.questionCount > cat.questionCount) {
        setError(`Kategori "${cat.name}" hanya punya ${cat.questionCount} soal`);
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        name,
        description: description || null,
        durationMinutes,
        isActive,
        categories: composition,
      };
      const res = existing
        ? await fetch(`/api/admin/packages/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/packages`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gagal menyimpan");
      }
      router.push("/admin/packages");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  const totalSoal = composition.reduce((s, c) => s + c.questionCount, 0);
  const availableCategories = categories.filter(
    (c) => !composition.find((co) => co.categoryId === c.id)
  );

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Nama Paket</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label">Durasi (menit)</span>
          <input
            required
            type="number"
            min={1}
            max={600}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
            className="input"
          />
        </label>
      </div>
      <label className="block">
        <span className="label">Deskripsi (opsional)</span>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        <span className="text-sm">Paket aktif (peserta bisa mulai ujian)</span>
      </label>

      <div>
        <div className="label">Komposisi Soal per Kategori</div>
        <div className="space-y-2">
          {composition.length === 0 && (
            <div className="text-sm text-zinc-500">Belum ada kategori dipilih.</div>
          )}
          {composition.map((c) => {
            const cat = categories.find((cc) => cc.id === c.categoryId);
            return (
              <div key={c.categoryId} className="flex items-center gap-2">
                <div className="flex-1 text-sm">
                  <span className="font-medium">{cat?.name || "?"}</span>{" "}
                  <span className="text-zinc-500 text-xs">
                    (tersedia {cat?.questionCount ?? 0} soal)
                  </span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={cat?.questionCount || 1}
                  value={c.questionCount}
                  onChange={(e) => updateCount(c.categoryId, Number(e.target.value))}
                  className="input w-24"
                />
                <button
                  type="button"
                  onClick={() => remove(c.categoryId)}
                  className="btn-secondary text-xs"
                >
                  Hapus
                </button>
              </div>
            );
          })}
        </div>
        {availableCategories.length > 0 && (
          <select
            onChange={(e) => {
              addCategory(e.target.value);
              e.target.value = "";
            }}
            className="input mt-2"
            defaultValue=""
          >
            <option value="">+ Tambah kategori...</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.questionCount} soal tersedia)
              </option>
            ))}
          </select>
        )}
        <div className="text-sm text-zinc-600 mt-2">Total soal: {totalSoal}</div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Menyimpan..." : existing ? "Update" : "Simpan"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-secondary">
          Batal
        </button>
      </div>
    </form>
  );
}
