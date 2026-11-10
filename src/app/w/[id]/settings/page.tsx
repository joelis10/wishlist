import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { accentStyle } from "@/lib/accent";
import { absoluteUrl } from "@/lib/env";
import { getWishlistAccess, listCollaborators } from "@/lib/wishlists";
import { deleteWishlistAction, setWishlistPublicAction } from "@/app/actions/wishlists";
import { ChevronLeftIcon, TrashIcon } from "@/components/icons";
import { CollaboratorManager } from "@/components/collaborator-manager";
import { ConfirmForm } from "@/components/confirm-form";
import { CopyLink } from "@/components/copy-link";
import { WishlistSettingsForm } from "@/components/wishlist-settings-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wishlist settings" };

type PageProps = { params: Promise<{ id: string }> };

export default async function WishlistSettingsPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const viewer = await requireViewer(`/w/${id}/settings`);
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) notFound();

  const wishlist = access.wishlist;
  const collaborators = listCollaborators(id);

  return (
    <div
      className="container-page max-w-2xl pb-24 pt-8 sm:pt-10"
      style={accentStyle(wishlist.accentColor)}
    >
      <Link href={`/w/${id}`} className="btn btn-ghost btn-sm -ml-2">
        <ChevronLeftIcon className="size-4" />
        {wishlist.title}
      </Link>
      <h1 className="mt-2 text-3xl">Wishlist settings</h1>

      <section className="mt-9 border-t border-line pt-7">
        <h2 className="mb-5 text-xl">Details</h2>
        <WishlistSettingsForm wishlist={wishlist} />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl">Visibility</h2>
          <span className="chip">{wishlist.isPublic ? "Public" : "Private"}</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          {wishlist.isPublic
            ? "Listed on the browse page. Anyone with the link can view it and claim items."
            : "Only you and people you add can open this wishlist."}
        </p>
        <form action={setWishlistPublicAction}>
          <input type="hidden" name="wishlistId" value={wishlist.id} />
          <input type="hidden" name="isPublic" value={wishlist.isPublic ? "" : "on"} />
          <button type="submit" className="btn btn-secondary btn-sm">
            {wishlist.isPublic ? "Make private" : "Make public"}
          </button>
        </form>

        <div className="mt-5">
          {wishlist.isPublic ? (
            <CopyLink url={absoluteUrl(`/w/${wishlist.id}`)} title={wishlist.title} />
          ) : (
            <p className="text-sm text-muted">
              Make this wishlist public to share a link with guests.
            </p>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-2 text-xl">People</h2>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          People you add can add and edit items, but cannot change these settings.
        </p>
        <CollaboratorManager
          wishlistId={id}
          ownerUsername={wishlist.ownerUsername}
          collaborators={collaborators}
        />
      </section>

      <section className="mt-12 border-t border-line pt-7">
        <h2 className="mb-2 text-xl">Delete</h2>
        <p className="mb-4 text-sm text-muted">
          This removes the wishlist and every item in it.
        </p>
        <ConfirmForm
          action={deleteWishlistAction}
          hidden={{ wishlistId: id }}
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
