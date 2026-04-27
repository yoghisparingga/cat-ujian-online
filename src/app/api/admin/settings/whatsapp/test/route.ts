import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { indonesianPhoneSchema } from "@/lib/phone";
import { whatsAppService } from "@/lib/whatsapp";

const schema = z.object({
  phone: indonesianPhoneSchema,
  message: z.string().min(1).max(500),
});

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Invalid input" }, { status: 400 });

  const result = await whatsAppService.testSendMessage(parsed.data.phone, parsed.data.message);
  return Response.json(result, { status: result.ok ? 200 : 502 });
}
