"use client";

import { useRouter } from "next/navigation";
import { claimsCookieName, claimsCookiePath } from "@/lib/claims";

export function ClaimsToggle({
  wishlistId,
  wishlistSlug,
  showClaims,
}: {
  wishlistId: number;
  wishlistSlug: string;
  showClaims: boolean;
}) {
  const router = useRouter();

  function toggle() {
    document.cookie = `${claimsCookieName(wishlistId)}=${
      showClaims ? "owner" : "guest"
    }; path=${claimsCookiePath(wishlistSlug)}; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="text-[13px] text-muted underline decoration-line underline-offset-4 transition hover:text-ink hover:decoration-accent"
    >
      {showClaims ? "Hide claims" : "Show claims"}
    </button>
  );
}
