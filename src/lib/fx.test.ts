import { describe, expect, it } from "vitest";
import { accentStyle, normalizeAccentColor } from "./accent";
import {
  approximateCents,
  convertCents,
  normalizeCurrency,
  type ExchangeRates,
} from "./fx";
import { displayUrl } from "./urls";

const rates: ExchangeRates = {
  base: "GBP",
  rates: { GBP: 1, USD: 1.25, EUR: 1.2 },
  fetchedAt: "2026-01-01T00:00:00.000Z",
  providerDate: "2026-01-01",
};

describe("currency conversion", () => {
  it("converts through the GBP base", () => {
    expect(convertCents(3599, "USD", "GBP", rates)).toBe(2879);
    expect(convertCents(1000, "GBP", "USD", rates)).toBe(1250);
    expect(convertCents(1000, "GBP", "GBP", null)).toBe(1000);
  });

  it("returns null when a rate is unavailable", () => {
    expect(convertCents(1000, "JPY", "GBP", rates)).toBeNull();
  });

  it("only shows an approximation for a different currency", () => {
    expect(approximateCents(1000, "GBP", "GBP", rates)).toBeNull();
    expect(approximateCents(1250, "USD", "GBP", rates)).toBe(1000);
  });

  it("normalizes currency codes", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("nope")).toBe("GBP");
  });
});

describe("accent colours", () => {
  it("normalizes and builds scoped CSS variables", () => {
    expect(normalizeAccentColor("#ABC")).toBe("#aabbcc");
    const style = accentStyle("#ab274a") as Record<string, string>;
    expect(style["--accent"]).toBe("171 39 74");
    expect(style["--accent-ink"]).toBe("255 255 255");
  });

  it("uses dark ink on a light accent", () => {
    const style = accentStyle("#ffe066") as Record<string, string>;
    expect(style["--accent-ink"]).toBe("36 30 26");
  });
});

describe("display URLs", () => {
  it("removes query parameters and referral path segments", () => {
    expect(
      displayUrl("https://www.amazon.co.uk/dp/B000/ref=sr_1_1?tag=affiliate&utm_source=x#top"),
    ).toBe("https://www.amazon.co.uk/dp/B000");
    expect(displayUrl("https://example.com/product?id=12")).toBe(
      "https://example.com/product",
    );
  });
});
