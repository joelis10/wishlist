export function claimsCookieName(wishlistId: number): string {
  return `wishlist_claims_${wishlistId}`;
}

export function claimsCookiePath(slug: string): string {
  return `/w/${slug}`;
}

export type ClaimsMode = "owner" | "guest" | "unknown";

export function claimsModeFromCookie(
  value: string | undefined,
  isOwner: boolean,
): ClaimsMode {
  if (isOwner) return "owner";
  if (value === "guest") return "guest";
  if (value === "owner") return "owner";
  return "unknown";
}
