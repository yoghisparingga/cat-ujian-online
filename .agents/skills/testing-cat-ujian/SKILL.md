# Testing CAT Ujian Online

Full-stack Next.js + Prisma + PostgreSQL exam app. This skill documents how to test it end-to-end.

## Quick start

```bash
# Postgres must be running locally with the seeded demo data
npm run dev   # starts http://localhost:3000
```

If the dev server is already running, do NOT restart it — just hit `http://localhost:3000`.

## Demo credentials (from `prisma/seed.ts`)

- **Participant:** `peserta@example.com` / `081234567890`
- **Admin:** `admin@example.com` / `admin123`
- **PIN:** `1234` for the package "Try Out CPNS Demo" (3 TWK + 3 TIU + 3 TKP, 30 min)

These are local-only demo credentials, safe to commit.

## Reset state before recording a fresh test

The PIN is single-use (`ParticipantPin.used = true` after the first start) and an in-progress session blocks reuse. Before testing, run:

```bash
PGPASSWORD=cat_pass psql -U cat_user -h localhost -d cat_ujian -c \
  'DELETE FROM "Answer"; DELETE FROM "ExamSession"; UPDATE "ParticipantPin" SET used=false;'
```

If you also want to wipe and re-seed everything: `npm run db:reset && npm run db:seed` (slower, but more deterministic).

## Critical test: server-side timer persistence

The headline feature is that closing the browser does NOT reset the timer. The server computes `remainingSeconds = startedAt + durationMinutes*60 - now` on every GET to `/api/exam/[sessionId]`, so the cookie + session ID is enough to resume.

To verify (cleanly):
1. Start exam, note timer value `T0`.
2. **Fully restart the browser** with `browser(action="restart", url="http://localhost:3000/dashboard")`. Cookies persist (maxAge 30d).
3. The dashboard now shows **"Lanjutkan Ujian"** (not "Mulai Ujian") — this alone proves session was detected server-side.
4. `wait(seconds=30)` — simulates real elapsed time with the browser closed.
5. Click "Lanjutkan Ujian" → exam page loads with timer ≈ `T0 - (30s + restart_overhead)`. Definitely NOT `30:00`.

If the timer reads `30:00` after restart, the server-side timer is broken.

## Likert scoring gotcha

The seed creates the same 5 generic option labels ("Selalu menyelesaikan...", "Sering...", etc.) for every TKP question, but the **score-to-position mapping varies per question**. Picking option A ("Selalu...") for all 3 Likert questions does NOT yield 15/15 — it yields something like 11/15 (e.g. 5+5+1).

Don't assume "option A = max score" when designing scoring assertions. Either:
- Read the seed to figure out the correct option per question, or
- Just verify the total is consistent between participant result page and `/admin/results` (end-to-end consistency check works regardless of which options you picked).

## Multiple-choice answer key (from seed)

Reliable correct options for each question (option A is always the first in the visible order):
- "UUD 1945 disahkan oleh..." → **PPKI** (B)
- "Pancasila ditetapkan tanggal..." → **18 Agustus 1945**
- "Lambang sila ke-3..." → **Pohon Beringin** (A)
- "Bahasa resmi Indonesia adalah..." → **Bahasa Indonesia** (B)
- "5 + 3 × 2 = ..." → **11** (A)
- "Sinonim 'Cermat'" → **Teliti** (A)
- "Antonim 'Optimis'" → **Pesimis**
- "Deret 2, 4, 8, 16, ..." → **32** (C)
- "2x + 4 = 10, x = ?" → **3**

Each correct answer = +5; wrong = 0.

## Recording tips

- `wmctrl` is not installed in the default test VM — don't rely on it for window maximize. The default 1024×768 browser window is fine for this app, all UI fits.
- After clicking "Akhiri Ujian", a `confirm()` dialog auto-accepts. The browser navigates back to `/dashboard` (NOT directly to `/result`); follow the "Lihat hasil" link from there.
- The `Selanjutnya →` button sometimes pre-selects a value on the next question due to focus carry-over — this is cosmetic, the answer is only persisted when the option is clicked.

## Devin Secrets Needed

None. Postgres runs locally with hardcoded demo credentials (`cat_user`/`cat_pass`/`cat_ujian`); no third-party APIs.
