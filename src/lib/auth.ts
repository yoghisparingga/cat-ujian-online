import { redirect } from "next/navigation";
import { prisma } from "./db";
import { getAdminId, getParticipantId } from "./session";

export async function requireParticipant() {
  const id = await getParticipantId();
  if (!id) redirect("/login");
  const participant = await prisma.participant.findUnique({ where: { id } });
  if (!participant) redirect("/login");
  return participant;
}

export async function requireAdmin() {
  const id = await getAdminId();
  if (!id) redirect("/admin/login");
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function getCurrentParticipant() {
  const id = await getParticipantId();
  if (!id) return null;
  return prisma.participant.findUnique({ where: { id } });
}

export async function getCurrentAdmin() {
  const id = await getAdminId();
  if (!id) return null;
  return prisma.adminUser.findUnique({ where: { id } });
}
