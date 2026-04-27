import Link from "next/link";
import { getCurrentAdmin } from "@/lib/auth";
import { AdminLogoutButton } from "./AdminLogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) return <>{children}</>;

  return (
    <div className="flex-1 flex">
      <aside className="w-56 border-r border-zinc-200 bg-white p-4 space-y-1">
        <div className="px-2 py-2 mb-2">
          <div className="font-semibold">Admin Panel</div>
          <div className="text-xs text-zinc-500 truncate">{admin.email}</div>
        </div>
        <NavLink href="/admin">Dashboard</NavLink>
        <NavLink href="/admin/categories">Kategori</NavLink>
        <NavLink href="/admin/questions">Soal</NavLink>
        <NavLink href="/admin/questions/import">Import Soal</NavLink>
        <NavLink href="/admin/packages">Paket</NavLink>
        <NavLink href="/admin/pins">PIN Peserta</NavLink>
        <NavLink href="/admin/monitoring">Monitoring</NavLink>
        <NavLink href="/admin/results">Hasil Ujian</NavLink>
        <NavLink href="/admin/settings/whatsapp">WhatsApp</NavLink>
        <div className="pt-3">
          <AdminLogoutButton />
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-3 py-2 rounded-md text-sm text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
    >
      {children}
    </Link>
  );
}
