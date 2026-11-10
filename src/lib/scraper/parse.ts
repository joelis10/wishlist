import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import { decodeHTML } from "entities";
import { formatPrice } from "../money";
import { siteDomain } from "../validation";
import type { PriceCandidate, ScrapeCandidates } from "./types";

type RawPrice = { cents: number; currency: string };

type Collected = {
  titles: string[];
  descriptions: string[];
  images: string[];
  prices: RawPrice[];
  availability: boolean | null;
  currency: string | null;
  productSeen: boolean;
  siteName: string | null;
};

type SchemaNode = Record<string, unknown>;

const TITLE_LIMIT = 8;
const DESCRIPTION_LIMIT = 6;
const IMAGE_LIMIT = 8;
const PRICE_LIMIT = 8;

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanInline(value: string, max = 2000): string {
  return decodeHTML(value).replace(/\s+/g, " ").trim().slice(0, max);
}

function typesOf(node: SchemaNode): string[] {
  return asArray(node["@type"]).map((type) => String(type).toLowerCase());
}

function addUnique(list: string[], value: string, limit: number): void {
  const cleaned = cleanInline(value, 3000);
  if (cleaned.length < 2) return;
  if (/^(404\b|not found|page not found|access denied|just a moment|error\b)/i.test(cleaned)) {
    return;
  }
  if (list.some((item) => item.toLowerCase() === cleaned.toLowerCase())) return;
  if (list.length < limit) list.push(cleaned);
}

function addDescription(collected: Collected, value: string): void {
  const cleaned = cleanInline(value, 3000);
  if (cleaned.length < 10) return;
  const lower = cleaned.toLowerCase();
  const existingIndex = collected.descriptions.findIndex((existing) => {
    const current = existing.toLowerCase();
    return current === lower || current.includes(lower) || lower.includes(current);
  });
  if (existingIndex >= 0) {
    if (cleaned.length > collected.descriptions[existingIndex].length) {
      collected.descriptions[existingIndex] = cleaned;
    }
    return;
  }
  if (collected.descriptions.length < DESCRIPTION_LIMIT) collected.descriptions.push(cleaned);
}

function addImage(collected: Collected, value: unknown, baseUrl: string): void {
  const raw = typeof value === "string" ? decodeHTML(value) : null;
  if (raw) {
    try {
      const url = new URL(raw, baseUrl);
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      if (/\.svg(\?|$)/i.test(url.pathname)) return;
      const normalized = url.toString();
      if (!collected.images.some((existing) => existing === normalized)) {
        if (collected.images.length < IMAGE_LIMIT) collected.images.push(normalized);
      }
    } catch {
      // ignore invalid URLs
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => addImage(collected, entry, baseUrl));
    return;
  }
  if (value && typeof value === "object") {
    const obj = value as SchemaNode;
    addImage(collected, obj.url ?? obj.contentUrl ?? obj["@id"], baseUrl);
  }
}

function addPrice(collected: Collected, major: unknown, currencyHint?: unknown): void {
  const raw = typeof major === "string" ? major.replace(/,/g, "") : major;
  const amount = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50_000_000) return;
  const hint = typeof currencyHint === "string" ? currencyHint.trim().toUpperCase() : "";
  const currency = /^[A-Z]{3}$/.test(hint) ? hint : collected.currency || "GBP";
  const cents = Math.round(amount * 100);
  if (!collected.currency && /^[A-Z]{3}$/.test(hint)) collected.currency = hint;
  const key = `${currency}:${cents}`;
  if (
    !collected.prices.some(
      (existing) => `${existing.currency}:${existing.cents}` === key,
    ) &&
    collected.prices.length < 30
  ) {
    collected.prices.push({ cents, currency });
  }
}

function availabilityValue(value: unknown): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = decodeHTML(value).toLowerCase();
  if (
    normalized.includes("outofstock") ||
    normalized.includes("soldout") ||
    normalized.includes("discontinued") ||
    normalized.includes("out of stock") ||
    normalized.includes("sold out") ||
    normalized.includes("currently unavailable") ||
    normalized.includes("not available")
  ) {
    return false;
  }
  if (
    normalized.includes("instock") ||
    normalized.includes("onlineonly") ||
    normalized.includes("limitedavailability") ||
    normalized.includes("instoreonly") ||
    normalized.includes("backorder") ||
    normalized.includes("preorder") ||
    normalized.includes("in stock") ||
    normalized.includes("available")
  ) {
    return true;
  }
  return null;
}

