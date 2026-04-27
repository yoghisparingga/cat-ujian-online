"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Option = { id: string; text: string; imageUrl?: string | null; order: number };
type Question = {
  id: string;
  text: string;
  imageUrl?: string | null;
  type: "MULTIPLE_CHOICE" | "LIKERT";
  category: { id: string; name: string };
  options: Option[];
  selectedOptionId: string | null;
};
type SessionData = {
  session: {
    id: string;
    status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED";
    durationMinutes: number;
    remainingSeconds: number;
    packageName: string;
    totalScore: number;
  };
  questions: Question[];
};

export function ExamRunner({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/exam/${sessionId}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat sesi");
      setData(json);
      setRemaining(json.session.remainingSeconds);
      if (json.session.status !== "IN_PROGRESS" && !submittedRef.current) {
        submittedRef.current = true;
        router.replace(`/exam/${sessionId}/result`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    }
  }, [sessionId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  // Local countdown
  useEffect(() => {
    if (!data || data.session.status !== "IN_PROGRESS") return;
    const id = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [data]);

  // Periodic resync from server (every 30s) to keep remaining accurate
  useEffect(() => {
    if (!data || data.session.status !== "IN_PROGRESS") return;
    const id = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(id);
  }, [data, load]);

  useEffect(() => {
    if (!data || data.session.status !== "IN_PROGRESS") return;
    function logActivity(eventType: string) {
      navigator.sendBeacon?.(
        `/api/exam/${sessionId}/activity`,
        new Blob([JSON.stringify({ eventType })], { type: "application/json" })
      );
    }
    const onBlur = () => logActivity("TAB_BLUR");
    const onFocus = () => logActivity("TAB_FOCUS");
    const onBeforeUnload = () => logActivity("WINDOW_CLOSE");
    const onVisibility = () =>
      logActivity(document.hidden ? "VISIBILITY_HIDDEN" : "VISIBILITY_VISIBLE");
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    const heartbeat = setInterval(() => {
      fetch(`/api/exam/${sessionId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventType: "HEARTBEAT" }),
        keepalive: true,
      }).catch(() => undefined);
    }, 30000);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
      clearInterval(heartbeat);
    };
  }, [data, sessionId]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (!data || data.session.status !== "IN_PROGRESS") return;
    if (remaining > 0) return;
    if (submittedRef.current) return;
    submittedRef.current = true;
    (async () => {
      await fetch(`/api/exam/${sessionId}/submit`, { method: "POST" });
      router.replace(`/exam/${sessionId}/result`);
    })();
  }, [remaining, data, sessionId, router]);

  const current = data?.questions[currentIdx];

  async function selectOption(optionId: string) {
    if (!data || !current) return;
    // Optimistic update
    setData({
      ...data,
      questions: data.questions.map((q, i) =>
        i === currentIdx ? { ...q, selectedOptionId: optionId } : q
      ),
    });
    try {
      const res = await fetch(`/api/exam/${sessionId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: current.id, optionId }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "Gagal menyimpan jawaban");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
      load();
    }
  }

  async function submitExam() {
    if (!confirm("Yakin ingin mengakhiri ujian dan submit jawaban?")) return;
    setSubmitting(true);
    try {
      await fetch(`/api/exam/${sessionId}/submit`, { method: "POST" });
      submittedRef.current = true;
      router.replace(`/exam/${sessionId}/result`);
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = useMemo(
    () => data?.questions.filter((q) => q.selectedOptionId).length ?? 0,
    [data]
  );

  if (error) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-red-600">{error}</div>
      </main>
    );
  }
  if (!data) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="text-zinc-500">Memuat ujian...</div>
      </main>
    );
  }
  if (!current) return null;

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-zinc-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-semibold">{data.session.packageName}</div>
            <div className="text-xs text-zinc-500">
              Soal {currentIdx + 1} dari {data.questions.length} &middot; Terjawab{" "}
              {answeredCount}/{data.questions.length}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Timer seconds={remaining} />
            <button
              onClick={submitExam}
              disabled={submitting}
              className="btn-danger text-sm"
            >
              {submitting ? "Submit..." : "Akhiri Ujian"}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-6 grid lg:grid-cols-[1fr_260px] gap-6">
          <div className="space-y-6">
            <div className="card p-6">
              <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
                {current.category.name} &middot;{" "}
                {current.type === "LIKERT" ? "Skala Likert (1-5)" : "Pilihan Ganda"}
              </div>
              <div className="text-base sm:text-lg font-medium whitespace-pre-wrap">
                {current.text}
              </div>
              {current.imageUrl && (
                <img src={current.imageUrl} alt="" className="mt-4 max-h-80 rounded-lg border border-zinc-200 object-contain" />
              )}
            </div>

            <div className="space-y-2">
              {current.options.map((o, i) => {
                const selected = current.selectedOptionId === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => selectOption(o.id)}
                    className={`w-full text-left card p-4 transition flex gap-3 items-start ${
                      selected
                        ? "border-zinc-900 ring-2 ring-zinc-900"
                        : "hover:border-zinc-400"
                    }`}
                  >
                    <span
                      className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center text-xs font-semibold ${
                        selected
                          ? "bg-zinc-900 text-white border-zinc-900"
                          : "border-zinc-300 text-zinc-700"
                      }`}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-sm">
                      {o.text}
                      {o.imageUrl && (
                        <img src={o.imageUrl} alt="" className="mt-2 max-h-40 rounded border border-zinc-200 object-contain" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-between pt-2">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="btn-secondary"
              >
                &larr; Sebelumnya
              </button>
              <button
                onClick={() =>
                  setCurrentIdx((i) => Math.min(data.questions.length - 1, i + 1))
                }
                disabled={currentIdx === data.questions.length - 1}
                className="btn-primary"
              >
                Selanjutnya &rarr;
              </button>
            </div>
          </div>

          <aside className="card p-4 h-fit lg:sticky lg:top-20">
            <div className="text-sm font-semibold mb-3">Navigasi Soal</div>
            <div className="grid grid-cols-6 lg:grid-cols-5 gap-1.5">
              {data.questions.map((q, i) => {
                const answered = Boolean(q.selectedOptionId);
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-8 text-xs rounded font-medium transition ${
                      isCurrent
                        ? "bg-zinc-900 text-white"
                        : answered
                        ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                        : "bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 text-xs text-zinc-500 space-y-1">
              <div>
                <span className="inline-block w-3 h-3 align-middle bg-emerald-100 border border-emerald-300 rounded mr-1" />
                Terjawab
              </div>
              <div>
                <span className="inline-block w-3 h-3 align-middle bg-white border border-zinc-300 rounded mr-1" />
                Belum
              </div>
              <div>
                <span className="inline-block w-3 h-3 align-middle bg-zinc-900 rounded mr-1" />
                Saat ini
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Timer({ seconds }: { seconds: number }) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const danger = seconds <= 60;
  return (
    <div
      className={`px-3 py-1.5 rounded-lg font-mono text-sm font-semibold ${
        danger ? "bg-red-100 text-red-700 border border-red-300" : "bg-zinc-100 text-zinc-900"
      }`}
    >
      {h > 0 && `${String(h).padStart(2, "0")}:`}
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
}
