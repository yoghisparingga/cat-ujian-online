import { cookies } from "next/headers";
import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "dev-secret-change-me-please-32chars-min";

const PARTICIPANT_COOKIE = "cat_participant";
const ADMIN_COOKIE = "cat_admin";

function sign(value: string): string {
  return crypto.createHmac("sha256", SECRET).update(value).digest("base64url");
}

function pack(value: string): string {
  return `${value}.${sign(value)}`;
}

function unpack(packed: string | undefined): string | null {
  if (!packed) return null;
  const idx = packed.lastIndexOf(".");
  if (idx < 0) return null;
  const value = packed.slice(0, idx);
  const sig = packed.slice(idx + 1);
  const expected = sign(value);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return value;
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export async function setParticipantSession(participantId: string) {
  const store = await cookies();
  store.set(PARTICIPANT_COOKIE, pack(participantId), COOKIE_OPTIONS);
}

export async function getParticipantId(): Promise<string | null> {
  const store = await cookies();
  return unpack(store.get(PARTICIPANT_COOKIE)?.value);
}

export async function clearParticipantSession() {
  const store = await cookies();
  store.delete(PARTICIPANT_COOKIE);
}

export async function setAdminSession(adminId: string) {
  const store = await cookies();
  store.set(ADMIN_COOKIE, pack(adminId), COOKIE_OPTIONS);
}

export async function getAdminId(): Promise<string | null> {
  const store = await cookies();
  return unpack(store.get(ADMIN_COOKIE)?.value);
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
}
