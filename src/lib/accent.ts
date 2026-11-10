import type { CSSProperties } from "react";

export function normalizeAccentColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim().toLowerCase();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(raw)) return null;
  if (raw.length === 4) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }
  return raw;
}

function luminance(r: number, g: number, b: number): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Returns scoped CSS variables for a wishlist's custom accent. */
export function accentStyle(color: string | null | undefined): CSSProperties | undefined {
  const normalized = normalizeAccentColor(color);
  if (!normalized) return undefined;

  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const ink = luminance(r, g, b) > 0.48 ? "36 30 26" : "255 255 255";

  return {
    "--accent": `${r} ${g} ${b}`,
    "--accent-ink": ink,
  } as CSSProperties;
}
