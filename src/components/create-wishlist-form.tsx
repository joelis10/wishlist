"use client";

import Link from "next/link";
import { useActionState } from "react";
import { createWishlistAction } from "@/app/actions/wishlists";
import { FormMessage } from "./form-message";
import { ImageField } from "./image-field";
import { SubmitButton } from "./submit-button";

export function CreateWishlistForm() {
  const [state, action] = useActionState(createWishlistAction, {});

  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="title" className="label">
          Title
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={120}
          autoFocus
          className="input"
          placeholder="Birthday list"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description <span className="font-normal">(optional)</span>
        </label>
        <textarea id="description" name="description" rows={3} maxLength={2000} className="input" />
      </div>

      <ImageField />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="endDate" className="label">
            End date <span className="font-normal">(optional)</span>
          </label>
          <input id="endDate" type="date" name="endDate" className="input" />
        </div>
        <div>
          <label htmlFor="recurrence" className="label">
            Repeats
          </label>
          <select id="recurrence" name="recurrence" className="input" defaultValue="none">
            <option value="none">Does not repeat</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      </div>

      <FormMessage state={state} />

      <div className="flex items-center gap-3 pt-1">
        <SubmitButton className="btn btn-primary" pendingText="Creating…">
          Create wishlist
        </SubmitButton>
        <Link href="/wishlists" className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
