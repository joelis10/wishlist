import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { ChevronLeftIcon } from "@/components/icons";
import { CreateWishlistForm } from "@/components/create-wishlist-form";

export const dynamic = "force-dynamic";

export const metadata = { title: "New wishlist" };

export default async function NewWishlistPage() {
  await requireViewer("/w/new");

  return (
    <div className="container-page max-w-2xl pb-20 pt-8 sm:pt-10">
      <Link href="/wishlists" className="btn btn-ghost btn-sm -ml-2">
        <ChevronLeftIcon className="size-4" />
        My wishlists
      </Link>
      <h1 className="mb-6 mt-2 text-3xl">New wishlist</h1>
      <CreateWishlistForm />
    </div>
  );
}
