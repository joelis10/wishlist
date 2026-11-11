import { getDb, nowIso, transaction } from "./db";
import type { Recurrence } from "./dates";
import { generateShareSlug, isShareSlug } from "./slugs";

export type SharePermission = "view" | "edit";

export type Wishlist = {
  id: number;
  slug: string;
  ownerId: number;
  ownerUsername: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  accentColor: string | null;
  endDate: string | null;
  recurrence: Recurrence;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type SharedWishlist = Wishlist & { shareKind: SharePermission | "saved" };

export type WishlistAccess = {
  wishlist: Wishlist;
  isOwner: boolean;
  sharePermission: SharePermission | null;
  canView: boolean;
  canEditItems: boolean;
  canManage: boolean;
};

type WishlistRow = {
  id: number;
  share_slug: string;
  owner_id: number;
  owner_username: string;
  title: string;
  description: string | null;
  image_path: string | null;
  accent_color: string | null;
  end_date: string | null;
  recurrence: Recurrence;
  created_at: string;
  updated_at: string;
  item_count: number;
};

type SharedWishlistRow = WishlistRow & { share_kind: SharePermission | "saved" };

const SELECT = `
  SELECT w.*, u.username AS owner_username,
    (SELECT COUNT(*) FROM items i WHERE i.wishlist_id = w.id) AS item_count
  FROM wishlists w
  JOIN users u ON u.id = w.owner_id
`;

function mapWishlist(row: WishlistRow): Wishlist {
  return {
    id: row.id,
    slug: row.share_slug,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    title: row.title,
    description: row.description,
    imagePath: row.image_path,
    accentColor: row.accent_color,
    endDate: row.end_date,
    recurrence: row.recurrence,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: Number(row.item_count),
  };
}

function mapSharedWishlist(row: SharedWishlistRow): SharedWishlist {
  return { ...mapWishlist(row), shareKind: row.share_kind };
}

export function getWishlist(id: number): Wishlist | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = getDb().prepare(`${SELECT} WHERE w.id = ?`).get(id) as unknown as
    | WishlistRow
    | undefined;
  return row ? mapWishlist(row) : null;
}

export function getWishlistBySlug(slug: string): Wishlist | null {
  if (!isShareSlug(slug)) return null;
  const row = getDb().prepare(`${SELECT} WHERE w.share_slug = ?`).get(slug) as unknown as
    | WishlistRow
    | undefined;
  return row ? mapWishlist(row) : null;
}

export function listOwnedWishlists(userId: number): Wishlist[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE w.owner_id = ? ORDER BY w.updated_at DESC`)
    .all(userId) as unknown as WishlistRow[];
  return rows.map(mapWishlist);
}

export function listEditableWishlists(userId: number): Wishlist[] {
  const rows = getDb()
    .prepare(
      `${SELECT}
       WHERE w.owner_id = ? OR EXISTS (
         SELECT 1 FROM wishlist_shares s
         WHERE s.wishlist_id = w.id AND s.user_id = ? AND s.permission = 'edit'
       )
       ORDER BY w.updated_at DESC`,
    )
    .all(userId, userId) as unknown as WishlistRow[];
  return rows.map(mapWishlist);
}

export function listSharedWithMe(userId: number): SharedWishlist[] {
  const rows = getDb()
    .prepare(
      `${SELECT.replace(
        "FROM wishlists w",
        `,
        CASE
          WHEN s.permission IS NOT NULL THEN s.permission
          ELSE 'saved'
        END AS share_kind
       FROM wishlists w`,
      )}
       LEFT JOIN wishlist_shares s ON s.wishlist_id = w.id AND s.user_id = ?
       LEFT JOIN wishlist_saves v ON v.wishlist_id = w.id AND v.user_id = ?
       WHERE s.user_id IS NOT NULL OR v.user_id IS NOT NULL
       ORDER BY w.updated_at DESC`,
    )
    .all(userId, userId) as unknown as SharedWishlistRow[];
  return rows.map(mapSharedWishlist);
}

export function listWishlistsBySlugs(slugs: string[]): Wishlist[] {
  const unique = [...new Set(slugs.filter((slug) => isShareSlug(slug)))].slice(0, 50);
  if (unique.length === 0) return [];
  const placeholders = unique.map(() => "?").join(", ");
  const rows = getDb()
    .prepare(`${SELECT} WHERE w.share_slug IN (${placeholders})`)
    .all(...unique) as unknown as WishlistRow[];
  const bySlug = new Map(rows.map((row) => [row.share_slug, mapWishlist(row)]));
  return unique.map((slug) => bySlug.get(slug)).filter((wishlist): wishlist is Wishlist => Boolean(wishlist));
}

export function getSharePermission(
  wishlistId: number,
  userId: number | null,
): SharePermission | null {
  if (!userId) return null;
  const row = getDb()
    .prepare(
      "SELECT permission FROM wishlist_shares WHERE wishlist_id = ? AND user_id = ?",
    )
    .get(wishlistId, userId) as { permission: SharePermission } | undefined;
  return row?.permission ?? null;
}

export function getWishlistAccess(
  wishlistId: number,
  viewerId: number | null,
): WishlistAccess | null {
  const wishlist = getWishlist(wishlistId);
  if (!wishlist) return null;
  const isOwner = viewerId != null && viewerId === wishlist.ownerId;
  const sharePermission = isOwner ? null : getSharePermission(wishlistId, viewerId);
  return {
    wishlist,
    isOwner,
    sharePermission,
    canView: true,
    canEditItems: isOwner || sharePermission === "edit",
    canManage: isOwner,
  };
}

export function createWishlist(
  ownerId: number,
  data: {
    title: string;
    description: string | null;
    endDate: string | null;
    recurrence: Recurrence;
    imagePath: string | null;
  },
): { id: number; slug: string } {
  const db = getDb();
  let slug = generateShareSlug();
  while (db.prepare("SELECT 1 AS ok FROM wishlists WHERE share_slug = ?").get(slug)) {
    slug = generateShareSlug();
  }

  const timestamp = nowIso();
  const result = db
    .prepare(
      `INSERT INTO wishlists
        (owner_id, share_slug, title, description, image_path, end_date, recurrence, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      ownerId,
      slug,
      data.title,
      data.description,
      data.imagePath,
      data.endDate,
      data.recurrence,
      timestamp,
      timestamp,
    );
  return { id: Number(result.lastInsertRowid), slug };
}

