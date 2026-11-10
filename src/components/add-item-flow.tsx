"use client";

import { useMemo, useState } from "react";
import { addItemAction } from "@/app/actions/items";
import { formatPrice } from "@/lib/money";
import type { ScrapeResult } from "@/lib/scraper/types";
import { ItemForm, type ItemFormDefaults } from "./item-form";
import { ChevronLeftIcon, SparkleIcon } from "./icons";
import { Modal } from "./modal";

type FieldKey = "title" | "description" | "price" | "image";

const FIELD_LABELS: Record<FieldKey, string> = {
  title: "Title",
  description: "Description",
  price: "Price",
  image: "Image",
};

function emptyDefaults(url = ""): ItemFormDefaults {
  return {
    title: "",
    url,
    description: "",
    note: "",
    price: "",
    currency: "GBP",
    imageUrl: "",
  };
}

type Props = {
  wishlistId: number;
  initialUrl?: string;
};

export function AddItemFlow({ wishlistId, initialUrl = "" }: Props) {
  const [step, setStep] = useState<"url" | "form">("url");
  const [url, setUrl] = useState(initialUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [selected, setSelected] = useState<Record<FieldKey, boolean>>({
    title: false,
    description: false,
    price: false,
    image: false,
  });
  const [choice, setChoice] = useState<Record<FieldKey, number>>({
    title: 0,
    description: 0,
    price: 0,
    image: 0,
  });
  const [defaults, setDefaults] = useState<ItemFormDefaults>(emptyDefaults(initialUrl));

  const available = useMemo<Record<FieldKey, boolean>>(
    () => ({
      title: Boolean(result?.candidates.title.length),
      description: Boolean(result?.candidates.description.length),
      price: Boolean(result?.candidates.price.length),
      image: Boolean(result?.candidates.image.length),
    }),
    [result],
  );

  const allSelected =
    (Object.keys(available) as FieldKey[]).every((key) => !available[key] || selected[key]);
  const anySelected = (Object.keys(available) as FieldKey[]).some(
    (key) => available[key] && selected[key],
  );

  function openSelection(found: ScrapeResult) {
    setResult(found);
    setSelected({
      title: found.candidates.title.length > 0,
      description: found.candidates.description.length > 0,
      price: found.candidates.price.length > 0,
      image: found.candidates.image.length > 0,
    });
    setChoice({ title: 0, description: 0, price: 0, image: 0 });
    setSelectionOpen(true);
  }

  async function fetchDetails() {
    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste an item link first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wishlistId, url: trimmed }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        result?: ScrapeResult;
        error?: string;
      };
      if (!response.ok || !data.result) {
        setError(data.error || "That page could not be read. You can enter the details manually.");
        return;
      }
      const found = data.result;
      setUrl(found.url);
      const hasAnything =
        found.candidates.title.length > 0 ||
        found.candidates.description.length > 0 ||
        found.candidates.price.length > 0 ||
        found.candidates.image.length > 0;
      if (!hasAnything) {
        setError("No details were found on that page. You can enter them manually.");
        return;
      }
      openSelection(found);
    } catch {
      setError("That page could not be read. You can enter the details manually.");
    } finally {
      setLoading(false);
    }
  }

  function goManual() {
    setResult(null);
    setSelectionOpen(false);
    setDefaults(emptyDefaults(url.trim()));
    setStep("form");
  }

  function continueWithSelection() {
    if (!result || !anySelected) return;
    const next = emptyDefaults(result.url);
    next.currency = result.currency || "GBP";
    if (selected.title) next.title = result.candidates.title[choice.title] || "";
    if (selected.description) {
      next.description = result.candidates.description[choice.description] || "";
    }
    if (selected.price) {
      const price = result.candidates.price[choice.price];
      if (price) {
        next.price = (price.value / 100).toFixed(2);
        next.currency = price.currency;
      }
    }
    if (selected.image) next.imageUrl = result.candidates.image[choice.image] || "";
    setDefaults(next);
    setSelectionOpen(false);
    setStep("form");
  }

  if (step === "form") {
    return (
      <div>
        <button
          type="button"
          className="btn btn-ghost btn-sm -ml-2 mb-4"
          onClick={() => setStep("url")}
        >
          <ChevronLeftIcon className="size-4" />
          Back
        </button>
        <ItemForm
          action={addItemAction}
          wishlistId={wishlistId}
          defaults={defaults}
          mode="add"
          cancelHref={`/w/${wishlistId}`}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="item-link" className="label">
          Item link
        </label>
        <input
          id="item-link"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          inputMode="url"
          autoFocus
          className="input"
          placeholder="https://"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void fetchDetails();
            }
          }}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void fetchDetails()}
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Looking for details…
            </>
          ) : (
            <>
              <SparkleIcon className="size-4" />
              Fetch details
            </>
          )}
        </button>
        <button type="button" className="btn btn-secondary" onClick={goManual} disabled={loading}>
          Manually input details
        </button>
      </div>

      {selectionOpen ? (
      <Modal
        open={selectionOpen}
        onClose={() => setSelectionOpen(false)}
        title="Choose details"
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" className="btn btn-ghost btn-sm" onClick={goManual}>
              Enter manually instead
            </button>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectionOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={continueWithSelection}
                disabled={!anySelected}
              >
                Continue
              </button>
            </div>
          </div>
        }
      >
        {result ? (
          <div className="space-y-3 pb-2">
            {result.warning ? (
              <p className="rounded-xl border border-line bg-raised/60 px-3 py-2 text-xs text-muted">
                {result.warning}
              </p>
            ) : null}

            <label className="flex cursor-pointer items-center gap-2.5 border-b border-line pb-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {
                  const nextValue = !allSelected;
                  const next = { ...selected };
                  for (const key of Object.keys(available) as FieldKey[]) {
                    if (available[key]) next[key] = nextValue;
                  }
                  setSelected(next);
                }}
                className="size-4 rounded border-line accent-[rgb(var(--accent))]"
              />
              Select all
            </label>

            {(Object.keys(FIELD_LABELS) as FieldKey[]).map((key) => {
              if (!available[key] || !result) return null;
              const options =
                key === "title"
                  ? result.candidates.title
                  : key === "description"
                    ? result.candidates.description
                    : key === "image"
                      ? result.candidates.image
                      : result.candidates.price.map((price) => price.label);

              const selectedImage =
                key === "image" ? result.candidates.image[choice.image] : null;

              return (
                <div key={key} className="rounded-xl border border-line p-3">
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={selected[key]}
                      onChange={(event) =>
                        setSelected((current) => ({ ...current, [key]: event.target.checked }))
                      }
                      className="size-4 rounded border-line accent-[rgb(var(--accent))]"
                    />
                    {FIELD_LABELS[key]}
                  </label>
                  <select
                    value={choice[key]}
                    onChange={(event) =>
                      setChoice((current) => ({ ...current, [key]: Number(event.target.value) }))
                    }
                    disabled={!selected[key]}
                    className="input mt-2 disabled:opacity-50"
                  >
                    {options.map((option, index) => (
                      <option key={`${key}-${index}`} value={index}>
                        {key === "description" && option.length > 120
                          ? `${option.slice(0, 120)}…`
                          : option}
                      </option>
                    ))}
                  </select>
                  {selectedImage && selected[key] ? (
                    <div className="relative mt-2 flex h-28 items-center justify-center overflow-hidden rounded-lg border border-line bg-raised">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selectedImage}
                        alt=""
                        className="h-full w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </Modal>
      ) : null}
    </div>
  );
}
