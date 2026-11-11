import { cookies } from "next/headers";
import { config } from "./env";
import { isShareSlug } from "./slugs";
import {
  getWishlistBySlug,
  saveWishlistForUser,
} from "./wishlists";

const COOKIE = "guest_shared_wishlists";
const MAX_SLUGS = 50;

export async function readGuestWishlistSlugs(): Promise<string[]> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => isShareSlug(value))
    .slice(0, MAX_SLUGS);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}

export async function addGuestWishlistSlug(slug: string): Promise<void> {
  if (!isShareSlug(slug)) return;
  const slugs = await readGuestWishlistSlugs();
  if (slugs.includes(slug)) return;
  const next = [slug, ...slugs].slice(0, MAX_SLUGS);
  const store = await cookies();
  store.set(COOKIE, next.join(","), cookieOptions());
}

export async function clearGuestWishlistSlugs(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function migrateGuestWishlistSaves(userId: number): Promise<void> {
  const slugs = await readGuestWishlistSlugs();
  if (slugs.length === 0) return;

  for (const slug of slugs) {
    const wishlist = getWishlistBySlug(slug);
    if (!wishlist || wishlist.ownerId === userId) continue;
    saveWishlistForUser(userId, wishlist.id);
  }
  await clearGuestWishlistSlugs();
}