export function updateWishlist(
  id: number,
  data: {
    title: string;
    description: string | null;
    endDate: string | null;
    recurrence: Recurrence;
    imagePath: string | null;
    accentColor: string | null;
  },
): void {
  getDb()
    .prepare(
      `UPDATE wishlists
       SET title = ?, description = ?, end_date = ?, recurrence = ?, image_path = ?,
           accent_color = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      data.title,
      data.description,
      data.endDate,
      data.recurrence,
      data.imagePath,
      data.accentColor,
      nowIso(),
      id,
    );
}

export function deleteWishlist(id: number): string | null {
  return transaction((db) => {
    const row = db.prepare("SELECT image_path FROM wishlists WHERE id = ?").get(id) as
      | { image_path: string | null }
      | undefined;
    if (!row) return null;
    db.prepare("UPDATE users SET default_wishlist_id = NULL WHERE default_wishlist_id = ?").run(id);
    db.prepare("DELETE FROM wishlists WHERE id = ?").run(id);
    return row.image_path;
  });
}

export function touchWishlist(id: number): void {
  getDb().prepare("UPDATE wishlists SET updated_at = ? WHERE id = ?").run(nowIso(), id);
}

export type WishlistShare = {
  userId: number;
  username: string;
  permission: SharePermission;
  addedAt: string;
};

export function listShares(wishlistId: number): WishlistShare[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS user_id, u.username, s.permission, s.created_at AS added_at
       FROM wishlist_shares s JOIN users u ON u.id = s.user_id
       WHERE s.wishlist_id = ?
       ORDER BY u.username COLLATE NOCASE ASC`,
    )
    .all(wishlistId) as unknown as {
    user_id: number;
    username: string;
    permission: SharePermission;
    added_at: string;
  }[];
  return rows.map((row) => ({
    userId: row.user_id,
    username: row.username,
    permission: row.permission,
    addedAt: row.added_at,
  }));
}

export type ShareResult =
  | {
      ok: true;
      userId: number;
      username: string;
      permission: SharePermission;
      created: boolean;
    }
  | { ok: false; error: string };

export function shareWishlist(
  wishlistId: number,
  username: string,
  permission: SharePermission,
): ShareResult {
  const db = getDb();
  const wishlist = db.prepare("SELECT owner_id FROM wishlists WHERE id = ?").get(wishlistId) as
    | { owner_id: number }
    | undefined;
  if (!wishlist) return { ok: false, error: "Wishlist not found." };

  const user = db
    .prepare("SELECT id, username FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as { id: number; username: string } | undefined;
  if (!user) return { ok: false, error: "No account with that username." };
  if (user.id === wishlist.owner_id) return { ok: false, error: "The owner already has access." };

  const existing = db
    .prepare("SELECT permission FROM wishlist_shares WHERE wishlist_id = ? AND user_id = ?")
    .get(wishlistId, user.id) as { permission: SharePermission } | undefined;

  if (existing?.permission === permission) {
    return {
      ok: false,
      error: `Already shared with ${permission === "edit" ? "edit" : "view"} access.`,
    };
  }

  if (existing) {
    db.prepare(
      "UPDATE wishlist_shares SET permission = ? WHERE wishlist_id = ? AND user_id = ?",
    ).run(permission, wishlistId, user.id);
  } else {
    db.prepare(
      "INSERT INTO wishlist_shares (wishlist_id, user_id, permission, created_at) VALUES (?, ?, ?, ?)",
    ).run(wishlistId, user.id, permission, nowIso());
  }

  db.prepare("DELETE FROM wishlist_saves WHERE wishlist_id = ? AND user_id = ?").run(
    wishlistId,
    user.id,
  );

  return {
    ok: true,
    userId: user.id,
    username: user.username,
    permission,
    created: !existing,
  };
}

export function removeShare(wishlistId: number, userId: number): void {
  getDb()
    .prepare("DELETE FROM wishlist_shares WHERE wishlist_id = ? AND user_id = ?")
    .run(wishlistId, userId);
}

export function saveWishlistForUser(userId: number, wishlistId: number): void {
  getDb()
    .prepare(
      "INSERT OR IGNORE INTO wishlist_saves (wishlist_id, user_id, created_at) VALUES (?, ?, ?)",
    )
    .run(wishlistId, userId, nowIso());
}

export function isDefaultWishlistEditable(userId: number, wishlistId: number): boolean {
  const access = getWishlistAccess(wishlistId, userId);
  return Boolean(access?.canEditItems);
}
