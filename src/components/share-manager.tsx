"use client";

import { useActionState, useEffect, useRef } from "react";
import { removeShareAction, shareWishlistAction } from "@/app/actions/wishlists";
import type { WishlistShare } from "@/lib/wishlists";
import { FormMessage } from "./form-message";
import { SubmitButton } from "./submit-button";
import { XIcon } from "./icons";

type Props = {
  wishlistId: number;
  shares: WishlistShare[];
};

export function ShareManager({ wishlistId, shares }: Props) {
  const [state, action] = useActionState(shareWishlistAction, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-4">
      {shares.length > 0 ? (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {shares.map((person) => (
            <li key={person.userId} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{person.username}</p>
                <p className="text-xs text-muted">
                  {person.permission === "edit" ? "Can edit items" : "View only"}
                </p>
              </div>
              <form action={removeShareAction}>
                <input type="hidden" name="wishlistId" value={wishlistId} />
                <input type="hidden" name="userId" value={person.userId} />
                <button
                  type="submit"
                  className="rounded-full p-2 text-danger/80 transition hover:bg-danger/10 hover:text-danger"
                  aria-label={`Remove ${person.username}`}
                >
                  <XIcon className="size-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">This wishlist has not been shared with anyone directly.</p>
      )}

      <form ref={formRef} action={action} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto]">
        <input type="hidden" name="wishlistId" value={wishlistId} />
        <input
          name="username"
          required
          maxLength={32}
          className="input"
          placeholder="Username"
          aria-label="Username to share with"
          autoCapitalize="none"
        />
        <select name="permission" className="input" aria-label="Permission" defaultValue="view">
          <option value="view">View only</option>
          <option value="edit">Can edit</option>
        </select>
        <SubmitButton className="btn btn-secondary" pendingText="Sharing…">
          Share
        </SubmitButton>
      </form>
      <FormMessage state={state} />
    </div>
  );
}
