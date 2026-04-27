"use client";

import { useState } from "react";

type ImportOptionDraft = {
  key?: string;
  text: string;
  imageUrl?: string;
  score: number;
  isCorrect: boolean;
};

type ImportQuestionDraft = {
  rowNumber: number;
  examCode?: string;
  categoryName: string;
  questionText: string;
  questionImageUrl?: string;
  questionType: "MULTIPLE_CHOICE" | "LIKERT";
  options: ImportOptionDraft[];
  explanation?: string;
  errors: string[];
};

export function QuestionImportClient() {
  const [rows, setRows] = useState<ImportQuestionDraft[]>([]);
  const [importSessionId, setImportSessionId] = useState<string | null>(null);
  const [parserNote, setParserNote] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function upload(file: File) {
    setLoading(true);
    setStatus(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/admin/questions/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal parse file");
      setRows(data.rows);
      setImportSessionId(data.importSessionId || null);
      setParserNote(data.parserNote || null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal parse file");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(index: number, patch: Partial<ImportQuestionDraft>) {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch, errors: [] } : row)));
  }

  function updateOption(rowIndex: number, optionIndex: number, patch: Partial<ImportOptionDraft>) {
    setRows((current) =>
      current.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              errors: [],
              options: row.options.map((option, oi) =>
                oi === optionIndex ? { ...option, ...patch } : option
              ),
            }
          : row
      )
    );
  }

  async function commit() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/questions/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importSessionId,
          rows: rows.map((row) => ({ ...row, errors: [] })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan import");
      setStatus(`${data.created} soal berhasil disimpan`);
      setRows([]);
      setImportSessionId(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyimpan import");
    } finally {
      setLoading(false);
    }
  }

  const hasErrors = rows.some((row) => row.errors.length > 0);

  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-3">
        <label className="block">
          <span className="label">Upload DOC/DOCX/XLS/XLSX/PDF</span>
          <input
            type="file"
            accept=".doc,.docx,.xls,.xlsx,.pdf"
            className="input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload(file);
            }}
          />
        </label>
        {parserNote && <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{parserNote}</div>}
        {status && <div className="text-sm text-zinc-700">{status}</div>}
      </div>

      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold">Preview {rows.length} baris</div>
            <button type="button" onClick={commit} disabled={loading || hasErrors} className="btn-primary">
              Simpan ke Bank Soal
            </button>
          </div>
          {hasErrors && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              Ada error validasi. Perbaiki data di file lalu upload ulang, atau koreksi field preview yang tersedia.
            </div>
          )}
          <div className="space-y-3">
            {rows.map((row, rowIndex) => (
              <div key={`${row.rowNumber}-${rowIndex}`} className="card p-4 space-y-3">
                <div className="flex justify-between gap-3">
                  <div className="font-medium">Baris {row.rowNumber}</div>
                  <div className="text-xs text-zinc-500">{row.questionType}</div>
                </div>
                {row.errors.length > 0 && (
                  <ul className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 list-disc list-inside">
                    {row.errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  <label>
                    <span className="label">Kategori</span>
                    <input className="input" value={row.categoryName} onChange={(e) => updateRow(rowIndex, { categoryName: e.target.value })} />
                  </label>
                  <label>
                    <span className="label">Tipe</span>
                    <select className="input" value={row.questionType} onChange={(e) => updateRow(rowIndex, { questionType: e.target.value as ImportQuestionDraft["questionType"] })}>
                      <option value="MULTIPLE_CHOICE">SINGLE_CHOICE</option>
                      <option value="LIKERT">LIKERT</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span className="label">Soal</span>
                  <textarea className="input" rows={2} value={row.questionText} onChange={(e) => updateRow(rowIndex, { questionText: e.target.value })} />
                </label>
                <div className="grid gap-2">
                  {row.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="grid sm:grid-cols-[1fr_90px_90px] gap-2 items-center">
                      <input className="input" value={option.text} onChange={(e) => updateOption(rowIndex, optionIndex, { text: e.target.value })} />
                      <input className="input" type="number" min={0} max={5} value={option.score} onChange={(e) => updateOption(rowIndex, optionIndex, { score: Number(e.target.value) })} />
                      <label className="text-sm flex items-center gap-2">
                        <input type="checkbox" checked={option.isCorrect} onChange={(e) => updateOption(rowIndex, optionIndex, { isCorrect: e.target.checked })} />
                        Benar
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
