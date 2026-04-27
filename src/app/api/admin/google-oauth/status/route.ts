import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  return Response.json({
    enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    status: "basic_placeholder",
    note: "Google OAuth belum diaktifkan di UI. Struktur env GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET sudah disiapkan untuk integrasi provider auth berikutnya.",
  });
}
