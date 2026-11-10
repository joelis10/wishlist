import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { listMyWishlists } from "@/lib/wishlists";
import { GiftIcon, PlusIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export const metadata = { title: "Add item" };

type PageProps = { searchParams: Promise<{ url?: string | string[] }> };

export default async function AddPickerPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const url = typeof query.url === "string" ? query.url.slice(0, 2000) : "";
  const nextPath = `/add${url ? `?url=${encodeURIComponent(url)}` : ""}`;
  const viewer = await requireViewer(nextPath);
  const wishlists = listMyWishlists(viewer.id);

  if (wishlists.length === 1 && url) {
    redirect(`/w/${wishlists[0].id}/add?url=${encodeURIComponent(url)}`);
  }

  const suffix = url ? `?url=${encodeURIComponent(url)}` : "";

  return (
    <div className="container-page max-w-xl pb-20 pt-10 sm:pt-14">
      <h1 className="mb-6 text-3xl">Choose a wishlist</h1>

      {wishlists.length > 0 ? (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {wishlists.map((wishlist) => (
            <li key={wishlist.id}>
              <Link
                href={`/w/${wishlist.id}/add${suffix}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 transition hover:bg-raised"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{wishlist.title}</span>
                  <span className="block text-xs text-muted">
                    {wishlist.itemCount} {wishlist.itemCount === 1 ? "item" : "items"} · by{" "}
                    {wishlist.ownerUsername}
                  </span>
                </span>
                <span className="shrink-0 text-muted">→</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <GiftIcon className="mb-4 size-8 text-muted/60" />
          <p className="text-sm text-muted">You need a wishlist first.</p>
          <Link href="/w/new" className="btn btn-primary mt-4">
            <PlusIcon className="size-4" />
            New wishlist
          </Link>
        </div>
      )}
    </div>
  );
}
