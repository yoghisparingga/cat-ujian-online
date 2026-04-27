import { NextRequest } from "next/server";
import { Prisma, QuestionType } from "@prisma/client";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

const optionSchema = z.object({
  key: z.string().optional(),
  text: z.string().min(1),
  imageUrl: z.string().optional().nullable(),
  score: z.number().int().min(0).max(5),
  isCorrect: z.boolean(),
});

const rowSchema = z.object({
  categoryName: z.string().min(1),
  questionText: z.string().min(1),
  questionImageUrl: z.string().optional().nullable(),
  questionType: z.enum(["MULTIPLE_CHOICE", "LIKERT"]),
  options: z.array(optionSchema).min(2).max(10),
  explanation: z.string().optional().nullable(),
  errors: z.array(z.string()).optional(),
});

const schema = z.object({
  importSessionId: z.string().min(1).optional(),
  rows: z.array(rowSchema).min(1),
});

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const { importSessionId, rows } = parsed.data;
  const invalid = rows.find((row) => row.errors?.length);
  if (invalid) return Response.json({ error: "Masih ada baris dengan error validasi" }, { status: 400 });

  try {
    const created = await prisma.$transaction(async (tx) => {
      let count = 0;
      for (const [rowIndex, row] of rows.entries()) {
        if (row.questionType === "MULTIPLE_CHOICE" && !row.options.some((option) => option.isCorrect)) {
          throw new Error(`Soal "${row.questionText.slice(0, 40)}" tidak punya jawaban benar`);
        }
        const category = await tx.category.findUnique({
          where: { name: row.categoryName },
        });
        if (!category) throw new Error(`Kategori "${row.categoryName}" tidak ditemukan`);
        const question = await tx.question.create({
          data: {
            categoryId: category.id,
            text: row.questionText,
            imageUrl: row.questionImageUrl || null,
            type: row.questionType as QuestionType,
            explanation: row.explanation || null,
            options: {
              create: row.options.map((option, index) => ({
                text: option.text,
                imageUrl: option.imageUrl || null,
                score: row.questionType === "MULTIPLE_CHOICE" ? (option.isCorrect ? 5 : 0) : option.score,
                isCorrect: option.isCorrect,
                order: index,
              })),
            },
          },
        });
        if (importSessionId) {
          await tx.importedQuestion.create({
            data: {
              importSessionId,
              questionId: question.id,
              rowNumber: rowIndex + 1,
            },
          });
        }
        count += 1;
      }
      if (importSessionId) {
        await tx.importSession.update({
          where: { id: importSessionId },
          data: {
            status: "COMPLETED",
            successfulRows: count,
            errorRows: 0,
            previewData: JSON.parse(JSON.stringify(rows)) as Prisma.InputJsonValue,
          },
        });
      }
      return count;
    });

    return Response.json({ ok: true, created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan import";
    return Response.json({ error: message }, { status: 400 });
  }
}
