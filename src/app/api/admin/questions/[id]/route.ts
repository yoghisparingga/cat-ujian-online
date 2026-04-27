import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  score: z.number().int().min(0).max(5),
  isCorrect: z.boolean().optional().default(false),
  order: z.number().int().min(0).max(50).optional().default(0),
});

const updateSchema = z.object({
  categoryId: z.string().min(1),
  text: z.string().min(1).max(2000),
  type: z.enum(["MULTIPLE_CHOICE", "LIKERT"]),
  explanation: z.string().max(2000).optional().nullable(),
  options: z.array(optionSchema).min(2).max(10),
});

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const question = await prisma.question.findUnique({
    where: { id },
    include: { options: { orderBy: { order: "asc" } }, category: true },
  });
  if (!question) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ question });
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  if (data.type === "MULTIPLE_CHOICE") {
    const correctCount = data.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      return Response.json({ error: "Multiple choice harus punya tepat 1 jawaban benar" }, { status: 400 });
    }
  }

  // Replace options atomically
  const question = await prisma.$transaction(async (tx) => {
    await tx.option.deleteMany({ where: { questionId: id } });
    return tx.question.update({
      where: { id },
      data: {
        categoryId: data.categoryId,
        text: data.text,
        type: data.type,
        explanation: data.explanation ?? null,
        options: {
          create: data.options.map((o, i) => ({
            text: o.text,
            score: data.type === "MULTIPLE_CHOICE" ? (o.isCorrect ? 5 : 0) : o.score,
            isCorrect: o.isCorrect ?? false,
            order: o.order ?? i,
          })),
        },
      },
      include: { options: true },
    });
  });
  return Response.json({ question });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await ctx.params;
  await prisma.question.delete({ where: { id } });
  return Response.json({ ok: true });
}
