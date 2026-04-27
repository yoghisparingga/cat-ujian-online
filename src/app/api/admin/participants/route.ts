import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const participants = await prisma.participant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { pins: true, sessions: true } } },
  });
  return Response.json({ participants });
}
