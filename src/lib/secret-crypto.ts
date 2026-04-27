import crypto from "crypto";

const PREFIX = "enc:v1:";
const KEY_SOURCE =
  process.env.ENCRYPTION_KEY || process.env.WHATSAPP_ENCRYPTION_KEY || process.env.SESSION_SECRET || "";

function getKey() {
  if (!KEY_SOURCE) return null;
  return crypto.createHash("sha256").update(KEY_SOURCE).digest();
}

export function encryptSecret(value: string) {
  const key = getKey();
  if (!key) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptSecret(value: string | null | undefined) {
  if (!value) return "";
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return "";
  try {
    const packed = Buffer.from(value.slice(PREFIX.length), "base64url");
    const iv = packed.subarray(0, 12);
    const tag = packed.subarray(12, 28);
    const ciphertext = packed.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return "";
  }
}
