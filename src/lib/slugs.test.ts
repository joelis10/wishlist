import { describe, expect, it } from "vitest";
import { generateShareSlug, isShareSlug } from "./slugs";

describe("wishlist share slugs", () => {
  it("generates URL-safe random slugs", () => {
    const slug = generateShareSlug();
    expect(slug).toHaveLength(13);
    expect(isShareSlug(slug)).toBe(true);
    expect(slug).not.toBe(generateShareSlug());
  });

  it("rejects numeric or malformed slugs", () => {
    expect(isShareSlug("1")).toBe(false);
    expect(isShareSlug("123456789012")).toBe(false);
    expect(isShareSlug("not a slug")).toBe(false);
  });
});
