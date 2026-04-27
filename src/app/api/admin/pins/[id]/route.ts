import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const pin = await prisma.participantPin.findUnique({
    where: { id },
    include: { session: true },
  });
  if (!pin) return Response.json({ error: "Not found" }, { status: 404 });
  if (pin.session) {
    return Response.json({ error: "PIN sudah dipakai untuk ujian, tidak bisa dihapus" }, { status: 400 });
  }
  await prisma.participantPin.delete({ where: { id } });
  return Response.json({ ok: true });
}
