import { cookies } from "next/headers";
import type { Viewer } from "./auth";
import { getDb } from "./db";
import { config } from "./env";
import { THEME_COOKIE, normalizeTheme, type ThemePreference } from "./theme-shared";

export async function getPreferredTheme(viewer: Viewer | null = null): Promise<ThemePreference> {
  if (viewer) return normalizeTheme(viewer.theme);
  const cookieStore = await cookies();
  return normalizeTheme(cookieStore.get(THEME_COOKIE)?.value);
}

export function themeCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export function savePreferredTheme(userId: number, theme: ThemePreference): void {
  getDb().prepare("UPDATE users SET theme = ? WHERE id = ?").run(normalizeTheme(theme), userId);
}
