import path from "node:path";

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function normalizeUrl(value: string | undefined, fallback: string): string {
  const candidate = (value || fallback).trim().replace(/\/+$/, "");
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return fallback;
    return candidate;
  } catch {
    return fallback;
  }
}

const port = Number(process.env.PORT || 3000);
const appUrl = normalizeUrl(process.env.APP_URL, `http://localhost:${port}`);
const headlessRaw = (process.env.SCRAPE_HEADLESS || "auto").toLowerCase();
const headless = ["auto", "always", "never"].includes(headlessRaw)
  ? (headlessRaw as "auto" | "always" | "never")
  : "auto";

export const config = {
  appUrl,
  port,
  dataDir: path.resolve(process.env.DATA_DIR || path.join(process.cwd(), "data")),
  cookieSecure: bool(process.env.COOKIE_SECURE, appUrl.startsWith("https://")),
  allowRegistration: bool(process.env.ALLOW_REGISTRATION, true),
  defaultCurrency: (process.env.DEFAULT_CURRENCY || "GBP").toUpperCase(),
  timezone: process.env.TZ || undefined,
  maxItemsPerWishlist: 1000,
  maxImageBytes: 8 * 1024 * 1024,
  fx: {
    cron: process.env.FX_CRON || "0 0 * * *",
  },
  scrape: {
    enabled: bool(process.env.SCRAPE_ENABLED, true),
    cron: process.env.SCRAPE_CRON || "0 0 * * *",
    headless,
    jobsHeadless: bool(process.env.SCRAPE_JOBS_HEADLESS, false),
    maxPerRun: Math.max(0, Number(process.env.SCRAPE_MAX_PER_RUN || 1000) || 0),
    delayMs: Math.max(0, Number(process.env.SCRAPE_DELAY_MS || 2500) || 0),
    domainDelayMs: Math.max(0, Number(process.env.SCRAPE_DOMAIN_DELAY_MS || 15000) || 0),
    chromiumPath: process.env.CHROMIUM_PATH || "",
  },
  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY || "",
    privateKey: process.env.VAPID_PRIVATE_KEY || "",
    subject: process.env.VAPID_SUBJECT || appUrl,
  },
} as const;

export const SESSION_COOKIE = "wishlist_session";

export function absoluteUrl(pathname: string): string {
  return `${config.appUrl}${pathname.startsWith("/") ? "" : "/"}${pathname}`;
}
