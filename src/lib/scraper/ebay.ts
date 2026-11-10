import * as cheerio from "cheerio";
import { decodeHTML } from "entities";
import { config } from "../env";
import { formatPrice } from "../money";
import { siteDomain } from "../validation";
import {
  ScrapeError,
  type ImageCandidate,
  type ScrapeResult,
} from "./types";

type EbayImage = { imageUrl?: string };

type EbayItem = {
  title?: string;
  shortDescription?: string;
  description?: string;
  itemWebUrl?: string;
  image?: EbayImage;
  additionalImages?: EbayImage[];
  thumbnailImages?: EbayImage[];
  price?: { value?: string | number; currency?: string };
  availabilityStatus?: string;
  estimatedAvailabilities?: { estimatedAvailabilityStatus?: string }[];
  availability?: { shipToLocationAvailability?: { quantity?: number } };
  itemEndDate?: string;
};

type TokenCache = { token: string; expiresAt: number; clientId: string };
type GlobalWithEbay = typeof globalThis & { __wishlistEbayToken?: TokenCache };

const HOST_MARKETPLACES: Array<[string, string]> = [
  ["ebay.com.au", "EBAY_AU"],
  ["ebay.com.hk", "EBAY_HK"],
  ["ebay.com.sg", "EBAY_SG"],
  ["ebay.com.my", "EBAY_MY"],
  ["ebay.com.mx", "EBAY_MX"],
  ["ebay.co.uk", "EBAY_GB"],
  ["ebay.ca", "EBAY_CA"],
  ["ebay.de", "EBAY_DE"],
  ["ebay.fr", "EBAY_FR"],
  ["ebay.it", "EBAY_IT"],
  ["ebay.es", "EBAY_ES"],
  ["ebay.ie", "EBAY_IE"],
  ["ebay.at", "EBAY_AT"],
  ["ebay.ch", "EBAY_CH"],
  ["ebay.nl", "EBAY_NL"],
  ["ebay.be", "EBAY_BE"],
  ["ebay.ph", "EBAY_PH"],
  ["ebay.pl", "EBAY_PL"],
  ["ebay.com", "EBAY_US"],
];

export function isEbayUrl(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return HOST_MARKETPLACES.some(
      ([domain]) => host === domain || host.endsWith(`.${domain}`),
    );
  } catch {
    return false;
  }
}

export function extractEbayItemId(value: string): string | null {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/itm\/(?:[^/?#]+\/)?(\d{9,16})(?:[/?#]|$)/i);
    if (match) return match[1];
    for (const key of ["itemid", "item", "ItemID"]) {
      const candidate = url.searchParams.get(key);
      if (candidate && /^\d{9,16}$/.test(candidate)) return candidate;
    }
    return null;
  } catch {
    return null;
  }
}

export function marketplaceForUrl(value: string): string {
  if (config.ebay.marketplaceId) return config.ebay.marketplaceId;
  try {
    const host = new URL(value).hostname.toLowerCase();
    for (const [domain, id] of HOST_MARKETPLACES) {
      if (host === domain || host.endsWith(`.${domain}`)) return id;
    }
  } catch {
    // fall through
  }
  return "EBAY_GB";
}

function credentialsError(): ScrapeError {
  return new ScrapeError(
    "eBay blocks direct page scraping. Add EBAY_CLIENT_ID and EBAY_CLIENT_SECRET to enable eBay's official Browse API.",
  );
}

async function getAccessToken(): Promise<string> {
  const clientId = config.ebay.clientId.trim();
  const clientSecret = config.ebay.clientSecret.trim();
  if (!clientId || !clientSecret) throw credentialsError();

  const g = globalThis as GlobalWithEbay;
  const cached = g.__wishlistEbayToken;
  if (cached && cached.clientId === clientId && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  let response: Response;
  try {
    response = await fetch("https://api.ebay.com/identity/v2/oauth2/token", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "Wishlist/1.0 eBay Browse",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        scope: "https://api.ebay.com/oauth/api_scope",
      }).toString(),
    });
  } catch {
    throw new ScrapeError("eBay's API could not be reached.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 400) {
      throw new ScrapeError(
        "eBay API login failed. Check EBAY_CLIENT_ID and EBAY_CLIENT_SECRET.",
      );
    }
    throw new ScrapeError(`eBay API login failed (HTTP ${response.status}).`);
  }

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string;
    expires_in?: number;
  } | null;
  if (!payload?.access_token) throw new ScrapeError("eBay API returned an invalid token.");

  g.__wishlistEbayToken = {
    token: payload.access_token,
    clientId,
    expiresAt: Date.now() + Math.max(300, Number(payload.expires_in) || 7200) * 1000,
  };
  return payload.access_token;
}

