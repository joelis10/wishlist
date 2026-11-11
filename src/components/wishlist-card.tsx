import Link from "next/link";
import type { Wishlist } from "@/lib/wishlists";
import { GiftIcon } from "./icons";

export function WishlistCard({
  wishlist,
  badges = [],
}: {
  wishlist: Wishlist;
  badges?: string[];
}) {
  return (
    <Link
      href={`/w/${wishlist.slug}`}
      className="group block transition-transform duration-200 ease-out hover:-translate-y-0.5"
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-line bg-raised transition-shadow duration-200 group-hover:shadow-lift">
        {wishlist.imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={wishlist.imagePath}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgb(var(--accent)/0.13),transparent_55%)] text-accent/40">
            <GiftIcon className="size-10" strokeWidth={1.2} />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 pt-3.5">
        <div className="min-w-0">
          <h2 className="truncate text-lg leading-snug group-hover:text-accent">{wishlist.title}</h2>
          <p className="mt-0.5 truncate text-[13px] text-muted">
            {wishlist.itemCount} {wishlist.itemCount === 1 ? "item" : "items"} · by{" "}
            {wishlist.ownerUsername}
          </p>
        </div>
        {badges.length > 0 ? (
          <div className="flex shrink-0 gap-1 pt-1">
            {badges.map((badge) => (
              <span key={badge} className="chip">
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
