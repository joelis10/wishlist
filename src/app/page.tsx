import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { listPublicWishlists } from "@/lib/wishlists";
import { WishlistCard } from "@/components/wishlist-card";
import { GiftIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [viewer, wishlists] = await Promise.all([getViewer(), Promise.resolve(listPublicWishlists())]);

  return (
    <div className="container-page pb-20 pt-10 sm:pt-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">Wishlists</h1>
        {wishlists.length > 0 ? (
          <p className="pb-1 text-sm text-muted">
            {wishlists.length} {wishlists.length === 1 ? "list" : "lists"}
          </p>
        ) : null}
      </div>

      {wishlists.length > 0 ? (
        <div className="grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {wishlists.map((wishlist) => (
            <WishlistCard key={wishlist.id} wishlist={wishlist} />
          ))}
        </div>
      ) : (
        <div className="card flex flex-col items-center justify-center px-6 py-20 text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-raised text-muted">
            <GiftIcon className="size-5" />
          </span>
          <h2 className="text-xl">No public wishlists yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            {viewer
              ? "Make a wishlist public and it will appear here."
              : "Sign in to create one, or check back later."}
          </p>
          {viewer ? (
            <Link href="/w/new" className="btn btn-primary mt-5">
              <PlusIcon className="size-4" />
              New wishlist
            </Link>
          ) : (
            <Link href="/register" className="btn btn-primary mt-5">
              Create an account
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
