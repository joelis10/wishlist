"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, useState, type FormEvent } from "react";
import { claimItemAction } from "@/app/actions/items";
import type { Item } from "@/lib/items";
import { formatPrice } from "@/lib/money";
import { ExternalIcon, GiftIcon, ImageIcon, PencilIcon } from "./icons";
import { Modal } from "./modal";

type Props = {
  item: Item;
  wishlistId: number;
  canEdit: boolean;
  canClaim: boolean;
  showClaims: boolean;
  viewerName: string | null;
};

export const ItemCard = memo(function ItemCard({
  item,
  wishlistId,
  canEdit,
  canClaim,
  showClaims,
  viewerName,
}: Props) {
  const router = useRouter();
  const [viewOpen, setViewOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const claimed = showClaims && Boolean(item.claimedAt);
  const cardText = item.note || item.description;
  const price = formatPrice(item.priceCents, item.currency);

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
      <article className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
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

        <div className="grid min-w-0 flex-1 grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-start gap-1.5">
              <h3 className="line-clamp-2 min-w-0 text-[15px] font-semibold leading-snug text-ink sm:text-base">
                {item.title}
              </h3>
              {canEdit ? (
                <Link
                  href={`/w/${wishlistId}/items/${item.id}/edit`}
                  className="-my-1 -mr-1 shrink-0 rounded-full p-1.5 text-muted transition hover:bg-raised hover:text-ink"
                  aria-label="Edit item"
                >
                  <PencilIcon className="size-3.5" />
                </Link>
              ) : null}
            </div>

            {cardText ? (
              <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-muted">{cardText}</p>
            ) : null}

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {claimed ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                  Claimed{item.claimedByName ? ` by ${item.claimedByName}` : ""}
                </span>
              ) : null}
              {item.inStock === false ? (
                <span className="inline-flex items-center rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-medium text-danger">
                  Out of stock
                </span>
              ) : null}
              {item.domain ? (
                <span className="truncate text-[11px] text-muted/80">{item.domain}</span>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end sm:justify-start sm:pt-0.5">
            <p className="shrink-0 text-[15px] font-semibold tabular-nums text-ink sm:text-base">
              {price || <span className="font-normal text-muted">—</span>}
            </p>
            <div className="flex items-center gap-1.5">
              {canClaim && !claimed ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={openClaim}>
                  <GiftIcon className="size-3.5" />
                  Claim item
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setViewOpen(true)}>
                View item
              </button>
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
          <div className="flex items-center justify-between gap-3">
            <button type="button" className="btn btn-ghost" onClick={() => setViewOpen(false)}>
              Close
            </button>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="btn btn-primary"
              >
                Open item
                <ExternalIcon className="size-4" />
              </a>
            ) : null}
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
          {item.description ? (
            <div>
              <p className="label">Description</p>
              <p className="prose-quiet text-[15px]">{item.description}</p>
            </div>
          ) : null}
          {!item.note && !item.description ? (
            <p className="text-sm text-muted">No description was added.</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {price ? <span className="chip">{price}</span> : null}
            {item.domain ? <span className="chip">{item.domain}</span> : null}
            {claimed ? (
              <span className="chip border-accent/30 bg-accent/10 text-accent">
                Claimed{item.claimedByName ? ` by ${item.claimedByName}` : ""}
              </span>
            ) : null}
            {item.inStock === false ? (
              <span className="chip border-danger/30 bg-danger/10 text-danger">Out of stock</span>
            ) : null}
          </div>
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
