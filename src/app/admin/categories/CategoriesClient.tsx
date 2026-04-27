"use client";

import { useEffect, useState } from "react";

type Cat = {
  id: string;
  name: string;
  description: string | null;
  _count: { questions: number };
};

export function CategoriesClient() {
  const [items, setItems] = useState<Cat[] | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Cat | null>(null);

  async function load() {
    const res = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = await res.json();
    setItems(data.categories || []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: description || null }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error || "Gagal");
      return;
    }
    setName("");
    setDescription("");
    load();
  }

  async function update(c: Cat, name: string, description: string | null) {
    const res = await fetch(`/api/admin/categories/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Gagal mengubah");
      return;
    }
    setEditing(null);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Hapus kategori ini? Semua soal di dalamnya juga akan terhapus.")) return;
    await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="card p-4 space-y-3">
        <div className="font-semibold">Tambah Kategori</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Nama</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </label>
          <label className="block">
            <span className="label">Deskripsi (opsional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
          </label>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button className="btn-primary">Tambah</button>
        </div>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Nama</th>
              <th className="px-4 py-2 font-medium">Deskripsi</th>
              <th className="px-4 py-2 font-medium">Soal</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {!items && (
              <tr>
                <td className="px-4 py-3 text-zinc-500" colSpan={4}>
                  Memuat...
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-zinc-500" colSpan={4}>
                  Belum ada kategori.
                </td>
              </tr>
            )}
            {items?.map((c) =>
              editing?.id === c.id ? (
                <EditRow
                  key={c.id}
                  cat={c}
                  onCancel={() => setEditing(null)}
                  onSave={(name, description) => update(c, name, description)}
                />
              ) : (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 font-medium">{c.name}</td>
                  <td className="px-4 py-2 text-zinc-600">{c.description ?? "-"}</td>
                  <td className="px-4 py-2">{c._count.questions}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button onClick={() => setEditing(c)} className="text-blue-600 hover:underline">
                      Edit
                    </button>
                    <button onClick={() => remove(c.id)} className="text-red-600 hover:underline">
                      Hapus
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditRow({
  cat,
  onCancel,
  onSave,
}: {
  cat: Cat;
  onCancel: () => void;
  onSave: (name: string, description: string | null) => void;
}) {
  const [name, setName] = useState(cat.name);
  const [description, setDescription] = useState(cat.description ?? "");
  return (
    <tr className="border-t border-zinc-100 bg-zinc-50">
      <td className="px-4 py-2">
        <input value={name} onChange={(e) => setName(e.target.value)} className="input" />
      </td>
      <td className="px-4 py-2">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </td>
      <td className="px-4 py-2">{cat._count.questions}</td>
      <td className="px-4 py-2 text-right space-x-2">
        <button
          onClick={() => onSave(name, description || null)}
          className="text-emerald-700 hover:underline"
        >
          Simpan
        </button>
        <button onClick={onCancel} className="text-zinc-600 hover:underline">
          Batal
        </button>
      </td>
    </tr>
  );
}
