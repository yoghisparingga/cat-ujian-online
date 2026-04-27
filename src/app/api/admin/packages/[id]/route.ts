import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const composSchema = z.object({
  categoryId: z.string().min(1),
  questionCount: z.number().int().min(1).max(500),
});

const updateSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(1000).optional().nullable(),
  durationMinutes: z.number().int().min(1).max(600),
  isActive: z.boolean().optional().default(true),
  categories: z.array(composSchema).min(1).max(20),
});

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const data = parsed.data;
  const pkg = await prisma.$transaction(async (tx) => {
    await tx.packageCategory.deleteMany({ where: { packageId: id } });
    return tx.package.update({
      where: { id },
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
  });
  return Response.json({ package: pkg });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.package.delete({ where: { id } });
  return Response.json({ ok: true });
}
