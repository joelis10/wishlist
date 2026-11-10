import { config } from "../env";
import { siteDomain } from "../validation";
import { fetchPage, randomUserAgent } from "./fetch";
import { fetchPageWithBrowser, hasBrowser } from "./browser";
import { isEbayUrl, scrapeEbayItem } from "./ebay";
import { parseProductHtml } from "./parse";
import { ScrapeError, type ScrapeMode, type ScrapeResult } from "./types";

type CacheEntry = { at: number; result: ScrapeResult };
type GlobalWithCache = typeof globalThis & { __wishlistScrapeCache?: Map<string, CacheEntry> };

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 150;

function cache(): Map<string, CacheEntry> {
  const g = globalThis as GlobalWithCache;
  if (!g.__wishlistScrapeCache) g.__wishlistScrapeCache = new Map();
  return g.__wishlistScrapeCache;
}

function cacheGet(key: string): ScrapeResult | null {
  const entry = cache().get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache().delete(key);
    return null;
  }
  return entry.result;
}

function cacheSet(key: string, result: ScrapeResult): void {
  const map = cache();
  if (map.size >= CACHE_MAX) {
    const oldest = [...map.entries()].sort((a, b) => a[1].at - b[1].at)[0];
    if (oldest) map.delete(oldest[0]);
  }
  map.set(key, { at: Date.now(), result });
}

type Parsed = ReturnType<typeof parseProductHtml>;
type Page = {
  status: number;
  finalUrl: string;
  html: string;
  blocked: boolean;
  blockedReason: string | null;
};

function parsePage(page: Page, fallbackUrl: string): Parsed {
  return parseProductHtml(page.html, page.finalUrl || fallbackUrl, config.defaultCurrency);
}

function resultFrom(
  url: string,
  page: Page,
  parsed: Parsed,
  usedBrowser: boolean,
  warning: string | null,
): ScrapeResult {
  const finalUrl = page.finalUrl || url;
  const statusOutOfStock = page.status === 404 || page.status === 410 ? false : null;
  const failedPage = page.status >= 400 && !parsed.hadProductData;
  return {
    url,
    finalUrl,
    domain: siteDomain(finalUrl),
    candidates: failedPage
      ? { title: [], description: [], price: [], image: [] }
      : parsed.candidates,
    availability: parsed.availability ?? statusOutOfStock,
    currency: parsed.currency,
    hadProductData: failedPage ? false : parsed.hadProductData,
    httpStatus: page.status || null,
    usedBrowser,
    warning:
      warning ??
      (failedPage
        ? `The page returned HTTP ${page.status}, so there were no details to read.`
        : null),
  };
}

export async function scrapeProductUrl(
  rawUrl: string,
  options: { mode?: ScrapeMode; useCache?: boolean; defaultCurrency?: string } = {},
): Promise<ScrapeResult> {
  const mode = options.mode ?? config.scrape.headless;
  const useCache = options.useCache !== false;
  const key = `${mode}:${rawUrl}`;
  if (useCache) {
    const cached = cacheGet(key);
    if (cached) return cached;
  }

  if (isEbayUrl(rawUrl)) {
    const ebayResult = await scrapeEbayItem(rawUrl);
    if (useCache) cacheSet(key, ebayResult);
    return ebayResult;
  }

  const userAgent = randomUserAgent();
  let page: Page | null = null;
  let usedBrowser = false;
  let warning: string | null = null;

  if (mode === "always" && hasBrowser()) {
    try {
      page = await fetchPageWithBrowser(rawUrl, userAgent);
      usedBrowser = true;
    } catch {
      // Fall back to a normal request below.
    }
  }

  if (!page) {
    try {
      page = await fetchPage(rawUrl, userAgent);
    } catch (fetchError) {
      if (hasBrowser() && mode !== "never") {
        try {
          page = await fetchPageWithBrowser(rawUrl, userAgent);
          usedBrowser = true;
        } catch {
          throw fetchError instanceof ScrapeError
            ? fetchError
            : new ScrapeError("That page could not be read.");
        }
      } else {
        throw fetchError;
      }
    }
  }

  let parsed = parsePage(page, rawUrl);

  const shouldTryBrowser =
    !usedBrowser &&
    mode === "auto" &&
    hasBrowser() &&
    (page.blocked || !parsed.hadProductData);

  if (shouldTryBrowser) {
    try {
      const browserPage = await fetchPageWithBrowser(rawUrl, userAgent);
      const browserParsed = parsePage(browserPage, rawUrl);
      if (browserParsed.hadProductData || !parsed.hadProductData || page.blocked) {
        page = browserPage;
        parsed = browserParsed;
        usedBrowser = true;
      }
    } catch {
      // Keep the normal request result.
    }
  }

  if (page.blocked && !usedBrowser) {
    warning = page.blockedReason
      ? `${page.blockedReason} Try the link manually, or enable the headless browser.`
      : "The site blocked this request. Try again manually.";
  }

  const result = resultFrom(rawUrl, page, parsed, usedBrowser, warning);
  if (useCache) cacheSet(key, result);
  return result;
}
