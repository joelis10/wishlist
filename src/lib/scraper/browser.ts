import fs from "node:fs";
import type { Browser } from "playwright-core";
import { isPrivateHostname } from "./fetch";
import { looksBlocked } from "./fetch";
import { ScrapeError } from "./types";

function candidates(): string[] {
  const configured = process.env.CHROMIUM_PATH;
  return [
    ...(configured ? [configured] : []),
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/opt/google/chrome/chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  ];
}

export function chromiumExecutablePath(): string | null {
  for (const candidate of candidates()) {
    try {
      if (candidate && fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }
  return null;
}

export function hasBrowser(): boolean {
  return chromiumExecutablePath() != null;
}

function shouldBlockRequest(rawUrl: string, resourceType: string): boolean {
  if (["image", "media", "font", "stylesheet", "manifest"].includes(resourceType)) return true;
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return true;
    const hostname = url.hostname.replace(/^\[|\]$/g, "");
    if (isPrivateHostname(hostname)) return true;
    if (url.port && url.port !== "80" && url.port !== "443") return true;
    return false;
  } catch {
    return true;
  }
}

export type BrowserPage = {
  status: number;
  finalUrl: string;
  html: string;
  blocked: boolean;
  blockedReason: string | null;
};

export async function fetchPageWithBrowser(rawUrl: string, userAgent: string): Promise<BrowserPage> {
  const executablePath = chromiumExecutablePath();
  if (!executablePath) {
    throw new ScrapeError("Headless browser is not installed.");
  }

  let browser: Browser | null = null;
  try {
    const { chromium } = await import("playwright-core");
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--no-first-run",
        "--mute-audio",
      ],
    });

    const context = await browser.newContext({
      userAgent,
      locale: "en-GB",
      viewport: { width: 1366, height: 900 },
      javaScriptEnabled: true,
      extraHTTPHeaders: {
        "Accept-Language": "en-GB,en;q=0.9",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      },
    });

    await context.route("**/*", async (route) => {
      if (shouldBlockRequest(route.request().url(), route.request().resourceType())) {
        await route.abort();
      } else {
        await route.continue();
      }
    });

    const page = await context.newPage();
    const response = await page.goto(rawUrl, {
      waitUntil: "domcontentloaded",
      timeout: 25_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 3500 }).catch(() => {});
    const html = await page.content();
    const finalUrl = page.url();
    const status = response?.status() ?? 0;
    const block = looksBlocked(html, status);

    return {
      status,
      finalUrl,
      html,
      blocked: block.blocked,
      blockedReason: block.reason,
    };
  } catch (error) {
    if (error instanceof ScrapeError) throw error;
    throw new ScrapeError("The page could not be read with a browser.");
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
