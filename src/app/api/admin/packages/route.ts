import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const composSchema = z.object({
  categoryId: z.string().min(1),
  questionCount: z.number().int().min(1).max(500),
});

const createSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(600),
  isActive: z.boolean().optional().default(true),
  categories: z.array(composSchema).min(1).max(20),
});

export async function GET() {
  await requireAdmin();
  const packages = await prisma.package.findMany({
    include: {
      packageCategories: { include: { category: true } },
      _count: { select: { pins: true, sessions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ packages });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const pkg = await prisma.package.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      durationMinutes: data.durationMinutes,
      isActive: data.isActive ?? true,
      packageCategories: {
        create: data.categories.map((c) => ({
          categoryId: c.categoryId,
          questionCount: c.questionCount,
        })),
      },
    },
    include: { packageCategories: { include: { category: true } } },
  });
  return Response.json({ package: pkg });
}
