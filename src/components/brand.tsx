import Link from "next/link";
import { GiftIcon } from "./icons";

export function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 text-ink" aria-label="Wishlist home">
      <span className="flex size-8 items-center justify-center rounded-xl bg-accent text-accent-ink transition-transform duration-200 group-hover:-rotate-3">
        <GiftIcon className="size-[18px]" />
      </span>
      <span className="hidden font-serif text-xl tracking-tight min-[360px]:inline">wishlist</span>
    </Link>
  );
}
