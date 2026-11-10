import { describe, expect, it } from "vitest";
import { normalizeTheme } from "./theme-shared";

describe("theme preference", () => {
  it("accepts the supported values and defaults to system", () => {
    expect(normalizeTheme("light")).toBe("light");
    expect(normalizeTheme("dark")).toBe("dark");
    expect(normalizeTheme("system")).toBe("system");
    expect(normalizeTheme("blue")).toBe("system");
    expect(normalizeTheme(null)).toBe("system");
  });
});
