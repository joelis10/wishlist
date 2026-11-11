"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState, type FormEvent, type KeyboardEvent } from "react";
import { claimItemAction } from "@/app/actions/items";
import { approximateCents, type ExchangeRates } from "@/lib/fx";
import type { Item } from "@/lib/items";
import { formatPrice } from "@/lib/money";
import { displayUrl } from "@/lib/urls";
import { GiftIcon, ImageIcon, PencilIcon } from "./icons";
import { Modal } from "./modal";

type Props = {
  item: Item;
  wishlistId: number;
  wishlistSlug: string;
  canEdit: boolean;
  canClaim: boolean;
  showClaims: boolean;
  viewerName: string | null;
  preferredCurrency: string;
  rates: ExchangeRates | null;
};

export const ItemCard = memo(function ItemCard({
  item,
  wishlistId,
  wishlistSlug,
  canEdit,
  canClaim,
  showClaims,
  viewerName,
  preferredCurrency,
  rates,
}: Props) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const claimed = showClaims && Boolean(item.claimedAt);
  const price = formatPrice(item.priceCents, item.currency);
  const approxCents = approximateCents(
    item.priceCents,
    item.currency,
    preferredCurrency,
    rates,
  );

  function openView() {
    setViewOpen(true);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openView();
    }
  }

  function openClaim() {
    let saved = "";
    try {
      saved = localStorage.getItem("wishlist_claimer_name") || "";
    } catch {
      // ignore
    }
    setName(saved || viewerName || "");
    setError(null);
    setClaimOpen(true);
  }

  async function submitClaim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter your name.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await claimItemAction(item.id, wishlistId, trimmed);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      try {
        localStorage.setItem("wishlist_claimer_name", trimmed);
      } catch {
        // ignore
      }
      setClaimOpen(false);
      router.refresh();
    } catch {
      setError("That did not work. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <article
        role="button"
        tabIndex={0}
        aria-label={`View details for ${item.title}`}
        onClick={openView}
        onKeyDown={handleCardKeyDown}
        className="card flex cursor-pointer gap-3 p-3 transition duration-200 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-lift sm:gap-4 sm:p-4"
      >
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-raised sm:size-24">
          <ImageIcon className="absolute inset-0 m-auto size-6 text-muted/50" />
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="absolute inset-0 h-full w-full object-cover"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink sm:text-base">
                {item.title}
              </h3>

              {item.note ? (
                <p className="mt-0.5 line-clamp-2 border-l-2 border-accent/40 pl-2 text-sm italic leading-relaxed text-ink/80">
                  {item.note}
                </p>
              ) : item.description ? (
                <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted">
                  {item.description}
                </p>
              ) : null}

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {claimed ? (
                  <span className="animate-fade-in inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                    Claimed{item.claimedByName ? ` by ${item.claimedByName}` : ""}
                  </span>
                ) : null}
                {item.inStock === false ? (
                  <span className="animate-fade-in inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                    Out of stock
                  </span>
                ) : null}
                {item.domain ? (
                  <span className="truncate text-[11px] text-muted/80">{item.domain}</span>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:w-36">
              <div className="text-right">
                <p className="text-[15px] font-semibold tabular-nums text-ink sm:text-base">
                  {price || <span className="font-normal text-muted">—</span>}
                </p>
                {approxCents != null ? (
                  <p className="text-xs tabular-nums text-muted">
                    ≈ {formatPrice(approxCents, preferredCurrency)}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm w-full"
                  onClick={(event) => {
                    event.stopPropagation();
                    openView();
                  }}
                >
                  View item
                </button>
                {canClaim && !claimed ? (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm w-full"
                    onClick={(event) => {
                      event.stopPropagation();
                      openClaim();
                    }}
                  >
                    <GiftIcon className="size-3.5" />
                    Claim item
                  </button>
                ) : null}
                {canEdit ? (
                  <Link
                    href={`/w/${wishlistSlug}/items/${item.id}/edit`}
                    onClick={(event) => event.stopPropagation()}
                    className="btn btn-ghost btn-sm w-full"
                  >
                    <PencilIcon className="size-3.5" />
                    Edit item
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </article>

      {viewOpen ? (
        <Modal
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          title={<span className="line-clamp-2">{item.title}</span>}
          footer={
            <div className="flex justify-end">
              <button type="button" className="btn btn-secondary" onClick={() => setViewOpen(false)}>
                Close
              </button>
            </div>
          }
        >
          <div className="space-y-4 pb-2">
            {item.note ? (
              <div>
                <p className="label">Note</p>
                <p className="prose-quiet text-[15px] text-ink">{item.note}</p>
              </div>
            ) : null}

            {item.priceCents != null ? (
              <div>
                <p className="label">Price</p>
                <p className="text-[15px] tabular-nums text-ink">
                  {price}
                  {approxCents != null ? (
                    <span className="mt-0.5 block text-[13px] text-muted">
                      ≈ {formatPrice(approxCents, preferredCurrency)}
                    </span>
                  ) : null}
                </p>
              </div>
            ) : null}

            {item.url ? (
              <div>
                <p className="label">Link</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  title={item.url}
                  className="line-clamp-2 break-all text-[15px] text-ink underline decoration-line underline-offset-4 transition hover:decoration-accent"
                >
                  {displayUrl(item.url)}
                </a>
              </div>
            ) : null}

            {claimed || item.inStock === false ? (
              <div className="flex flex-wrap items-center gap-1.5">
                {claimed ? (
                  <span className="chip border-accent/30 bg-accent/10 text-accent">
                    Claimed{item.claimedByName ? ` by ${item.claimedByName}` : ""}
                  </span>
                ) : null}
                {item.inStock === false ? (
                  <span className="chip border-danger/30 bg-danger/10 text-danger">Out of stock</span>
                ) : null}
              </div>
            ) : null}

            {item.description ? (
              <div className="border-t border-line pt-4">
                <p className="label">Description</p>
                <p className="prose-quiet text-[15px]">{item.description}</p>
              </div>
            ) : null}

            {!item.note &&
            item.priceCents == null &&
            !item.url &&
            !item.description &&
            !claimed &&
            item.inStock !== false ? (
              <p className="text-sm text-muted">No details were added.</p>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {claimOpen ? (
        <Modal
          open={claimOpen}
          onClose={() => setClaimOpen(false)}
          title="Claim this item?"
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setClaimOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                form={`claim-form-${item.id}`}
                className="btn btn-primary"
                disabled={pending}
              >
                {pending ? "Claiming…" : "Confirm claim"}
              </button>
            </div>
          }
        >
          <form id={`claim-form-${item.id}`} onSubmit={submitClaim} className="space-y-4 pb-1">
            <p className="text-sm leading-relaxed text-muted">
              Confirm you have bought this so nobody else picks it up.
            </p>
            <div>
              <label htmlFor={`claimer-${item.id}`} className="label">
                Your name
              </label>
              <input
                id={`claimer-${item.id}`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={40}
                required
                autoFocus
                className="input"
                placeholder="Name"
              />
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </form>
        </Modal>
      ) : null}
    </>
  );
});
