import { describe, expect, it } from "vitest";
import { formatPrice } from "./money";
import { normalizeUrlInput, parsePriceToCents, siteDomain } from "./validation";

describe("validation helpers", () => {
  it("extracts the main domain", () => {
    expect(siteDomain("https://www.amazon.co.uk/dp/B000?tag=x")).toBe("amazon.co.uk");
    expect(siteDomain("https://smile.amazon.co.uk/dp/B000")).toBe("amazon.co.uk");
    expect(siteDomain("https://books.toscrape.com/a.html")).toBe("toscrape.com");
    expect(siteDomain("not a url")).toBeNull();
  });

  it("normalizes links without a scheme", () => {
    expect(normalizeUrlInput("example.com/item")).toBe("https://example.com/item");
    expect(() => normalizeUrlInput("ftp://example.com/file")).toThrow();
  });

  it("parses prices into cents", () => {
    expect(parsePriceToCents("12.50")).toBe(1250);
    expect(parsePriceToCents("12,50")).toBe(1250);
    expect(parsePriceToCents("")).toBeNull();
    expect(parsePriceToCents("-1")).toBeNull();
  });

  it("formats currencies", () => {
    expect(formatPrice(5177, "GBP")).toContain("51.77");
    expect(formatPrice(null, "GBP")).toBe("");
  });
});
