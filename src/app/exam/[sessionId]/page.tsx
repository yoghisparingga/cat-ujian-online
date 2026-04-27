import { notFound } from "next/navigation";
import { requireParticipant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ExamRunner } from "./ExamRunner";

export const dynamic = "force-dynamic";

export default async function ExamPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const participant = await requireParticipant();
  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session || session.participantId !== participant.id) notFound();

  return <ExamRunner sessionId={sessionId} />;
}
