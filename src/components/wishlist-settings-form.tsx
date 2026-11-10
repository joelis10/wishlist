"use client";

import { useActionState } from "react";
import { updateWishlistAction } from "@/app/actions/wishlists";
import type { Wishlist } from "@/lib/wishlists";
import { FormMessage } from "./form-message";
import { ImageField } from "./image-field";
import { SubmitButton } from "./submit-button";

export function WishlistSettingsForm({ wishlist }: { wishlist: Wishlist }) {
  const [state, action] = useActionState(updateWishlistAction, {});

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
