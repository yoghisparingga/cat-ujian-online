"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Category = { id: string; name: string };
type OptionDraft = {
  text: string;
  score: number;
  isCorrect: boolean;
  order: number;
};

type Existing = {
  id: string;
  categoryId: string;
  text: string;
  type: "MULTIPLE_CHOICE" | "LIKERT";
  explanation: string | null;
  options: OptionDraft[];
};

const DEFAULT_LIKERT: OptionDraft[] = [
  { text: "Sangat Setuju", score: 5, isCorrect: false, order: 0 },
  { text: "Setuju", score: 4, isCorrect: false, order: 1 },
  { text: "Cukup", score: 3, isCorrect: false, order: 2 },
  { text: "Kurang Setuju", score: 2, isCorrect: false, order: 3 },
  { text: "Tidak Setuju", score: 1, isCorrect: false, order: 4 },
];

const DEFAULT_MC: OptionDraft[] = [
  { text: "", score: 0, isCorrect: false, order: 0 },
  { text: "", score: 0, isCorrect: false, order: 1 },
  { text: "", score: 0, isCorrect: false, order: 2 },
  { text: "", score: 0, isCorrect: false, order: 3 },
];

export function QuestionForm({
  categories,
  existing,
}: {
  categories: Category[];
  existing?: Existing;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState(existing?.categoryId || categories[0]?.id || "");
  const [text, setText] = useState(existing?.text || "");
  const [type, setType] = useState<"MULTIPLE_CHOICE" | "LIKERT">(existing?.type || "MULTIPLE_CHOICE");
  const [explanation, setExplanation] = useState(existing?.explanation || "");
  const [options, setOptions] = useState<OptionDraft[]>(
    existing?.options ?? DEFAULT_MC
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function changeType(newType: "MULTIPLE_CHOICE" | "LIKERT") {
    setType(newType);
    if (!existing) {
      setOptions(newType === "LIKERT" ? DEFAULT_LIKERT : DEFAULT_MC);
    }
  }

  function updateOption(idx: number, patch: Partial<OptionDraft>) {
    setOptions((opts) =>
      opts.map((o, i) => (i === idx ? { ...o, ...patch } : o))
    );
  }
  function setCorrect(idx: number) {
    setOptions((opts) =>
      opts.map((o, i) => ({ ...o, isCorrect: i === idx }))
    );
  }
  function addOption() {
    setOptions((opts) => [
      ...opts,
      { text: "", score: 0, isCorrect: false, order: opts.length },
    ]);
  }
  function removeOption(idx: number) {
    setOptions((opts) => opts.filter((_, i) => i !== idx));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Pilih kategori");
      return;
    }
    if (type === "MULTIPLE_CHOICE") {
      const correct = options.filter((o) => o.isCorrect).length;
      if (correct !== 1) {
        setError("Pilihan ganda harus punya tepat 1 jawaban benar");
        return;
      }
    }
    if (type === "LIKERT") {
      for (const o of options) {
        if (o.score < 1 || o.score > 5) {
          setError("Skor likert harus 1-5");
          return;
        }
      }
    }
    setSaving(true);
    try {
      const payload = {
        categoryId,
        text,
        type,
        explanation: explanation || null,
        options: options.map((o, i) => ({
          text: o.text,
          score: type === "MULTIPLE_CHOICE" ? (o.isCorrect ? 5 : 0) : o.score,
          isCorrect: o.isCorrect,
          order: i,
        })),
      };
      const res = existing
        ? await fetch(`/api/admin/questions/${existing.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/admin/questions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gagal menyimpan");
      }
      router.push("/admin/questions");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="label">Kategori</span>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="input"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">Tipe Soal</span>
          <select
            value={type}
            onChange={(e) => changeType(e.target.value as typeof type)}
            className="input"
          >
            <option value="MULTIPLE_CHOICE">Pilihan Ganda (benar=5, salah=0)</option>
            <option value="LIKERT">Skala Likert (1-5)</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="label">Pertanyaan</span>
        <textarea
          required
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input"
        />
      </label>

      <div>
        <div className="label">Opsi Jawaban</div>
        <div className="space-y-2">
          {options.map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              {type === "MULTIPLE_CHOICE" ? (
                <label className="flex items-center gap-1.5 mt-2 shrink-0">
                  <input
                    type="radio"
                    name="correct"
                    checked={o.isCorrect}
                    onChange={() => setCorrect(i)}
                  />
                  <span className="text-xs text-zinc-600">Benar</span>
                </label>
              ) : (
                <label className="shrink-0">
                  <span className="text-xs text-zinc-600">Skor</span>
                  <select
                    value={o.score}
                    onChange={(e) => updateOption(i, { score: Number(e.target.value) })}
                    className="input w-20"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <input
                placeholder={`Opsi ${String.fromCharCode(65 + i)}`}
                value={o.text}
                onChange={(e) => updateOption(i, { text: e.target.value })}
                className="input"
              />
              <button
                type="button"
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="btn-secondary text-xs"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addOption} className="btn-secondary mt-2 text-xs">
          + Tambah Opsi
        </button>
      </div>

      <label className="block">
        <span className="label">Penjelasan (opsional)</span>
        <textarea
          rows={2}
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          className="input"
        />
      </label>

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
