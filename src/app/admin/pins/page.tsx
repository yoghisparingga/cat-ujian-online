import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PinsClient } from "./PinsClient";

export const dynamic = "force-dynamic";

export default async function PinsPage() {
  await requireAdmin();
  const [participants, packages] = await Promise.all([
    prisma.participant.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.package.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);
  return (
    <main className="p-8 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Generate PIN Peserta</h1>
      <PinsClient
        participants={participants.map((p) => ({ id: p.id, name: p.name, email: p.email }))}
        packages={packages.map((p) => ({ id: p.id, name: p.name }))}
      />
    </main>
  );
}
