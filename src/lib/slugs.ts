import { randomBytes } from "node:crypto";

/** 72 bits of randomness after a leading letter so it is never numeric. */
export function generateShareSlug(): string {
  return `w${randomBytes(9).toString("base64url")}`;
}

export function isShareSlug(value: unknown): value is string {
  return typeof value === "string" && /^w[A-Za-z0-9_-]{12}$/.test(value);
}