function handleSchemaNode(node: SchemaNode, collected: Collected, baseUrl: string): void {
  const types = typesOf(node);
  const isProduct = types.includes("product");
  const isOffer = types.includes("offer") || types.includes("aggregateoffer");

  if (isProduct) {
    collected.productSeen = true;
    if (typeof node.name === "string") addUnique(collected.titles, node.name, TITLE_LIMIT);
    if (typeof node.description === "string") {
      addDescription(collected, node.description);
    }
    asArray(node.image).forEach((image) => addImage(collected, image, baseUrl));
  }

  if (isOffer || "price" in node || "lowPrice" in node || "highPrice" in node) {
    const currency =
      typeof node.priceCurrency === "string"
        ? node.priceCurrency
        : collected.currency || undefined;
    for (const key of ["price", "lowPrice", "highPrice"]) {
      if (key in node) addPrice(collected, node[key], currency);
    }
    if (collected.availability == null && "availability" in node) {
      collected.availability = availabilityValue(node.availability);
    }
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "@context" || key === "@type") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry && typeof entry === "object") {
          handleSchemaNode(entry as SchemaNode, collected, baseUrl);
        }
      });
    } else if (value && typeof value === "object") {
      handleSchemaNode(value as SchemaNode, collected, baseUrl);
    }
  }
}

function parseJsonLd($: CheerioAPI, collected: Collected, baseUrl: string): void {
  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      const parsed: unknown = JSON.parse(raw);
      for (const entry of asArray(parsed)) {
        if (entry && typeof entry === "object") {
          handleSchemaNode(entry as SchemaNode, collected, baseUrl);
        }
      }
    } catch {
      // Some shops output malformed JSON-LD; other extraction still applies.
    }
  });
}

function metaContent($: CheerioAPI, ...selectors: string[]): string | null {
  for (const selector of selectors) {
    const value = $(selector).first().attr("content");
    if (value && value.trim()) return decodeHTML(value.trim());
  }
  return null;
}

