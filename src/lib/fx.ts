import { CURRENCIES } from "./money";

export const CURRENCY_COOKIE = "wishlist_currency";

export type ExchangeRates = {
  base: "GBP";
  rates: Record<string, number>;
  fetchedAt: string;
  providerDate: string | null;
};

export function normalizeCurrency(value: unknown): string {
  if (typeof value === "string") {
    const code = value.trim().toUpperCase();
    if (CURRENCIES.includes(code)) return code;
  }
  return "GBP";
}

export function convertCents(
  cents: number,
  fromCurrency: string,
  toCurrency: string,
  data: ExchangeRates | null,
): number | null {
  if (!Number.isFinite(cents)) return null;
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (from === to) return Math.round(cents);
  if (!data) return null;

  const fromRate = data.rates[from];
  const toRate = data.rates[to];
  if (!fromRate || !toRate) return null;
  return Math.round((cents / fromRate) * toRate);
}

export function approximateCents(
  cents: number | null,
  fromCurrency: string,
  preferredCurrency: string,
  data: ExchangeRates | null,
): number | null {
  if (cents == null) return null;
  if (fromCurrency.toUpperCase() === preferredCurrency.toUpperCase()) return null;
  return convertCents(cents, fromCurrency, preferredCurrency, data);
}
