import { config } from "./env";
import { getDb, nowIso, transaction } from "./db";

export type Item = {
  id: number;
  wishlistId: number;
  title: string;
  url: string | null;
  description: string | null;
  note: string | null;
  priceCents: number | null;
  currency: string;
  imageUrl: string | null;
  domain: string | null;
  claimedAt: string | null;
  claimedByUserId: number | null;
  claimedByName: string | null;
  inStock: boolean | null;
  lastCheckedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ItemInput = {
  title: string;
  url: string | null;
  description: string | null;
  note: string | null;
  priceCents: number | null;
  currency: string;
  imageUrl: string | null;
  domain: string | null;
};

type ItemRow = {
  id: number;
  wishlist_id: number;
  title: string;
  url: string | null;
  description: string | null;
  note: string | null;
  price_cents: number | null;
  currency: string;
  image_url: string | null;
  domain: string | null;
  claimed_at: string | null;
  claimed_by_user_id: number | null;
  claimed_by_name: string | null;
  in_stock: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    wishlistId: row.wishlist_id,
    title: row.title,
    url: row.url,
    description: row.description,
    note: row.note,
    priceCents: row.price_cents,
    currency: row.currency,
    imageUrl: row.image_url,
    domain: row.domain,
    claimedAt: row.claimed_at,
    claimedByUserId: row.claimed_by_user_id,
    claimedByName: row.claimed_by_name,
    inStock: row.in_stock == null ? null : Boolean(row.in_stock),
    lastCheckedAt: row.last_checked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listItems(wishlistId: number): Item[] {
  const rows = getDb()
    .prepare("SELECT * FROM items WHERE wishlist_id = ? ORDER BY created_at DESC, id DESC")
    .all(wishlistId) as unknown as ItemRow[];
  return rows.map(mapItem);
}

export function getItem(id: number): Item | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = getDb().prepare("SELECT * FROM items WHERE id = ?").get(id) as unknown as
    | ItemRow
    | undefined;
  return row ? mapItem(row) : null;
}

export function countItems(wishlistId: number): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS count FROM items WHERE wishlist_id = ?")
    .get(wishlistId) as { count: number };
  return Number(row.count);
}

