"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import type { Item } from "@/lib/items";
import { FilterIcon, SearchIcon } from "./icons";
import { ItemCard } from "./item-card";
import { Modal } from "./modal";

type SortKey = "newest" | "oldest" | "price-asc" | "price-desc" | "domain";

type Props = {
  wishlistId: number;
  items: Item[];
  canEdit: boolean;
  canClaim: boolean;
  showClaims: boolean;
  viewerName: string | null;
};

function toCents(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return null;
  return Math.round(number * 100);
}

export function WishlistItems({
  wishlistId,
  items,
  canEdit,
  canClaim,
  showClaims,
  viewerName,
}: Props) {
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sites, setSites] = useState<string[]>([]);
  const [sort, setSort] = useState<SortKey>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setVisibleCount(60);
  }, [deferredSearch, minPrice, maxPrice, sites, sort]);

  const domains = useMemo(
    () =>
      [...new Set(items.map((item) => item.domain).filter((domain): domain is string => Boolean(domain)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const filtered = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    const min = toCents(minPrice);
    const max = toCents(maxPrice);
    const selected = new Set(sites);

    const result = items.filter((item) => {
      if (query) {
        const haystack = [item.title, item.description, item.note, item.domain]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (min != null && (item.priceCents == null || item.priceCents < min)) return false;
      if (max != null && (item.priceCents == null || item.priceCents > max)) return false;
      if (selected.size > 0) {
        if (!item.domain || !selected.has(item.domain)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      switch (sort) {
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt) || a.id - b.id;
        case "price-asc":
          if (a.priceCents == null && b.priceCents == null) return a.title.localeCompare(b.title);
          if (a.priceCents == null) return 1;
          if (b.priceCents == null) return -1;
          return a.priceCents - b.priceCents;
        case "price-desc":
          if (a.priceCents == null && b.priceCents == null) return a.title.localeCompare(b.title);
          if (a.priceCents == null) return 1;
          if (b.priceCents == null) return -1;
          return b.priceCents - a.priceCents;
        case "domain":
          if (a.domain == null && b.domain == null) return a.title.localeCompare(b.title);
          if (a.domain == null) return 1;
          if (b.domain == null) return -1;
          return a.domain.localeCompare(b.domain) || a.title.localeCompare(b.title);
        default:
          return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
      }
    });

    return result;
  }, [items, deferredSearch, minPrice, maxPrice, sites, sort]);

  const activeFilters =
    (minPrice.trim() ? 1 : 0) + (maxPrice.trim() ? 1 : 0) + sites.length;
  const hasFiltered = search.trim() || activeFilters > 0;

  function toggleSite(domain: string) {
    setSites((current) =>
      current.includes(domain) ? current.filter((site) => site !== domain) : [...current, domain],
    );
  }

  function clearFilters() {
    setMinPrice("");
    setMaxPrice("");
    setSites([]);
  }

  return (
    <section>
      <h2 className="sr-only">Items</h2>
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input pl-10"
            placeholder="Search items"
            aria-label="Search items"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setFiltersOpen(true)}
          >
            <FilterIcon className="size-4" />
            Filters
            {activeFilters > 0 ? (
              <span className="ml-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-ink">
                {activeFilters}
              </span>
            ) : null}
          </button>
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            className="input w-auto py-1.5 text-[13px]"
            aria-label="Sort items"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="domain">Site: A–Z</option>
          </select>
        </div>
      </div>

      {hasFiltered ? (
        <p className="mt-2 text-xs text-muted">
          {filtered.length} of {items.length} items
        </p>
      ) : null}

      {filtered.length > 0 ? (
        <>
          <div className="mt-4 space-y-3">
            {filtered.slice(0, visibleCount).map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                wishlistId={wishlistId}
                canEdit={canEdit}
                canClaim={canClaim}
                showClaims={showClaims}
                viewerName={viewerName}
              />
            ))}
          </div>
          {filtered.length > visibleCount ? (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setVisibleCount((count) => count + 60)}
              >
                Show more ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card mt-4 px-6 py-16 text-center">
          <h2 className="text-lg">{items.length === 0 ? "No items yet" : "No items match"}</h2>
          <p className="mt-1 text-sm text-muted">
            {items.length === 0
              ? canEdit
                ? "Add the first thing you would love."
                : "Check back later."
              : "Try a different search or clear the filters."}
          </p>
          {items.length > 0 ? (
            <button
              type="button"
              className="btn btn-secondary mt-4"
              onClick={() => {
                setSearch("");
                clearFilters();
              }}
            >
              Clear search and filters
            </button>
          ) : null}
        </div>
      )}

      {filtersOpen ? (
      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filters"
        size="sm"
        footer={
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearFilters}
              disabled={activeFilters === 0}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setFiltersOpen(false)}
            >
              Show {filtered.length} {filtered.length === 1 ? "item" : "items"}
            </button>
          </div>
        }
      >
        <div className="space-y-5 pb-2">
          <div>
            <p className="label">Price</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                className="input"
                placeholder="Min"
                aria-label="Minimum price"
              />
              <span className="text-sm text-muted">to</span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                className="input"
                placeholder="Max"
                aria-label="Maximum price"
              />
            </div>
          </div>

          <div>
            <p className="label">Site</p>
            {domains.length > 0 ? (
              <div className="space-y-1.5">
                {domains.map((domain) => (
                  <label
                    key={domain}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-sm text-ink"
                  >
                    <input
                      type="checkbox"
                      checked={sites.includes(domain)}
                      onChange={() => toggleSite(domain)}
                      className="size-4 rounded border-line accent-[rgb(var(--accent))]"
                    />
                    {domain}
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No sites yet.</p>
            )}
          </div>
        </div>
      </Modal>
      ) : null}
    </section>
  );
}
