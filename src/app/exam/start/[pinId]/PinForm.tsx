"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PinForm({ packageId }: { packageId: string }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN harus 4 digit angka");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/exam/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packageId, pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal memulai ujian");
      router.push(`/exam/${data.sessionId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="label">Masukkan PIN 4 digit</span>
        <input
          autoFocus
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className="input text-center text-2xl tracking-[0.5em] font-bold"
          placeholder="••••"
        />
      </label>
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          {error}
        </div>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full py-3">
        {loading ? "Memulai..." : "Mulai Ujian"}
      </button>
    </form>
  );
}
