import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { readGuestWishlistSlugs } from "@/lib/guest-shares";
import {
  listSharedWithMe,
  listWishlistsBySlugs,
  type SharedWishlist,
  type Wishlist,
} from "@/lib/wishlists";
import { WishlistCard } from "@/components/wishlist-card";
import { GiftIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Shared with me" };

function badgesFor(wishlist: Wishlist | SharedWishlist): string[] {
  if (!("shareKind" in wishlist)) return [];
  if (wishlist.shareKind === "edit") return ["Can edit"];
  if (wishlist.shareKind === "view") return ["Shared"];
  return [];
}

export default async function SharedPage() {
  const viewer = await getViewer();

  let wishlists: (Wishlist | SharedWishlist)[] = [];
  if (viewer) {
    wishlists = listSharedWithMe(viewer.id);
  } else {
    const slugs = await readGuestWishlistSlugs();
    wishlists = listWishlistsBySlugs(slugs);
  }

  return (
    <div className="container-page pb-20 pt-10 sm:pt-14">
      <h1 className="mb-5 text-3xl sm:text-4xl">Shared with me</h1>

      {!viewer ? (
        <p className="mb-7 max-w-xl text-sm leading-relaxed text-muted">
          Saved in this browser only.{" "}
          <Link
            href="/login?next=%2Fshared"
            className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            href="/register?next=%2Fshared"
            className="text-ink underline decoration-line underline-offset-4 hover:decoration-accent"
          >
            create an account
          </Link>{" "}
          to keep these across devices.
        </p>
      ) : null}

      {wishlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => (
            <WishlistCard key={wishlist.id} wishlist={wishlist} badges={badgesFor(wishlist)} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center px-6 py-20 text-center">
          <GiftIcon className="mb-4 size-8 text-muted/60" />
          <p className="text-sm text-muted">
            {viewer
              ? "Wishlists shared with you will appear here."
              : "Open a shared wishlist link and it will appear here."}
          </p>
          {viewer ? (
            <Link href="/" className="btn btn-secondary mt-5">
              Go to my wishlists
            </Link>
          ) : (
            <Link href="/register?next=%2Fshared" className="btn btn-primary mt-5">
              Create an account
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
