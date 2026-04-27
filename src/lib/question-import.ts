import { QuestionType } from "@prisma/client";

export type ImportOptionDraft = {
  key: string;
  text: string;
  imageUrl?: string;
  score: number;
  isCorrect: boolean;
};

export type ImportQuestionDraft = {
  rowNumber: number;
  examCode?: string;
  categoryName: string;
  questionText: string;
  questionImageUrl?: string;
  questionType: QuestionType;
  options: ImportOptionDraft[];
  explanation?: string;
  errors: string[];
};

export type ImportValidationContext = {
  examCodes: Set<string>;
  categoryNames: Set<string>;
};

type RawRow = Record<string, unknown>;

const OPTION_KEYS = ["a", "b", "c", "d", "e"];

export function parseQuestionRows(rows: RawRow[]): ImportQuestionDraft[] {
  return rows.map((row, index) => normalizeRow(row, index + 2));
}

export function parseTextQuestions(text: string): ImportQuestionDraft[] {
  const blocks = text
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const row: RawRow = {
      category_name: inferValue(lines, "category") || inferValue(lines, "kategori") || "",
      question_text: inferValue(lines, "question") || inferValue(lines, "soal") || lines[0] || "",
      question_type: inferValue(lines, "type") || inferValue(lines, "tipe") || "SINGLE_CHOICE",
      explanation: inferValue(lines, "explanation") || inferValue(lines, "penjelasan") || "",
    };
    for (const key of OPTION_KEYS) {
      row[`option_${key}`] = inferValue(lines, `option_${key}`) || inferValue(lines, `${key}.`) || "";
      row[`option_${key}_score`] = inferValue(lines, `option_${key}_score`) || "";
      row[`option_${key}_is_correct`] = inferValue(lines, `option_${key}_is_correct`) || "";
    }
    return normalizeRow(row, index + 1);
  });
}

export function validateImportRows(
  rows: ImportQuestionDraft[],
  context: ImportValidationContext
): ImportQuestionDraft[] {
  return rows.map((row) => {
    const errors = [...row.errors];
    if (row.examCode && !context.examCodes.has(row.examCode)) {
      errors.push(`exam_code "${row.examCode}" tidak ditemukan`);
    }
    if (row.categoryName && !context.categoryNames.has(row.categoryName)) {
      errors.push(`category_name "${row.categoryName}" tidak ditemukan`);
    }
    return { ...row, errors };
  });
}

function normalizeRow(row: RawRow, rowNumber: number): ImportQuestionDraft {
  const rawType = stringValue(row.question_type).toUpperCase();
  const questionType =
    rawType === "LIKERT" ? QuestionType.LIKERT : QuestionType.MULTIPLE_CHOICE;
  const draft: ImportQuestionDraft = {
    rowNumber,
    examCode: stringValue(row.exam_code) || undefined,
    categoryName: stringValue(row.category_name),
    questionText: stringValue(row.question_text),
    questionImageUrl: stringValue(row.question_image_url) || undefined,
    questionType,
    options: OPTION_KEYS.map((key) => ({
      key,
      text: stringValue(row[`option_${key}`]),
      imageUrl: stringValue(row[`option_${key}_image_url`]) || undefined,
      score: numberValue(row[`option_${key}_score`]),
      isCorrect: booleanValue(row[`option_${key}_is_correct`]),
    })).filter((option) => option.text || option.imageUrl),
    explanation: stringValue(row.explanation) || undefined,
    errors: [],
  };

  if (!draft.categoryName) draft.errors.push("category_name wajib diisi");
  if (!draft.questionText && !draft.questionImageUrl) {
    draft.errors.push("question_text wajib diisi jika question_image_url kosong");
  }
  if (!["SINGLE_CHOICE", "MULTIPLE_CHOICE", "LIKERT"].includes(rawType)) {
    draft.errors.push("question_type wajib SINGLE_CHOICE atau LIKERT");
  }
  if (draft.options.length < 2) draft.errors.push("Minimal 2 pilihan jawaban");
  if (draft.questionType === "MULTIPLE_CHOICE" && !draft.options.some((o) => o.isCorrect)) {
    draft.errors.push("SINGLE_CHOICE wajib memiliki minimal satu jawaban benar");
  }
  for (const option of draft.options) {
    if (!Number.isFinite(option.score)) {
      draft.errors.push(`option_${option.key}_score harus numeric`);
    }
    if (draft.questionType === "LIKERT" && (option.score < 1 || option.score > 5)) {
      draft.errors.push(`option_${option.key}_score LIKERT harus 1-5`);
    }
  }
  return draft;
}

function stringValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function numberValue(value: unknown) {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value);
  return Number.isFinite(num) ? num : Number.NaN;
}

function booleanValue(value: unknown) {
  const text = stringValue(value).toLowerCase();
  return ["true", "1", "yes", "y", "benar"].includes(text);
}

function inferValue(lines: string[], key: string) {
  const lowerKey = key.toLowerCase();
  const line = lines.find((item) => item.toLowerCase().startsWith(lowerKey));
  if (!line) return "";
  return line.replace(/^.*?[:.)-]\s*/, "").trim();
}
