import { cookies } from "next/headers";
import type { Viewer } from "./auth";
import { getDb, getSetting, setSetting } from "./db";
import { config } from "./env";
import {
  CURRENCY_COOKIE,
  normalizeCurrency,
  type ExchangeRates,
} from "./fx";
import { CURRENCIES } from "./money";

const RATES_KEY = "fx_rates";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type GlobalWithFx = typeof globalThis & {
  __wishlistFxRefresh?: Promise<ExchangeRates>;
};

export function getExchangeRates(): ExchangeRates | null {
  const raw = getSetting(RATES_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ExchangeRates;
    if (parsed.base !== "GBP" || !parsed.rates || typeof parsed.rates !== "object") return null;
    if (!Number.isFinite(parsed.rates.GBP) || parsed.rates.GBP !== 1) return null;
    if (!parsed.fetchedAt || Number.isNaN(Date.parse(parsed.fetchedAt))) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getPreferredCurrency(viewer: Viewer | null = null): Promise<string> {
  if (viewer) return normalizeCurrency(viewer.preferredCurrency);
  const cookieStore = await cookies();
  return normalizeCurrency(cookieStore.get(CURRENCY_COOKIE)?.value);
}

async function fetchRates(): Promise<ExchangeRates> {
  const targets = CURRENCIES.filter((currency) => currency !== "GBP");
  const url = new URL("https://api.frankfurter.dev/v1/latest");
  url.searchParams.set("from", "GBP");
  url.searchParams.set("to", targets.join(","));

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
    headers: {
      Accept: "application/json",
      "User-Agent": "Wishlist/1.0 exchange-rate refresh",
    },
  });
  if (!response.ok) throw new Error(`Exchange-rate service returned ${response.status}.`);

  const payload = (await response.json()) as {
    base?: string;
    date?: string;
    rates?: Record<string, unknown>;
  };
  if (payload.base !== "GBP" || !payload.rates) {
    throw new Error("Exchange-rate service returned an unexpected response.");
  }

  const rates: Record<string, number> = { GBP: 1 };
  for (const currency of targets) {
    const value = Number(payload.rates[currency]);
    if (Number.isFinite(value) && value > 0) rates[currency] = value;
  }
  if (Object.keys(rates).length < 2) {
    throw new Error("Exchange-rate service did not return any usable rates.");
  }

  const data: ExchangeRates = {
    base: "GBP",
    rates,
    fetchedAt: new Date().toISOString(),
    providerDate: typeof payload.date === "string" ? payload.date : null,
  };
  setSetting(RATES_KEY, JSON.stringify(data));
  return data;
}

export function refreshExchangeRates(): Promise<ExchangeRates> {
  const g = globalThis as GlobalWithFx;
  if (g.__wishlistFxRefresh) return g.__wishlistFxRefresh;

  const promise = fetchRates().finally(() => {
    g.__wishlistFxRefresh = undefined;
  });
  g.__wishlistFxRefresh = promise;
  return promise;
}

export async function refreshExchangeRatesIfStale(): Promise<boolean> {
  const current = getExchangeRates();
  if (current) {
    const age = Date.now() - Date.parse(current.fetchedAt);
    if (Number.isFinite(age) && age >= 0 && age < MAX_AGE_MS) return false;
  }
  await refreshExchangeRates();
  return true;
}

export function currencyCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export function savePreferredCurrency(userId: number, currency: string): void {
  getDb()
    .prepare("UPDATE users SET preferred_currency = ? WHERE id = ?")
    .run(normalizeCurrency(currency), userId);
}
