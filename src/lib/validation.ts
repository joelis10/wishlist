import { z } from "zod";
import { isValidDateOnly, type Recurrence } from "./dates";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters.")
  .max(32, "Username must be at most 32 characters.")
  .regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, dashes or underscores only.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(200, "Password is too long.");

export function cleanText(value: FormDataEntryValue | null | undefined, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").trim().slice(0, maxLength);
}

export function booleanFromForm(value: FormDataEntryValue | null | undefined): boolean {
  return value === "on" || value === "true" || value === "1";
}

const SECOND_LEVEL_SUFFIXES = new Set([
  "co.uk",
  "org.uk",
  "ac.uk",
  "gov.uk",
  "me.uk",
  "ltd.uk",
  "plc.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.nz",
  "net.nz",
  "org.nz",
  "co.jp",
  "ne.jp",
  "or.jp",
  "com.br",
  "com.mx",
  "com.ar",
  "co.za",
  "co.in",
  "co.il",
  "com.sg",
  "com.hk",
  "com.tr",
  "com.es",
  "co.ir",
]);

export function siteDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
    if (!host.includes(".") || host.startsWith("[")) return host || null;
    const labels = host.split(".");
    const lastTwo = labels.slice(-2).join(".");
    if (labels.length >= 3 && SECOND_LEVEL_SUFFIXES.has(lastTwo)) {
      return labels.slice(-3).join(".");
    }
    return lastTwo;
  } catch {
    return null;
  }
}

export function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withScheme);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https links are supported.");
  }
  return parsed.toString();
}

export function optionalUrl(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    return normalizeUrlInput(value);
  } catch {
    return null;
  }
}

export function parsePriceToCents(value: FormDataEntryValue | string | null | undefined): number | null {
  if (typeof value !== "string") return null;
  let cleaned = value.trim().replace(/[\s\u00a0]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    cleaned = cleaned.split(thousands).join("").replace(decimal, ".");
  } else if (lastComma >= 0) {
    cleaned = /^\d{1,3}(,\d{3})+$/.test(cleaned)
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(",", ".");
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "");
  }

  const number = Number(cleaned);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

export function parseEndDate(value: FormDataEntryValue | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return isValidDateOnly(value.trim()) ? value.trim() : null;
}

export function parseRecurrence(value: FormDataEntryValue | null | undefined): Recurrence {
  if (value === "weekly" || value === "monthly" || value === "yearly") return value;
  return "none";
}

export function parseCurrency(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string") return "GBP";
  const code = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : "GBP";
}

