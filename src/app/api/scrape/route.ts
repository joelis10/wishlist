import { NextRequest, NextResponse } from "next/server";
import { getViewer } from "@/lib/auth";
import { getWishlistAccess } from "@/lib/wishlists";
import { normalizeUrlInput } from "@/lib/validation";
import { scrapeProductUrl } from "@/lib/scraper";
import { ScrapeError } from "@/lib/scraper/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { config } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (!checkRateLimit(`scrape:${viewer.id}`, 15, 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  let body: { wishlistId?: number; url?: string };
  try {
    body = (await request.json()) as { wishlistId?: number; url?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const wishlistId = Number(body.wishlistId);
  const access = getWishlistAccess(wishlistId, viewer.id);
  if (!access?.canEditItems) {
    return NextResponse.json({ error: "You cannot add items to this wishlist." }, { status: 403 });
  }

  const rawUrl = typeof body.url === "string" ? body.url.trim().slice(0, 2000) : "";
  if (!rawUrl) return NextResponse.json({ error: "Paste an item link first." }, { status: 400 });

  let url: string;
  try {
    url = normalizeUrlInput(rawUrl);
  } catch {
    return NextResponse.json({ error: "That link is not valid." }, { status: 400 });
  }

  try {
    const result = await scrapeProductUrl(url, { mode: config.scrape.headless });
    return NextResponse.json({ result });
  } catch (error) {
    if (error instanceof ScrapeError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error("[scrape]", error);
    return NextResponse.json(
      { error: "That page could not be read. You can enter the details manually." },
      { status: 500 },
    );
  }
}
