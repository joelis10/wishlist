"use client";

import { useEffect, useRef } from "react";
import { rememberWishlistAction } from "@/app/actions/wishlists";

export function RememberWishlist({ slug }: { slug: string }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void rememberWishlistAction(slug);
  }, [slug]);

  return null;
}