async function fetchItem(itemId: string, marketplaceId: string): Promise<EbayItem> {
  const url = new URL("https://api.ebay.com/buy/browse/v1/item/get_item_by_legacy_id");
  url.searchParams.set("legacy_item_id", itemId);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const token = await getAccessToken();
    let response: Response;
    try {
      response = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
        headers: {
          Authorization: `Bearer ${token}`,
          "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
          Accept: "application/json",
          "User-Agent": "Wishlist/1.0 eBay Browse",
        },
      });
    } catch {
      throw new ScrapeError("eBay's API could not be reached.");
    }

    if (response.status === 401 && attempt === 0) {
      const g = globalThis as GlobalWithEbay;
      g.__wishlistEbayToken = undefined;
      continue;
    }
    if (response.status === 404) {
      throw new ScrapeError("eBay could not find that item.");
    }
    if (response.status === 401 || response.status === 403) {
      throw new ScrapeError(
        "eBay rejected the API request. Check that your eBay application has Browse API access.",
      );
    }
    if (!response.ok) {
      throw new ScrapeError(`eBay API returned HTTP ${response.status}.`);
    }

    const payload = (await response.json().catch(() => null)) as EbayItem | null;
    if (!payload) throw new ScrapeError("eBay returned an empty response.");
    return payload;
  }

  throw new ScrapeError("eBay API authentication failed.");
}

function htmlToText(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const text = cheerio.load(value).text().replace(/\s+/g, " ").trim();
    return decodeHTML(text).slice(0, 5000);
  } catch {
    return decodeHTML(value).replace(/\s+/g, " ").trim().slice(0, 5000);
  }
}

function itemAvailability(item: EbayItem): boolean | null {
  const statuses = [
    item.availabilityStatus,
    ...(item.estimatedAvailabilities || []).map(
      (entry) => entry.estimatedAvailabilityStatus,
    ),
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/out_of_stock|outofstock|sold_out|soldout|unavailable/.test(statuses)) return false;
  if (/in_stock|instock|limited_stock|limitedavailability|available/.test(statuses)) return true;
  const quantity = item.availability?.shipToLocationAvailability?.quantity;
  if (typeof quantity === "number") return quantity > 0;
  if (item.itemEndDate) {
    const endedAt = Date.parse(item.itemEndDate);
    if (Number.isFinite(endedAt) && endedAt < Date.now()) return false;
  }
  return null;
}

export function ebayItemToResult(rawUrl: string, item: EbayItem): ScrapeResult {
  const title = decodeHTML(String(item.title || ""))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  const description =
    htmlToText(item.shortDescription) || htmlToText(item.description) || "";

  const priceValue = Number(item.price?.value);
  const currency = /^[A-Z]{3}$/.test((item.price?.currency || "").toUpperCase())
    ? (item.price?.currency || "").toUpperCase()
    : "GBP";
  const cents =
    Number.isFinite(priceValue) && priceValue > 0 ? Math.round(priceValue * 100) : null;

  const images: ImageCandidate[] = [];
  const imageUrls = [
    item.image?.imageUrl,
    ...(item.additionalImages || []).map((image) => image.imageUrl),
    ...(item.thumbnailImages || []).map((image) => image.imageUrl),
  ];
  for (const rawImage of imageUrls) {
    if (!rawImage) continue;
    try {
      const imageUrl = new URL(rawImage);
      if (imageUrl.protocol !== "http:" && imageUrl.protocol !== "https:") continue;
      const normalized = imageUrl.toString();
      if (images.some((image) => image.url === normalized)) continue;
      images.push({ url: normalized, title: title || null });
      if (images.length >= 8) break;
    } catch {
      // ignore malformed image URLs
    }
  }

  const finalUrl =
    typeof item.itemWebUrl === "string" && /^https?:\/\//i.test(item.itemWebUrl)
      ? item.itemWebUrl
      : rawUrl;

  return {
    url: rawUrl,
    finalUrl,
    domain: siteDomain(finalUrl),
    candidates: {
      title: title ? [title] : [],
      description: description ? [description] : [],
      price:
        cents == null
          ? []
          : [{ value: cents, currency, label: formatPrice(cents, currency) }],
      image: images,
    },
    availability: itemAvailability(item),
    currency,
    hadProductData: Boolean(title || description || cents),
    httpStatus: 200,
    usedBrowser: false,
    warning: null,
  };
}

export async function scrapeEbayItem(rawUrl: string): Promise<ScrapeResult> {
  if (!config.ebay.clientId || !config.ebay.clientSecret) throw credentialsError();
  const itemId = extractEbayItemId(rawUrl);
  if (!itemId) {
    throw new ScrapeError("That eBay link does not contain an item ID.");
  }
  const item = await fetchItem(itemId, marketplaceForUrl(rawUrl));
  const result = ebayItemToResult(rawUrl, item);
  if (!result.hadProductData) {
    throw new ScrapeError("eBay returned no usable details for that item.");
  }
  return result;
}