export function addItem(
  wishlistId: number,
  input: ItemInput,
): { ok: true; id: number } | { ok: false; error: string } {
  return transaction((db) => {
    const count = db
      .prepare("SELECT COUNT(*) AS count FROM items WHERE wishlist_id = ?")
      .get(wishlistId) as { count: number };
    if (Number(count.count) >= config.maxItemsPerWishlist) {
      return {
        ok: false,
        error: `This wishlist has reached its limit of ${config.maxItemsPerWishlist} items.`,
      } as const;
    }
    const timestamp = nowIso();
    const result = db
      .prepare(
        `INSERT INTO items
          (wishlist_id, title, url, description, note, price_cents, currency, image_url, domain, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        wishlistId,
        input.title,
        input.url,
        input.description,
        input.note,
        input.priceCents,
        input.currency,
        input.imageUrl,
        input.domain,
        timestamp,
        timestamp,
      );
    db.prepare("UPDATE wishlists SET updated_at = ? WHERE id = ?").run(timestamp, wishlistId);
    return { ok: true as const, id: Number(result.lastInsertRowid) };
  });
}

export function updateItem(
  id: number,
  wishlistId: number,
  input: ItemInput,
  options: { unclaim?: boolean } = {},
): void {
  const timestamp = nowIso();
  getDb()
    .prepare(
      `UPDATE items SET
        title = ?, url = ?, description = ?, note = ?, price_cents = ?, currency = ?,
        image_url = ?, domain = ?, updated_at = ?
        ${options.unclaim ? ", claimed_at = NULL, claimed_by_user_id = NULL, claimed_by_name = NULL" : ""}
       WHERE id = ? AND wishlist_id = ?`,
    )
    .run(
      input.title,
      input.url,
      input.description,
      input.note,
      input.priceCents,
      input.currency,
      input.imageUrl,
      input.domain,
      timestamp,
      id,
      wishlistId,
    );
  getDb().prepare("UPDATE wishlists SET updated_at = ? WHERE id = ?").run(timestamp, wishlistId);
}

export function deleteItem(id: number, wishlistId: number): void {
  const timestamp = nowIso();
  getDb().prepare("DELETE FROM items WHERE id = ? AND wishlist_id = ?").run(id, wishlistId);
  getDb().prepare("UPDATE wishlists SET updated_at = ? WHERE id = ?").run(timestamp, wishlistId);
}

export function claimItem(
  id: number,
  wishlistId: number,
  name: string,
  userId: number | null,
): boolean {
  const timestamp = nowIso();
  const result = getDb()
    .prepare(
      `UPDATE items
       SET claimed_at = ?, claimed_by_user_id = ?, claimed_by_name = ?, updated_at = ?
       WHERE id = ? AND wishlist_id = ? AND claimed_at IS NULL`,
    )
    .run(timestamp, userId, name, timestamp, id, wishlistId);
  return Number(result.changes) > 0;
}

export function unclaimItem(id: number, wishlistId: number): void {
  const timestamp = nowIso();
  getDb()
    .prepare(
      `UPDATE items
       SET claimed_at = NULL, claimed_by_user_id = NULL, claimed_by_name = NULL, updated_at = ?
       WHERE id = ? AND wishlist_id = ?`,
    )
    .run(timestamp, id, wishlistId);
}

export type ScrapeTarget = {
  id: number;
  wishlistId: number;
  url: string;
  priceCents: number | null;
  currency: string;
  inStock: boolean | null;
  lastCheckedAt: string | null;
};

export function listItemsForScraping(limit: number): ScrapeTarget[] {
  const sql = `
    SELECT i.id, i.wishlist_id, i.url, i.price_cents, i.currency, i.in_stock, i.last_checked_at
    FROM items i
    JOIN wishlists w ON w.id = i.wishlist_id
    WHERE i.claimed_at IS NULL AND i.url IS NOT NULL AND TRIM(i.url) <> ''
    ORDER BY (i.last_checked_at IS NULL) DESC, i.last_checked_at ASC, i.id ASC
    ${limit > 0 ? "LIMIT ?" : ""}
  `;
  const stmt = getDb().prepare(sql);
  const rows = (limit > 0 ? stmt.all(limit) : stmt.all()) as unknown as {
    id: number;
    wishlist_id: number;
    url: string;
    price_cents: number | null;
    currency: string;
    in_stock: number | null;
    last_checked_at: string | null;
  }[];
  return rows.map((row) => ({
    id: row.id,
    wishlistId: row.wishlist_id,
    url: row.url,
    priceCents: row.price_cents,
    currency: row.currency,
    inStock: row.in_stock == null ? null : Boolean(row.in_stock),
    lastCheckedAt: row.last_checked_at,
  }));
}

export function updateItemFromScrape(
  id: number,
  changes: { priceCents?: number | null; currency?: string; inStock?: boolean | null },
): void {
  const timestamp = nowIso();
  const sets = ["last_checked_at = ?"];
  const params: (string | number | null)[] = [timestamp];
  if ("priceCents" in changes) {
    sets.push("price_cents = ?");
    params.push(changes.priceCents ?? null);
  }
  if ("currency" in changes && changes.currency) {
    sets.push("currency = ?");
    params.push(changes.currency);
  }
  if ("inStock" in changes) {
    sets.push("in_stock = ?");
    params.push(changes.inStock == null ? null : changes.inStock ? 1 : 0);
  }
  params.push(id);
  getDb()
    .prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`)
    .run(...params);
}

export function markItemChecked(id: number): void {
  getDb().prepare("UPDATE items SET last_checked_at = ? WHERE id = ?").run(nowIso(), id);
}
