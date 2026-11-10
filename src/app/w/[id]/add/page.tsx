import Link from "next/link";
import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { getWishlistAccess } from "@/lib/wishlists";
import { AddItemFlow } from "@/components/add-item-flow";
import { ChevronLeftIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add item" };

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ url?: string | string[] }>;
};

export default async function AddItemPage({ params, searchParams }: PageProps) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const query = await searchParams;
  const initialUrl = typeof query.url === "string" ? query.url.slice(0, 2000) : "";
  const nextPath = `/w/${id}/add${initialUrl ? `?url=${encodeURIComponent(initialUrl)}` : ""}`;

  const viewer = await requireViewer(nextPath);
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canEditItems) notFound();

  return (
    <div className="container-page max-w-2xl pb-20 pt-8 sm:pt-10">
      <Link href={`/w/${id}`} className="btn btn-ghost btn-sm -ml-2">
        <ChevronLeftIcon className="size-4" />
        {access.wishlist.title}
      </Link>
      <h1 className="mb-6 mt-2 text-3xl">Add item</h1>
      <AddItemFlow wishlistId={id} initialUrl={initialUrl} />
    </div>
  );
}
