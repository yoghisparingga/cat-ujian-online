"use client";

import { useEffect, useState } from "react";

type Participant = { id: string; name: string; email: string };
type Pkg = { id: string; name: string };
type PinRow = {
  id: string;
  pin: string;
  used: boolean;
  createdAt: string;
  participant: { id: string; name: string; email: string };
  package: { id: string; name: string };
  session: { id: string; status: string; totalScore: number } | null;
};

export function PinsClient({
  participants,
  packages,
}: {
  participants: Participant[];
  packages: Pkg[];
}) {
  const [pins, setPins] = useState<PinRow[]>([]);
  const [participantId, setParticipantId] = useState(participants[0]?.id || "");
  const [packageId, setPackageId] = useState(packages[0]?.id || "");
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/pins", { cache: "no-store" });
    const data = await res.json();
    setPins(data.pins || []);
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/admin/pins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId, packageId }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Gagal generate");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal");
    } finally {
      setGenerating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Hapus PIN ini?")) return;
    const res = await fetch(`/api/admin/pins/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j?.error || "Gagal menghapus");
      return;
    }
    load();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={generate} className="card p-4 space-y-3">
        <div className="font-semibold">Generate PIN Baru</div>
        {(participants.length === 0 || packages.length === 0) && (
          <div className="text-sm text-amber-700">
            Pastikan sudah ada peserta yang terdaftar dan paket aktif.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="label">Peserta</span>
            <select
              value={participantId}
              onChange={(e) => setParticipantId(e.target.value)}
              className="input"
            >
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="label">Paket</span>
            <select
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className="input"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button
          disabled={generating || participants.length === 0 || packages.length === 0}
          className="btn-primary"
        >
          {generating ? "Generate..." : "Generate PIN"}
        </button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">PIN</th>
              <th className="px-4 py-2 font-medium">Peserta</th>
              <th className="px-4 py-2 font-medium">Paket</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pins.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-3 text-zinc-500">
                  Belum ada PIN.
                </td>
              </tr>
            )}
            {pins.map((p) => (
              <tr key={p.id} className="border-t border-zinc-100">
                <td className="px-4 py-2 font-mono font-bold">{p.pin}</td>
                <td className="px-4 py-2">
                  <div className="font-medium">{p.participant.name}</div>
                  <div className="text-xs text-zinc-500">{p.participant.email}</div>
                </td>
                <td className="px-4 py-2">{p.package.name}</td>
                <td className="px-4 py-2">
                  {p.session ? (
                    <span className="text-xs">
                      {p.session.status === "IN_PROGRESS"
                        ? "Sedang Ujian"
                        : p.session.status === "SUBMITTED"
                        ? `Selesai (${p.session.totalScore})`
                        : `Habis Waktu (${p.session.totalScore})`}
                    </span>
                  ) : p.used ? (
                    <span className="text-xs text-amber-700">Dipakai</span>
                  ) : (
                    <span className="text-xs text-emerald-700">Aktif</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {!p.session && (
                    <button onClick={() => remove(p.id)} className="text-red-600 hover:underline">
                      Hapus
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
