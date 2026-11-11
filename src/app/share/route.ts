import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { config } from "@/lib/env";
import { getWishlist, getWishlistAccess } from "@/lib/wishlists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function extractUrl(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s<>"']+/i);
  return match ? match[0] : null;
}

export async function GET(request: NextRequest) {
  const sharedUrl =
    extractUrl(request.nextUrl.searchParams.get("url")) ||
    extractUrl(request.nextUrl.searchParams.get("text")) ||
    extractUrl(request.nextUrl.searchParams.get("title"));

  const redirectTo = (pathname: string) =>
    NextResponse.redirect(new URL(pathname, config.appUrl));

  const target = sharedUrl
    ? `/share?url=${encodeURIComponent(sharedUrl)}`
    : "/add";

  const viewer = await getViewer();
  if (!viewer) {
    return redirectTo(`/login?next=${encodeURIComponent(target)}`);
  }

  if (viewer.defaultWishlistId) {
    const access = getWishlistAccess(viewer.defaultWishlistId, viewer.id);
    const wishlist = getWishlist(viewer.defaultWishlistId);
    if (access?.canEditItems && wishlist) {
      const suffix = sharedUrl ? `?url=${encodeURIComponent(sharedUrl)}` : "";
      return redirectTo(`/w/${wishlist.slug}/add${suffix}`);
    }
  }

  return redirectTo(sharedUrl ? `/add?url=${encodeURIComponent(sharedUrl)}` : "/add");
}
