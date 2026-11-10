import { describe, expect, it } from "vitest";
import { parseProductHtml } from "./parse";

const jsonLdPage = `
<!doctype html>
<html>
  <head>
    <title>Oak Desk Lamp | Example Store</title>
    <meta property="og:site_name" content="Example Store" />
    <meta property="og:description" content="A warm desk lamp in solid oak." />
    <meta property="og:image" content="/images/lamp.jpg" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "Oak Desk Lamp",
        "description": "A warm desk lamp in solid oak.",
        "image": ["/images/lamp.jpg"],
        "offers": {
          "@type": "AggregateOffer",
          "lowPrice": "49.99",
          "highPrice": "59.99",
          "priceCurrency": "GBP",
          "availability": "https://schema.org/InStock"
        }
      }
    </script>
  </head>
  <body><h1>Oak Desk Lamp</h1></body>
</html>`;

const domPage = `
<!doctype html>
<html>
  <head><title>Wool Scarf</title></head>
  <body>
    <h1>Wool Scarf</h1>
    <div id="product_gallery"><img src="/scarf.jpg" alt="Wool scarf" /></div>
    <span class="price_color">£18.00</span>
    <div class="description"><p>${"Soft lambswool scarf. ".repeat(8)}</p></div>
  </body>
</html>`;

describe("product HTML parsing", () => {
  it("finds structured product details and multiple prices", () => {
    const parsed = parseProductHtml(jsonLdPage, "https://shop.example.com/lamp", "GBP");
    expect(parsed.candidates.title[0]).toBe("Oak Desk Lamp");
    expect(parsed.candidates.description[0]).toContain("solid oak");
    expect(parsed.candidates.image[0]).toBe("https://shop.example.com/images/lamp.jpg");
    expect(parsed.candidates.price.map((price) => price.value)).toEqual(
      expect.arrayContaining([4999, 5999]),
    );
    expect(parsed.availability).toBe(true);
    expect(parsed.hadProductData).toBe(true);
  });

  it("falls back to visible fields and product images", () => {
    const parsed = parseProductHtml(domPage, "https://shop.example.com/scarf", "GBP");
    expect(parsed.candidates.title).toContain("Wool Scarf");
    expect(parsed.candidates.price[0]?.value).toBe(1800);
    expect(parsed.candidates.image[0]).toBe("https://shop.example.com/scarf.jpg");
    expect(parsed.hadProductData).toBe(true);
  });

  it("detects out of stock structured offers", () => {
    const parsed = parseProductHtml(
      jsonLdPage.replace("InStock", "OutOfStock"),
      "https://shop.example.com/lamp",
      "GBP",
    );
    expect(parsed.availability).toBe(false);
  });
});