function stripSiteSuffix(title: string, siteName: string | null): string {
  let result = cleanInline(title, 300);
  if (siteName) {
    const escaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\s*[|·–—-]\\s*${escaped}\\s*$`, "i"), "").trim();
  }
  if (result.length > 25) {
    result = result.replace(/\s+[|·–—]\s+[^|·–—]{1,35}$/, "").trim();
  }
  return result;
}

function parseAmount(raw: string): number | null {
  let value = raw.replace(/[^\d.,]/g, "");
  if (!value) return null;
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    value = value.split(thousands).join("");
    value = value.replace(decimal, ".");
  } else if (lastComma >= 0) {
    if (/^\d{1,3}(,\d{3})+$/.test(value)) value = value.replace(/,/g, "");
    else value = value.replace(",", ".");
  } else if (lastDot >= 0 && /^\d{1,3}(\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, "");
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50_000_000) return null;
  return amount;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  "£": "GBP",
  "€": "EUR",
  "¥": "JPY",
  "₹": "INR",
  "US$": "USD",
  "CA$": "CAD",
  "AU$": "AUD",
  "A$": "AUD",
  "C$": "CAD",
  "NZ$": "NZD",
  "$": "USD",
};

const CODE_RE = "GBP|USD|EUR|AUD|CAD|NZD|JPY|CHF|SEK|NOK|DKK|INR|PLN";
const SYMBOL_RE = "US\\$|CA\\$|AU\\$|NZ\\$|A\\$|C\\$|£|€|¥|₹|\\$";

function moneyFromText(text: string, defaultCurrency: string, collected: Collected): void {
  const source = decodeHTML(text).slice(0, 800);
  const pattern = new RegExp(
    `(?:(${SYMBOL_RE})|\\b(${CODE_RE})\\b)\\s*([0-9][0-9.,\\u00a0 ]{0,16})|([0-9][0-9.,\\u00a0]{0,16})\\s*\\b(${CODE_RE})\\b`,
    "gi",
  );
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    const symbol = match[1];
    const leadingCode = match[2];
    const amountRaw = match[3] ?? match[4];
    const trailingCode = match[5];
    if (!amountRaw) continue;
    const amount = parseAmount(amountRaw);
    if (amount == null) continue;
    const currency =
      CURRENCY_SYMBOLS[symbol || ""] ||
      (leadingCode || trailingCode || "").toUpperCase() ||
      defaultCurrency;
    addPrice(collected, amount, currency);
    if (!collected.currency && /^[A-Z]{3}$/.test(currency)) collected.currency = currency;
  }
}

function addBarePrice(text: string, currency: string, collected: Collected): void {
  const amount = parseAmount(decodeHTML(text).slice(0, 60));
  if (amount != null) addPrice(collected, amount, currency);
}

function parseMicrodata($: CheerioAPI, collected: Collected, baseUrl: string): void {
  const product = $('[itemtype*="Product"]').first();
  if (product.length) {
    collected.productSeen = true;
    const name = product.find('[itemprop="name"]').first();
    if (name.length) addUnique(collected.titles, name.text() || name.attr("content") || "", TITLE_LIMIT);
    const description = product.find('[itemprop="description"]').first();
    if (description.length) {
      addDescription(collected, description.attr("content") || description.text());
    }
    product.find('[itemprop="image"]').each((_, element) => {
      const node = $(element);
      addImage(collected, node.attr("content") || node.attr("src") || "", baseUrl);
    });
    const currency =
      product.find('[itemprop="priceCurrency"]').first().attr("content") ||
      product.find('[itemprop="priceCurrency"]').first().text() ||
      collected.currency ||
      "GBP";
    if (/^[A-Z]{3}$/i.test(currency.trim())) collected.currency = currency.trim().toUpperCase();
    product.find('[itemprop="price"]').each((_, element) => {
      const node = $(element);
      const value = node.attr("content") || node.text();
      if (value) {
        if (new RegExp(`(?:${SYMBOL_RE}|${CODE_RE})`, "i").test(value)) {
          moneyFromText(value, currency.trim().toUpperCase(), collected);
        } else {
          addBarePrice(value, currency.trim().toUpperCase(), collected);
        }
      }
    });
    const availability =
      product.find('[itemprop="availability"]').first().attr("content") ||
      product.find('[itemprop="availability"]').first().attr("href") ||
      product.find('[itemprop="availability"]').first().text();
    if (collected.availability == null && availability) {
      collected.availability = availabilityValue(availability);
    }
  }

  $('[itemprop="image"]').each((_, element) => {
    const node = $(element);
    addImage(collected, node.attr("content") || node.attr("src") || "", baseUrl);
  });
}

function parseDomPrices($: CheerioAPI, collected: Collected, defaultCurrency: string): void {
  const pageCurrency = collected.currency || defaultCurrency;
  let count = 0;
  $("[itemprop='price'], [data-price], [class*='price' i], [id*='price' i]").each((_, element) => {
    if (count >= 40) return false;
    const node = $(element);
    const texts = [
      node.attr("content"),
      node.attr("data-price"),
      node.attr("data-product-price"),
      node.text(),
    ].filter((value): value is string => Boolean(value && value.trim()));
    for (const text of texts.slice(0, 2)) {
      const before = collected.prices.length;
      if (new RegExp(`(?:${SYMBOL_RE}|${CODE_RE})`, "i").test(text)) {
        moneyFromText(text, pageCurrency, collected);
      } else if (node.is("[itemprop='price'], [data-price], [data-product-price]")) {
        addBarePrice(text, pageCurrency, collected);
      }
      if (collected.prices.length > before) count += 1;
    }
    return undefined;
  });
}

function parseImagesDom($: CheerioAPI, collected: Collected, baseUrl: string): void {
  const selector = [
    '[itemtype*="Product"] img',
    '[class*="product" i] img',
    '[id*="product" i] img',
    '[class*="gallery" i] img',
    '[id*="gallery" i] img',
    'img[class*="product" i]',
    'img[id*="product" i]',
    'img[class*="gallery" i]',
    'img[id*="gallery" i]',
  ].join(", ");

  $(selector).each((_, element) => {
    if (collected.images.length >= IMAGE_LIMIT) return false;
    const node = $(element);
    const hint = `${node.attr("class") || ""} ${node.attr("id") || ""} ${node.attr("alt") || ""}`;
    if (/logo|icon|sprite|avatar|badge|payment|flag/i.test(hint)) return;
    const src =
      node.attr("src") ||
      node.attr("data-src") ||
      (node.attr("data-srcset") || node.attr("srcset") || "").split(",")[0]?.trim().split(" ")[0];
    if (src) addImage(collected, src, baseUrl);
    return undefined;
  });
}

function parseDescriptionsDom($: CheerioAPI, collected: Collected): void {
  let added = 0;
  $("main p, article p, [class*='description' i] p, [class*='product' i] p").each((_, element) => {
    if (added >= 2 || collected.descriptions.length >= DESCRIPTION_LIMIT) return false;
    const text = cleanInline($(element).text(), 1800);
    if (text.length < 100) return;
    if (/cookie|newsletter|privacy policy|terms|delivery|returns|all rights reserved/i.test(text)) {
      return;
    }
    addDescription(collected, text);
    added += 1;
    return undefined;
  });
}

export function parseProductHtml(
  html: string,
  baseUrl: string,
  defaultCurrency: string,
): {
  candidates: ScrapeCandidates;
  availability: boolean | null;
  currency: string | null;
  hadProductData: boolean;
} {
  const $ = cheerio.load(html);
  const collected: Collected = {
    titles: [],
    descriptions: [],
    images: [],
    prices: [],
    availability: null,
    currency: null,
    productSeen: false,
    siteName: metaContent($, 'meta[property="og:site_name"]'),
  };

  parseJsonLd($, collected, baseUrl);

  const ogTitle = metaContent($, 'meta[property="og:title"]', 'meta[name="twitter:title"]');
  const ogDescription = metaContent(
    $,
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  );
  const ogType = metaContent($, 'meta[property="og:type"]');
  const currency =
    metaContent(
      $,
      'meta[property="product:price:currency"]',
      'meta[property="og:price:currency"]',
      'meta[itemprop="priceCurrency"]',
    ) ||
    collected.currency ||
    defaultCurrency;

  if (/^[A-Z]{3}$/i.test(currency)) collected.currency = currency.toUpperCase();
  const pageCurrency = collected.currency || defaultCurrency;

  if (ogTitle) {
    const cleaned = stripSiteSuffix(ogTitle, collected.siteName);
    addUnique(collected.titles, cleaned, TITLE_LIMIT);
    if (cleaned !== cleanInline(ogTitle, 300)) addUnique(collected.titles, ogTitle, TITLE_LIMIT);
  }

  const h1 = $("h1").first().text();
  if (h1) addUnique(collected.titles, h1, TITLE_LIMIT);

  const documentTitle = $("title").first().text();
  if (documentTitle) {
    addUnique(collected.titles, stripSiteSuffix(documentTitle, collected.siteName), TITLE_LIMIT);
    addUnique(collected.titles, cleanInline(documentTitle, 300), TITLE_LIMIT);
  }

  if (ogDescription) addDescription(collected, ogDescription);

  $('meta[property="og:image"], meta[property="og:image:secure_url"], meta[name="twitter:image"], link[rel="image_src"]').each(
    (_, element) => {
      const value = $(element).attr("content") || $(element).attr("href");
      if (value) addImage(collected, value, baseUrl);
    },
  );

  const ogPrice = metaContent(
    $,
    'meta[property="product:price:amount"]',
    'meta[property="og:price:amount"]',
  );
  if (ogPrice) {
    if (new RegExp(`(?:${SYMBOL_RE}|${CODE_RE})`, "i").test(ogPrice)) {
      moneyFromText(ogPrice, pageCurrency, collected);
    } else {
      addBarePrice(ogPrice, pageCurrency, collected);
    }
  }

  const ogAvailability = metaContent(
    $,
    'meta[property="product:availability"]',
    'meta[property="og:availability"]',
  );
  if (collected.availability == null && ogAvailability) {
    collected.availability = availabilityValue(ogAvailability);
  }

  parseMicrodata($, collected, baseUrl);
  parseDomPrices($, collected, pageCurrency);
  parseImagesDom($, collected, baseUrl);
  parseDescriptionsDom($, collected);

  $("[class*='stock' i], [id*='stock' i], [class*='availab' i]").each((_, element) => {
    if (collected.availability != null) return false;
    const text = $(element).text().toLowerCase().slice(0, 300);
    const value = availabilityValue(text);
    if (value != null) collected.availability = value;
    return undefined;
  });

  const priceCandidates: PriceCandidate[] = collected.prices
    .slice(0, PRICE_LIMIT)
    .map((price) => ({
      value: price.cents,
      currency: price.currency,
      label: formatPrice(price.cents, price.currency),
    }));

  const hadProductData =
    collected.productSeen ||
    priceCandidates.length > 0 ||
    (ogType || "").toLowerCase().includes("product") ||
    $('[itemtype*="Product"]').length > 0;

  return {
    candidates: {
      title: collected.titles.slice(0, TITLE_LIMIT),
      description: collected.descriptions.slice(0, DESCRIPTION_LIMIT),
      price: priceCandidates,
      image: collected.images.slice(0, IMAGE_LIMIT),
    },
    availability: collected.availability,
    currency: collected.currency,
    hadProductData,
  };
}

export function detectSiteDomain(url: string): string | null {
  return siteDomain(url);
}
