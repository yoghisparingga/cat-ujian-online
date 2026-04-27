import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
            CAT Ujian Online
          </h1>
          <p className="text-lg text-zinc-600">
            Computer Assisted Test &mdash; Multi-kategori, Likert, PIN, Timer Persist.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/register"
            className="block border border-zinc-200 bg-white rounded-xl p-6 hover:border-zinc-400 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Daftar Peserta</h2>
            <p className="text-sm text-zinc-600">
              Belum punya akun? Daftar dengan nama, email, no telpon.
            </p>
          </Link>
          <Link
            href="/login"
            className="block border border-zinc-200 bg-white rounded-xl p-6 hover:border-zinc-400 transition"
          >
            <h2 className="text-xl font-semibold mb-1">Login Peserta</h2>
            <p className="text-sm text-zinc-600">
              Masuk dengan email & no telpon untuk mulai ujian.
            </p>
          </Link>
        </div>

        <div className="pt-6 text-sm text-zinc-500">
          <Link href="/admin/login" className="underline hover:text-zinc-900">
            Login Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
