import { clearParticipantSession } from "@/lib/session";

export async function POST() {
  await clearParticipantSession();
  return Response.json({ ok: true });
}
