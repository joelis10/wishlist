import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { accentStyle } from "@/lib/accent";
import { claimsCookieName, claimsModeFromCookie } from "@/lib/claims";
import { getExchangeRates, getPreferredCurrency } from "@/lib/currency";
import { endDateLabel } from "@/lib/dates";
import { absoluteUrl } from "@/lib/env";
import { listItems } from "@/lib/items";
import { getWishlist, getWishlistAccess } from "@/lib/wishlists";
import { CalendarIcon, PlusIcon, SettingsIcon, UserIcon } from "@/components/icons";
import { ClaimsToggle } from "@/components/claims-toggle";
import { SpoilerGate } from "@/components/spoiler-gate";
import { WishlistItems } from "@/components/wishlist-items";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return { title: "Wishlist" };

  const wishlist = getWishlist(id);
  if (!wishlist) return { title: "Wishlist" };

  const viewer = await getViewer();
  const access = getWishlistAccess(id, viewer?.id ?? null);
  if (!access?.canView) {
    return { title: "Wishlist", robots: { index: false, follow: false } };
  }

  const description = `${wishlist.itemCount} ${
    wishlist.itemCount === 1 ? "item" : "items"
  } · by ${wishlist.ownerUsername}${wishlist.description ? ` — ${wishlist.description}` : ""}`.slice(
    0,
    300,
  );
  const image = wishlist.imagePath ? absoluteUrl(wishlist.imagePath) : absoluteUrl("/og-default.png");
  const imageSize = wishlist.imagePath ? { width: 1600, height: 1000 } : { width: 1200, height: 630 };
  const url = absoluteUrl(`/w/${wishlist.id}`);

  return {
    title: wishlist.title,
    description,
    alternates: { canonical: url },
    robots: { index: wishlist.isPublic, follow: wishlist.isPublic },
    openGraph: {
      type: "website",
      title: wishlist.title,
      description,
      url,
      siteName: "Wishlist",
      images: [{ url: image, ...imageSize, alt: wishlist.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: wishlist.title,
      description,
      images: [image],
    },
  };
}

export default async function WishlistPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) notFound();

  const viewer = await getViewer();
  const access = getWishlistAccess(id, viewer?.id ?? null);
  if (!access?.canView) notFound();

  const wishlist = access.wishlist;
  const items = listItems(wishlist.id);
  const preferredCurrency = await getPreferredCurrency(viewer);
  const rates = getExchangeRates();
  const cookieStore = await cookies();
  const claimsMode = claimsModeFromCookie(
    cookieStore.get(claimsCookieName(wishlist.id))?.value,
    access.isOwner,
  );
  const showClaims = claimsMode === "guest";
  const canClaim = showClaims && !access.isOwner;

  const visibleItems = showClaims
    ? items
    : items.map((item) => ({
        ...item,
        claimedAt: null,
        claimedByUserId: null,
        claimedByName: null,
      }));

  const end = endDateLabel(wishlist.endDate, wishlist.recurrence);
  const ended = end ? end.relative.includes("ago") : false;

  return (
    <div className="container-page pb-20 pt-6 sm:pt-8" style={accentStyle(wishlist.accentColor)}>
      {wishlist.imagePath ? (
        <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-raised sm:w-1/2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={wishlist.imagePath}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        </div>
      ) : null}

      <div className={wishlist.imagePath ? "mt-5" : "mt-1"}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl leading-tight sm:text-4xl">{wishlist.title}</h1>
            {wishlist.description ? (
              <p className="prose-quiet mt-2 max-w-2xl text-[15px]">{wishlist.description}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {access.canEditItems ? (
              <Link href={`/w/${wishlist.id}/add`} className="btn btn-primary btn-sm">
                <PlusIcon className="size-4" />
                Add item
              </Link>
            ) : null}
            {access.isOwner ? (
              <Link
                href={`/w/${wishlist.id}/settings`}
                className="btn btn-secondary btn-sm"
                aria-label="Wishlist settings"
              >
                <SettingsIcon className="size-4" />
                <span className="hidden xs:inline">Settings</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <UserIcon className="size-3.5" />
            by {wishlist.ownerUsername}
          </span>
          {end ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarIcon className="size-3.5" />
              {ended ? "Ended" : "Ends"} {end.date} · {end.relative}
              {end.recurrence !== "none" ? ` · repeats ${end.recurrence}` : ""}
            </span>
          ) : null}
          {!access.isOwner && claimsMode !== "unknown" ? (
            <ClaimsToggle wishlistId={wishlist.id} showClaims={showClaims} />
          ) : null}
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <WishlistItems
          wishlistId={wishlist.id}
          items={visibleItems}
          canEdit={access.canEditItems}
          canClaim={canClaim}
          showClaims={showClaims}
          viewerName={viewer?.username ?? null}
          preferredCurrency={preferredCurrency}
          rates={rates}
        />
      </div>

      {claimsMode === "unknown" && !access.isOwner ? <SpoilerGate wishlistId={wishlist.id} /> : null}
    </div>
  );
}
