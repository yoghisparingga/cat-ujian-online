# CAT Ujian Online

Aplikasi Computer Assisted Test (CAT) Ujian Online &mdash; mirip CAT BKN, dengan fitur:

- Multi-kategori soal per paket (admin set komposisi: misal 30 TWK + 35 TIU + 35 TKP)
- Dua tipe scoring per soal:
  - **Pilihan ganda** (benar = 5, salah = 0)
  - **Skala Likert** (1&ndash;5 sesuai jawaban)
- **PIN 4 digit per peserta** &mdash; admin generate PIN unik untuk tiap peserta + paket
- **Login peserta** cukup dengan email + no telpon (tanpa password)
- Admin terpisah dengan email + password
- **Timer persist server-side**: tutup browser, sisa waktu dihitung berdasarkan `startedAt + duration`, tidak bisa dicurangi
- Soal random per kategori, jawaban disimpan incremental, auto-submit saat waktu habis
- Halaman hasil dengan rincian skor per kategori
- Admin panel lengkap: CRUD kategori, soal (MC/Likert), paket, generate PIN, lihat hasil

## Tech Stack

- **Next.js 16** (App Router)
- **React 19**
- **Prisma 6** + **PostgreSQL**
- **Tailwind CSS 4**
- **Zod** untuk validasi input
- **bcryptjs** untuk password admin

## Quick Start

### 1. Database

Pastikan PostgreSQL berjalan. Default `.env`:

```
DATABASE_URL="postgresql://cat_user:cat_pass@localhost:5432/cat_ujian?schema=public"
SESSION_SECRET="ganti-dengan-string-acak-min-32-karakter"
```

Buat user dan database (sesuaikan kredensial):

```bash
sudo -u postgres psql -c "CREATE USER cat_user WITH PASSWORD 'cat_pass' SUPERUSER;"
sudo -u postgres psql -c "CREATE DATABASE cat_ujian OWNER cat_user;"
```

### 2. Install & Migrate

```bash
npm install
npx prisma migrate dev
npm run db:seed   # buat admin, kategori, soal demo, paket demo, peserta demo + PIN
```

### 3. Run dev server

```bash
npm run dev
```

Buka <http://localhost:3000>.

### Credential demo

- **Admin:** `admin@example.com` / `admin123` &rarr; <http://localhost:3000/admin/login>
- **Peserta demo:** email `peserta@example.com`, no telpon `081234567890`
- **PIN demo:** `1234` (paket "Try Out CPNS Demo")

## Alur Penggunaan

### Admin

1. Login admin di `/admin/login`.
2. Buat kategori soal (`/admin/categories`).
3. Buat soal di tiap kategori (`/admin/questions/new`):
   - Pilih tipe **Pilihan Ganda** (tandai 1 jawaban benar &rarr; otomatis skor 5)
   - Atau **Likert** (tiap opsi punya skor 1&ndash;5)
4. Buat paket try out (`/admin/packages/new`):
   - Set durasi (menit), pilih kategori dan jumlah soal per kategori
5. Generate PIN per peserta (`/admin/pins`):
   - Pilih peserta + paket &rarr; PIN 4 digit unik tergenerate
   - Bagikan PIN kepada peserta
6. Lihat hasil di `/admin/results` (dengan skor per kategori)

### Peserta

1. Daftar di `/register` (nama, email, no telpon).
2. Login di `/login` (email + no telpon).
3. Di dashboard, pilih paket yang ada PIN-nya, klik **Mulai Ujian**.
4. Masukkan PIN 4 digit untuk konfirmasi.
5. Kerjakan soal &mdash; jawaban tersimpan otomatis tiap pilih opsi.
6. Jika browser ditutup, sisa waktu tetap berjalan; lanjutkan dari dashboard.
7. Klik **Akhiri Ujian** atau tunggu timer habis &rarr; lihat halaman hasil.

## Struktur Database (Prisma Schema)

Lihat <prisma/schema.prisma>. Model utama:

- `Participant`, `AdminUser`
- `Category`, `Question`, `Option` (dengan `score` dan `isCorrect`)
- `Package` &harr; `PackageCategory` (komposisi N soal per kategori)
- `ParticipantPin` (PIN unik per peserta + paket)
- `ExamSession` (status, `startedAt`, `durationMinutes`, `questionOrder` JSON, `totalScore`)
- `Answer` (jawaban per soal dalam sesi, dengan `score`)

## Timer Persist

Sisa waktu tidak disimpan di client. Selalu dihitung server-side:

```
remaining = (startedAt + durationMinutes * 60_000) - Date.now()
```

Jika peserta tutup browser dan reload, server merespons dengan sisa waktu yang akurat. Saat sisa waktu &le; 0 server otomatis menge-finalize sesi sebagai `EXPIRED`.

## Deployment ke Vercel

1. Push repo ke GitHub.
2. Di [vercel.com/new](https://vercel.com/new) import repo ini.
3. Tambahkan **Vercel Postgres** dari Storage tab. `DATABASE_URL` akan otomatis diset.
4. Set env var `SESSION_SECRET` (string acak min 32 karakter, gunakan `openssl rand -base64 32`).
5. Vercel akan menjalankan `prisma generate` saat build (sudah dikonfigurasi via `postinstall` jika diperlukan).
6. Setelah deploy pertama, jalankan migrate via `vercel env pull` lokal lalu `npx prisma migrate deploy`, atau pakai integrasi Prisma untuk Vercel.

## Skrip NPM

| Skrip | Deskripsi |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Build produksi |
| `npm run start` | Start produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:seed` | Jalankan seed data |
| `npm run db:reset` | Reset DB + seed |
