import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { accentStyle } from "@/lib/accent";
import { getItem } from "@/lib/items";
import { getWishlistAccess } from "@/lib/wishlists";
import { deleteItemAction, updateItemAction } from "@/app/actions/items";
import { ChevronLeftIcon, TrashIcon } from "@/components/icons";
import { ConfirmForm } from "@/components/confirm-form";
import { ItemForm } from "@/components/item-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "Edit item" };

type PageProps = {
  params: Promise<{ id: string; itemId: string }>;
};

export default async function EditItemPage({ params }: PageProps) {
  const { id: rawId, itemId: rawItemId } = await params;
  const id = Number(rawId);
  const itemId = Number(rawItemId);
  if (!Number.isInteger(id) || !Number.isInteger(itemId)) notFound();

  const viewer = await requireViewer(`/w/${id}/items/${itemId}/edit`);
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canEditItems) notFound();

  const item = getItem(itemId);
  if (!item || item.wishlistId !== id) notFound();

  return (
    <div
      className="container-page max-w-2xl pb-20 pt-8 sm:pt-10"
      style={accentStyle(access.wishlist.accentColor)}
    >
      <Link href={`/w/${id}`} className="btn btn-ghost btn-sm -ml-2">
        <ChevronLeftIcon className="size-4" />
        {access.wishlist.title}
      </Link>
      <h1 className="mb-6 mt-2 text-3xl">Edit item</h1>

      <ItemForm
        action={updateItemAction}
        wishlistId={id}
        itemId={item.id}
        mode="edit"
        cancelHref={`/w/${id}`}
        claimedByName={item.claimedAt ? item.claimedByName : null}
        defaults={{
          title: item.title,
          url: item.url || "",
          description: item.description || "",
          note: item.note || "",
          price: item.priceCents != null ? (item.priceCents / 100).toFixed(2) : "",
          currency: item.currency,
          imageUrl: item.imageUrl || "",
        }}
      />

      <div className="mt-10 border-t border-line pt-6">
        <ConfirmForm
          action={deleteItemAction}
          hidden={{ wishlistId: id, itemId: item.id }}
          title="Delete this item?"
          description={`“${item.title}” will be removed from the wishlist.`}
          triggerLabel={
            <>
              <TrashIcon className="size-4" />
              Delete item
            </>
          }
        />
      </div>
    </div>
  );
}
