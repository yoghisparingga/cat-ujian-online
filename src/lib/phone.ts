import { z } from "zod";

export function normalizeIndonesianPhoneNumber(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function isValidIndonesianPhoneNumber(input: string): boolean {
  return /^628\d{8,13}$/.test(normalizeIndonesianPhoneNumber(input));
}

export const indonesianPhoneSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeIndonesianPhoneNumber(value);
  if (!isValidIndonesianPhoneNumber(normalized)) {
    ctx.addIssue({
      code: "custom",
      message: "Nomor WhatsApp Indonesia tidak valid",
    });
    return z.NEVER;
  }
  return normalized;
});
