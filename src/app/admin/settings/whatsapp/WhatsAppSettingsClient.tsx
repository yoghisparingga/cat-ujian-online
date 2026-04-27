"use client";

import { useState } from "react";

type Setting = {
  senderId: string;
  apiKey: string;
  urlEndpoint: string;
  isActive: boolean;
  loginOtpTemplate: string;
  registrationOtpTemplate: string;
  verifyPhoneOtpTemplate: string;
};

export function WhatsAppSettingsClient({ initialSetting }: { initialSetting: Setting }) {
  const [setting, setSetting] = useState(initialSetting);
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Test pesan WhatsApp dari CAT Ujian Online.");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof Setting>(key: K, value: Setting[K]) {
    setSetting((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/whatsapp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(setting),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal menyimpan");
      setStatus("Konfigurasi tersimpan");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  async function testSend() {
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/settings/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: testPhone, message: testMessage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.errorMessage || data?.error || "Gagal test kirim");
      setStatus(`Test kirim: ${data.status}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Gagal test kirim");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_320px] gap-6">
      <div className="card p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Sender ID">
            <input className="input" value={setting.senderId} onChange={(e) => update("senderId", e.target.value)} />
          </Field>
          <Field label="API Key">
            <input className="input" value={setting.apiKey} onChange={(e) => update("apiKey", e.target.value)} />
          </Field>
        </div>
        <Field label="URL Endpoint">
          <input className="input" value={setting.urlEndpoint} onChange={(e) => update("urlEndpoint", e.target.value)} placeholder="https://gateway.example.com/send" />
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={setting.isActive} onChange={(e) => update("isActive", e.target.checked)} />
          Gateway aktif
        </label>
        <Field label="Template OTP Login">
          <textarea className="input" rows={2} value={setting.loginOtpTemplate} onChange={(e) => update("loginOtpTemplate", e.target.value)} />
        </Field>
        <Field label="Template OTP Registrasi">
          <textarea className="input" rows={2} value={setting.registrationOtpTemplate} onChange={(e) => update("registrationOtpTemplate", e.target.value)} />
        </Field>
        <Field label="Template OTP Verifikasi Nomor">
          <textarea className="input" rows={2} value={setting.verifyPhoneOtpTemplate} onChange={(e) => update("verifyPhoneOtpTemplate", e.target.value)} />
        </Field>
        <button type="button" onClick={save} disabled={saving} className="btn-primary">
          {saving ? "Memproses..." : "Simpan Konfigurasi"}
        </button>
        {status && <div className="text-sm text-zinc-700">{status}</div>}
      </div>
      <div className="card p-5 space-y-4">
        <div>
          <div className="font-semibold">Test Kirim Pesan</div>
          <p className="text-xs text-zinc-500 mt-1">
            Jika gateway belum aktif/lengkap, sistem mencatat simulated sent agar flow OTP tetap bisa dites lokal.
          </p>
        </div>
        <Field label="Nomor Tujuan">
          <input className="input" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="08123456789" />
        </Field>
        <Field label="Pesan">
          <textarea className="input" rows={4} value={testMessage} onChange={(e) => setTestMessage(e.target.value)} />
        </Field>
        <button type="button" onClick={testSend} disabled={saving || !testPhone} className="btn-secondary">
          Test Kirim
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
