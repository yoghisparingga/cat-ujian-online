import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional().nullable(),
});

export async function GET() {
  await requireAdmin();
  const categories = await prisma.category.findMany({
    include: { _count: { select: { questions: true } } },
    orderBy: { name: "asc" },
  });
  return Response.json({ categories });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const category = await prisma.category.create({ data: parsed.data });
  return Response.json({ category });
}
