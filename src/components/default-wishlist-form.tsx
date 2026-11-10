"use client";

import { useActionState, useState } from "react";
import { setDefaultWishlistAction } from "@/app/actions/settings";
import type { Wishlist } from "@/lib/wishlists";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";

export function DefaultWishlistForm({
  wishlists,
  currentId,
}: {
  wishlists: Wishlist[];
  currentId: number | null;
}) {
  const [state, action] = useActionState(setDefaultWishlistAction, {});
  const [selected, setSelected] = useState(currentId ? String(currentId) : "none");

  return (
    <form action={action} className="space-y-3">
      <label htmlFor="default-wishlist" className="label">
        Default wishlist
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          id="default-wishlist"
          name="defaultWishlistId"
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="input flex-1"
        >
          <option value="none">No default</option>
          {wishlists.map((wishlist) => (
            <option key={wishlist.id} value={wishlist.id}>
              {wishlist.title}
            </option>
          ))}
        </select>
        <SubmitButton className="btn btn-secondary" pendingText="Saving…">
          Save
        </SubmitButton>
      </div>
      <FormMessage state={state} />
      <p className="text-xs text-muted">Used when a link is shared to Wishlist.</p>
    </form>
  );
}
