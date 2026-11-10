import { describe, expect, it } from "vitest";
import {
  ebayItemToResult,
  extractEbayItemId,
  isEbayUrl,
  marketplaceForUrl,
} from "./ebay";

describe("eBay URL handling", () => {
  it("recognises eBay URLs", () => {
    expect(isEbayUrl("https://www.ebay.co.uk/itm/305198934237")).toBe(true);
    expect(isEbayUrl("https://www.ebay.com/itm/123456789012")).toBe(true);
    expect(isEbayUrl("https://example.com/itm/305198934237")).toBe(false);
  });

  it("extracts legacy item IDs", () => {
    expect(extractEbayItemId("https://www.ebay.co.uk/itm/305198934237")).toBe(
      "305198934237",
    );
    expect(
      extractEbayItemId("https://www.ebay.co.uk/itm/USB-Fan-Controller/305198934237?hash=x"),
    ).toBe("305198934237");
    expect(extractEbayItemId("https://www.ebay.co.uk/itm/item?itemid=305198934237")).toBe(
      "305198934237",
    );
    expect(extractEbayItemId("https://www.ebay.co.uk/itm/not-an-id")).toBeNull();
  });

  it("chooses the marketplace from the URL", () => {
    expect(marketplaceForUrl("https://www.ebay.co.uk/itm/1")).toBe("EBAY_GB");
    expect(marketplaceForUrl("https://www.ebay.com/itm/1")).toBe("EBAY_US");
    expect(marketplaceForUrl("https://www.ebay.de/itm/1")).toBe("EBAY_DE");
  });
});

describe("eBay Browse API results", () => {
  it("maps titles, HTML descriptions, prices and images", () => {
    const result = ebayItemToResult("https://www.ebay.co.uk/itm/305198934237", {
      title: "Vintage fan controller &amp; sensor",
      shortDescription: "<p>Nice &amp; tested controller.</p>",
      itemWebUrl: "https://www.ebay.co.uk/itm/305198934237",
      image: { imageUrl: "https://i.ebayimg.com/images/g/a/s-l1600.jpg" },
      additionalImages: [{ imageUrl: "https://i.ebayimg.com/images/g/b/s-l1600.jpg" }],
      price: { value: "42.50", currency: "GBP" },
      estimatedAvailabilities: [{ estimatedAvailabilityStatus: "IN_STOCK" }],
    });

    expect(result.candidates.title[0]).toBe("Vintage fan controller & sensor");
    expect(result.candidates.description[0]).toBe("Nice & tested controller.");
    expect(result.candidates.price[0]).toMatchObject({ value: 4250, currency: "GBP" });
    expect(result.candidates.image.map((image) => image.url)).toEqual([
      "https://i.ebayimg.com/images/g/a/s-l1600.jpg",
      "https://i.ebayimg.com/images/g/b/s-l1600.jpg",
    ]);
    expect(result.candidates.image[0]?.title).toBe("Vintage fan controller & sensor");
    expect(result.availability).toBe(true);
    expect(result.hadProductData).toBe(true);
  });

  it("detects out-of-stock items", () => {
    const result = ebayItemToResult("https://www.ebay.co.uk/itm/1", {
      title: "Sold out item",
      estimatedAvailabilities: [{ estimatedAvailabilityStatus: "OUT_OF_STOCK" }],
    });
    expect(result.availability).toBe(false);
  });
});
