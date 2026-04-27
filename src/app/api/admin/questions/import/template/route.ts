import * as XLSX from "xlsx";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();
  const rows = [
    {
      exam_code: "PKG-DEMO",
      category_name: "TWK",
      question_text: "Contoh soal pilihan ganda?",
      question_image_url: "",
      question_type: "SINGLE_CHOICE",
      option_a: "Jawaban benar",
      option_a_image_url: "",
      option_a_score: 5,
      option_a_is_correct: true,
      option_b: "Jawaban salah",
      option_b_image_url: "",
      option_b_score: 0,
      option_b_is_correct: false,
      option_c: "Jawaban salah lain",
      option_c_image_url: "",
      option_c_score: 0,
      option_c_is_correct: false,
      option_d: "Jawaban salah lain",
      option_d_image_url: "",
      option_d_score: 0,
      option_d_is_correct: false,
      option_e: "",
      option_e_image_url: "",
      option_e_score: "",
      option_e_is_correct: "",
      explanation: "Penjelasan opsional",
    },
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, worksheet, "questions");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="template-import-soal.xlsx"',
    },
  });
}
