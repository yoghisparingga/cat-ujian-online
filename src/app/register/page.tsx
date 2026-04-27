"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal mendaftar");
      setOtpSent(true);
      setPhone(data.phone || phone);
      setDebugCode(data.debugCode || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otp, purpose: "REGISTER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "OTP tidak valid");
      router.push(data.redirectTo || "/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl p-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Daftar Peserta</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Cukup nama, no telpon, dan email opsional.
          </p>
        </div>
        {!otpSent ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nama Lengkap">
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              autoComplete="email"
            />
          </Field>
          <Field label="No Telpon">
            <input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input"
              autoComplete="tel"
              placeholder="08xxxxxxxxxx"
            />
          </Field>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zinc-900 text-white rounded-lg py-2.5 font-medium hover:bg-zinc-800 disabled:bg-zinc-300"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>
        </form>
        ) : (
          <form onSubmit={onVerify} className="space-y-4">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              OTP dikirim ke WhatsApp {phone}. Jika gateway belum aktif, kode dev tampil di bawah.
            </div>
            {debugCode && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm">
                Kode OTP dev: <span className="font-semibold tracking-widest">{debugCode}</span>
              </div>
            )}
            <Field label="Kode OTP 6 digit">
              <input
                required
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="input"
                placeholder="123456"
              />
            </Field>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white rounded-lg py-2.5 font-medium hover:bg-zinc-800 disabled:bg-zinc-300"
            >
              {loading ? "Memverifikasi..." : "Verifikasi & Masuk"}
            </button>
          </form>
        )}
        <div className="text-sm text-zinc-600 text-center">
          Sudah punya akun?{" "}
          <Link href="/login" className="underline hover:text-zinc-900">
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-zinc-800 mb-1">{label}</span>
      {children}
    </label>
  );
}
