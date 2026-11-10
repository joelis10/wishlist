"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { CURRENCIES } from "@/lib/money";
import { FormMessage } from "./form-message";
import { ImageIcon } from "./icons";
import { SubmitButton } from "./submit-button";

export type ItemFormDefaults = {
  title: string;
  url: string;
  description: string;
  note: string;
  price: string;
  currency: string;
  imageUrl: string;
};

type Props = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  wishlistId: number;
  defaults: ItemFormDefaults;
  mode: "add" | "edit";
  itemId?: number;
  cancelHref: string;
  claimedByName?: string | null;
};

export function ItemForm({
  action,
  wishlistId,
  defaults,
  mode,
  itemId,
  cancelHref,
  claimedByName,
}: Props) {
  const [state, formAction] = useActionState(action, {});
  const [imageUrl, setImageUrl] = useState(defaults.imageUrl);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="wishlistId" value={wishlistId} />
      {itemId ? <input type="hidden" name="itemId" value={itemId} /> : null}

      <div>
        <label htmlFor="item-title" className="label">
          Title
        </label>
        <input
          id="item-title"
          name="title"
          required
          maxLength={200}
          className="input"
          defaultValue={defaults.title}
        />
      </div>

      <div>
        <label htmlFor="item-url" className="label">
          Link <span className="font-normal">(optional)</span>
        </label>
        <input
          id="item-url"
          name="url"
          inputMode="url"
          maxLength={2000}
          className="input"
          placeholder="https://"
          defaultValue={defaults.url}
        />
      </div>

      <div>
        <label htmlFor="item-description" className="label">
          Description <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="item-description"
          name="description"
          rows={3}
          maxLength={5000}
          className="input"
          defaultValue={defaults.description}
        />
      </div>

      <div>
        <label htmlFor="item-note" className="label">
          Note <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id="item-note"
          name="note"
          rows={2}
          maxLength={2000}
          className="input"
          defaultValue={defaults.note}
        />
        <p className="mt-1.5 text-xs text-muted">Shown on the card instead of the description.</p>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
        <div>
          <label htmlFor="item-price" className="label">
            Price <span className="font-normal">(optional)</span>
          </label>
          <input
            id="item-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="input"
            placeholder="0.00"
            defaultValue={defaults.price}
          />
        </div>
        <div>
          <label htmlFor="item-currency" className="label">
            Currency
          </label>
          <select
            id="item-currency"
            name="currency"
            className="input"
            defaultValue={defaults.currency || "GBP"}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="item-image" className="label">
          Image URL <span className="font-normal">(optional)</span>
        </label>
        <div className="flex items-start gap-3">
          <input
            id="item-image"
            name="imageUrl"
            inputMode="url"
            maxLength={2000}
            className="input"
            placeholder="https://"
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
          />
          <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-raised text-muted">
            <ImageIcon className="absolute size-4" />
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>
        </div>
      </div>

      {mode === "edit" && claimedByName ? (
        <div className="rounded-xl border border-line bg-raised/60 px-3.5 py-3">
          <p className="text-sm text-muted">
            Claimed by <span className="text-ink">{claimedByName}</span>.
          </p>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="unclaim"
              className="size-4 rounded border-line accent-[rgb(var(--accent))]"
            />
            Mark as unclaimed
          </label>
        </div>
      ) : null}

      <FormMessage state={state} />

      <div className="flex items-center gap-2 pt-1">
        <SubmitButton className="btn btn-primary" pendingText={mode === "add" ? "Adding…" : "Saving…"}>
          {mode === "add" ? "Add item" : "Save changes"}
        </SubmitButton>
        <Link href={cancelHref} className="btn btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}
