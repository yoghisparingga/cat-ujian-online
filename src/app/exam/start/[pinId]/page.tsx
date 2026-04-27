import { redirect, notFound } from "next/navigation";
import { requireParticipant } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PinForm } from "./PinForm";

export const dynamic = "force-dynamic";

export default async function ExamStartPage({
  params,
}: {
  params: Promise<{ pinId: string }>;
}) {
  const { pinId } = await params;
  const participant = await requireParticipant();

  const pin = await prisma.participantPin.findUnique({
    where: { id: pinId },
    include: {
      package: { include: { packageCategories: { include: { category: true } } } },
      session: true,
    },
  });
  if (!pin || pin.participantId !== participant.id) notFound();
  if (pin.session) {
    redirect(
      pin.session.status === "IN_PROGRESS"
        ? `/exam/${pin.session.id}`
        : `/exam/${pin.session.id}/result`
    );
  }

  const totalSoal = pin.package.packageCategories.reduce(
    (sum, pc) => sum + pc.questionCount,
    0
  );

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="card p-8 max-w-md w-full space-y-6">
        <div>
          <h1 className="text-xl font-bold">{pin.package.name}</h1>
          <p className="text-sm text-zinc-600 mt-1">{pin.package.description}</p>
        </div>
        <div className="text-sm text-zinc-700 space-y-1 bg-zinc-50 border border-zinc-200 rounded-lg p-4">
          <div>
            <strong>Durasi:</strong> {pin.package.durationMinutes} menit
          </div>
          <div>
            <strong>Total soal:</strong> {totalSoal}
          </div>
          <div>
            <strong>Kategori:</strong>{" "}
            {pin.package.packageCategories
              .map((pc) => `${pc.category.name} (${pc.questionCount})`)
              .join(", ")}
          </div>
        </div>
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-4">
          Setelah PIN dimasukkan dengan benar, ujian akan langsung dimulai dan timer
          akan berjalan walaupun browser Anda tertutup.
        </div>
        <PinForm packageId={pin.packageId} />
      </div>
    </main>
  );
}
