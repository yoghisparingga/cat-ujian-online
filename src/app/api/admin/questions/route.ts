import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const optionSchema = z.object({
  text: z.string().min(1).max(500),
  imageUrl: z.string().max(1000).optional().nullable(),
  score: z.number().int().min(0).max(5),
  isCorrect: z.boolean().optional().default(false),
  order: z.number().int().min(0).max(50).optional().default(0),
});

const createSchema = z.object({
  categoryId: z.string().min(1),
  text: z.string().min(1).max(2000),
  imageUrl: z.string().max(1000).optional().nullable(),
  type: z.enum(["MULTIPLE_CHOICE", "LIKERT"]),
  explanation: z.string().max(2000).optional().nullable(),
  options: z.array(optionSchema).min(2).max(10),
});

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = req.nextUrl;
  const categoryId = url.searchParams.get("categoryId") || undefined;
  const questions = await prisma.question.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: {
      category: true,
      options: { orderBy: { order: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ questions });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Validate options based on type
  if (data.type === "MULTIPLE_CHOICE") {
    const correctCount = data.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      return Response.json({ error: "Multiple choice harus punya tepat 1 jawaban benar" }, { status: 400 });
    }
  }

  const question = await prisma.question.create({
    data: {
      categoryId: data.categoryId,
      text: data.text,
      imageUrl: data.imageUrl ?? null,
      type: data.type,
      explanation: data.explanation ?? null,
      options: {
        create: data.options.map((o, i) => ({
          text: o.text,
          imageUrl: o.imageUrl ?? null,
          score: data.type === "MULTIPLE_CHOICE" ? (o.isCorrect ? 5 : 0) : o.score,
          isCorrect: o.isCorrect ?? false,
          order: o.order ?? i,
        })),
      },
    },
    include: { options: true },
  });
  return Response.json({ question });
}
