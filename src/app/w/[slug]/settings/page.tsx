import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { absoluteUrl } from "@/lib/env";
import { getWishlistAccess, getWishlistBySlug, listShares } from "@/lib/wishlists";
import { deleteWishlistAction } from "@/app/actions/wishlists";
import { ChevronLeftIcon, TrashIcon } from "@/components/icons";
import { ConfirmForm } from "@/components/confirm-form";
import { CopyLink } from "@/components/copy-link";
import { ShareManager } from "@/components/share-manager";
import { WishlistSettingsForm } from "@/components/wishlist-settings-form";
import { accentStyle } from "@/lib/accent";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wishlist settings" };

type PageProps = { params: Promise<{ slug: string }> };

export default async function WishlistSettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const wishlist = getWishlistBySlug(slug);
  if (!wishlist) notFound();

  const viewer = await requireViewer(`/w/${slug}/settings`);
  const access = getWishlistAccess(wishlist.id, viewer.id);
  if (!access?.canManage) notFound();

  const shares = listShares(wishlist.id);

  return (
    <div
      className="container-page max-w-2xl pb-24 pt-8 sm:pt-10"
      style={accentStyle(wishlist.accentColor)}
    >
      <Link href={`/w/${wishlist.slug}`} className="btn btn-ghost btn-sm -ml-2">
        <ChevronLeftIcon className="size-4" />
        {wishlist.title}
      </Link>
      <h1 className="mt-2 text-3xl">Wishlist settings</h1>

      <section className="mt-9 border-t border-line pt-7">
        <h2 className="mb-5 text-xl">Details</h2>
        <WishlistSettingsForm wishlist={wishlist} />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-2 text-xl">Share</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Anyone with this link can view it. Add someone below for a private share.
        </p>
        <CopyLink url={absoluteUrl(`/w/${wishlist.slug}`)} title={wishlist.title} />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-2 text-xl">People</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          Choose whether someone can view or edit items. Only you can change these settings.
        </p>
        <ShareManager wishlistId={wishlist.id} shares={shares} />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-2 text-xl">Delete</h2>
        <p className="mb-4 text-sm text-muted">This removes the wishlist and every item in it.</p>
        <ConfirmForm
          action={deleteWishlistAction}
          hidden={{ wishlistId: wishlist.id }}
          title="Delete this wishlist?"
          description={`“${wishlist.title}” and all of its items will be permanently deleted.`}
          triggerLabel={
            <>
              <TrashIcon className="size-4" />
              Delete wishlist
            </>
          }
        />
      </section>
    </div>
  );
}
