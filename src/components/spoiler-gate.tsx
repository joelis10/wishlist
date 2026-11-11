"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { claimsCookieName, claimsCookiePath } from "@/lib/claims";
import { Modal } from "./modal";

export function SpoilerGate({
  wishlistId,
  wishlistSlug,
}: {
  wishlistId: number;
  wishlistSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  function choose(mode: "owner" | "guest") {
    document.cookie = `${claimsCookieName(wishlistId)}=${mode}; path=${claimsCookiePath(
      wishlistSlug,
    )}; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Is this your wishlist?"
      size="sm"
      dismissible={false}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={() => choose("owner")}>
            Yes, hide claims
          </button>
          <button type="button" className="btn btn-primary" onClick={() => choose("guest")}>
            No, show claims
          </button>
        </div>
      }
    >
      <p className="pb-2 text-sm leading-relaxed text-muted">
        If it is yours, we will hide which items have been claimed so nothing is spoiled. If you
        are buying from it, claims stay visible.
      </p>
    </Modal>
  );
}
