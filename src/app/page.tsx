import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { listOwnedWishlists } from "@/lib/wishlists";
import { WishlistCard } from "@/components/wishlist-card";
import { GiftIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "My wishlists" };

export default async function HomePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/shared");

  const wishlists = listOwnedWishlists(viewer.id);

  return (
    <div className="container-page pb-20 pt-10 sm:pt-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h1 className="text-3xl sm:text-4xl">My wishlists</h1>
        <Link href="/w/new" className="btn btn-primary btn-sm">
          <PlusIcon className="size-4" />
          New
        </Link>
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
          <h2 className="text-xl">Nothing here yet</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Start a wishlist for a birthday, a holiday, or no reason at all.
          </p>
          <Link href="/w/new" className="btn btn-primary mt-5">
            <PlusIcon className="size-4" />
            Create a wishlist
          </Link>
        </div>
      )}
    </div>
  );
}
