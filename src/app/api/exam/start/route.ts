import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireParticipant } from "@/lib/auth";
import { shuffle } from "@/lib/exam";

const schema = z.object({
  packageId: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/),
});

export async function POST(req: NextRequest) {
  const participant = await requireParticipant();
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "PIN harus 4 digit angka" }, { status: 400 });
  }
  const { packageId, pin } = parsed.data;

  const pinRow = await prisma.participantPin.findUnique({
    where: { packageId_pin: { packageId, pin } },
    include: { session: true, package: { include: { packageCategories: true } } },
  });
  if (!pinRow || pinRow.participantId !== participant.id) {
    return Response.json({ error: "PIN tidak valid untuk peserta ini" }, { status: 403 });
  }
  if (!pinRow.package.isActive) {
    return Response.json({ error: "Paket sudah tidak aktif" }, { status: 400 });
  }
  const activeSession = await prisma.examSession.findFirst({
    where: { participantId: participant.id, packageId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (activeSession) {
    return Response.json({ sessionId: activeSession.id, resumed: true });
  }

  // If a session already exists for this PIN, return it (resume)
  if (pinRow.session) {
    return Response.json({ sessionId: pinRow.session.id, resumed: true });
  }

  // Build question order: random pick per category according to package config
  const categoryQuotas = pinRow.package.packageCategories;
  const allQuestionIds: string[] = [];
  for (const pc of categoryQuotas) {
    const pool = await prisma.question.findMany({
      where: { categoryId: pc.categoryId },
      select: { id: true },
    });
    if (pool.length < pc.questionCount) {
      return Response.json(
        { error: `Soal kategori belum cukup (butuh ${pc.questionCount}, tersedia ${pool.length})` },
        { status: 400 }
      );
    }
    const picked = shuffle(pool).slice(0, pc.questionCount).map((q) => q.id);
    allQuestionIds.push(...picked);
  }
  const order = shuffle(allQuestionIds);

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.examSession.create({
      data: {
        participantId: participant.id,
        packageId,
        pinId: pinRow.id,
        durationMinutes: pinRow.package.durationMinutes,
        expiresAt: new Date(Date.now() + pinRow.package.durationMinutes * 60_000),
        questionOrder: order,
        currentQuestionId: order[0] || null,
      },
    });
    await tx.participantPin.update({ where: { id: pinRow.id }, data: { used: true } });
    return created;
  });

  return Response.json({ sessionId: session.id, resumed: false });
}
