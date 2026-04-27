import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { generatePin4 } from "@/lib/exam";

const createSchema = z.object({
  participantId: z.string().min(1),
  packageId: z.string().min(1),
});

export async function GET(req: NextRequest) {
  await requireAdmin();
  const url = req.nextUrl;
  const packageId = url.searchParams.get("packageId") || undefined;
  const pins = await prisma.participantPin.findMany({
    where: packageId ? { packageId } : undefined,
    include: {
      participant: true,
      package: true,
      session: { select: { id: true, status: true, totalScore: true, submittedAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json({ pins });
}

export async function POST(req: NextRequest) {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid input" }, { status: 400 });
  }
  const { participantId, packageId } = parsed.data;

  // Generate unique 4-digit PIN within this package (retry on collision)
  for (let attempt = 0; attempt < 50; attempt++) {
    const pin = generatePin4();
    try {
      const created = await prisma.participantPin.create({
        data: { participantId, packageId, pin },
        include: { participant: true, package: true },
      });
      return Response.json({ pin: created });
    } catch (e: unknown) {
      // unique constraint failure (P2002) -> retry
      if (e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002") {
        continue;
      }
      throw e;
    }
  }
  return Response.json({ error: "Tidak bisa generate PIN unik, coba lagi" }, { status: 500 });
}
