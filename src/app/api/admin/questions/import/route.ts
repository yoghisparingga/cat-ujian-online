import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { Prisma } from "@prisma/client";
import { PDFParse } from "pdf-parse";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQuestionRows, parseTextQuestions, validateImportRows } from "@/lib/question-import";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "File wajib diupload" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  const [packages, categories] = await Promise.all([
    prisma.package.findMany({ select: { code: true } }),
    prisma.category.findMany({ select: { name: true } }),
  ]);
  const validationContext = {
    examCodes: new Set(packages.map((pkg) => pkg.code)),
    categoryNames: new Set(categories.map((category) => category.name)),
  };
  let rows;
  let parserNote;

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const sheetRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" });
    rows = parseQuestionRows(sheetRows);
    parserNote = "XLS/XLSX parser membaca header kolom secara langsung.";
  } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
    const result = await mammoth.extractRawText({ buffer });
    rows = parseTextQuestions(result.value);
    parserNote = "Parser DOC/DOCX masih basic berbasis teks mentah; cek dan validasi preview sebelum simpan.";
  } else if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    rows = parseTextQuestions(result.text);
    parserNote = "Parser PDF masih basic berbasis ekstraksi teks; layout tabel/kolom dapat perlu koreksi di preview.";
  } else {
    return Response.json({ error: "Format file belum didukung" }, { status: 400 });
  }

  const validatedRows = validateImportRows(rows, validationContext);
  const importSession = await prisma.importSession.create({
    data: {
      adminId: admin.id,
      examCode: validatedRows.find((row) => row.examCode)?.examCode || null,
      fileName: file.name,
      totalRows: validatedRows.length,
      successfulRows: validatedRows.filter((row) => row.errors.length === 0).length,
      errorRows: validatedRows.filter((row) => row.errors.length > 0).length,
      previewData: JSON.parse(JSON.stringify(validatedRows)) as Prisma.InputJsonValue,
    },
  });

  return Response.json({ importSessionId: importSession.id, rows: validatedRows, parserNote });
}
