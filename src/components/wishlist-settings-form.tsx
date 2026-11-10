"use client";

import { useActionState, useState } from "react";
import { updateWishlistAction } from "@/app/actions/wishlists";
import type { Wishlist } from "@/lib/wishlists";
import { FormMessage } from "./form-message";
import { ImageField } from "./image-field";
import { SubmitButton } from "./submit-button";

export function WishlistSettingsForm({ wishlist }: { wishlist: Wishlist }) {
  const [state, action] = useActionState(updateWishlistAction, {});
  const [useDefaultAccent, setUseDefaultAccent] = useState(!wishlist.accentColor);
  const [accentColor, setAccentColor] = useState(wishlist.accentColor || "#ab274a");

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="wishlistId" value={wishlist.id} />

      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          className="input"
          defaultValue={wishlist.title}
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          className="input"
          defaultValue={wishlist.description || ""}
        />
      </div>

      <ImageField initialPath={wishlist.imagePath} allowRemove />

      <div>
        <span className="label">Accent colour</span>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="accentColor"
            type="color"
            name="accentColor"
            value={accentColor}
            onChange={(event) => {
              setAccentColor(event.target.value);
              setUseDefaultAccent(false);
            }}
            aria-label="Accent colour"
            className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1"
          />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              name="useDefaultAccent"
              checked={useDefaultAccent}
              onChange={(event) => setUseDefaultAccent(event.target.checked)}
              className="size-4 rounded border-line accent-[rgb(var(--accent))]"
            />
            Use the default accent
          </label>
        </div>
        <p className="mt-1.5 text-xs text-muted">Used for buttons and highlights on this wishlist.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="endDate" className="label">
            End date <span className="font-normal">(optional)</span>
          </label>
          <input
            id="endDate"
            type="date"
            name="endDate"
            className="input"
            defaultValue={wishlist.endDate || ""}
          />
        </div>
        <div>
          <label htmlFor="recurrence" className="label">
            Repeats
          </label>
          <select
            id="recurrence"
            name="recurrence"
            className="input"
            defaultValue={wishlist.recurrence}
          >
            <option value="none">Does not repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <FormMessage state={state} />

      <SubmitButton className="btn btn-primary" pendingText="Saving…">
        Save changes
      </SubmitButton>
    </form>
  );
}
