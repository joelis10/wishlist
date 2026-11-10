import { getDb, nowIso, transaction } from "./db";
import type { Recurrence } from "./dates";

export type Wishlist = {
  id: number;
  ownerId: number;
  ownerUsername: string;
  title: string;
  description: string | null;
  imagePath: string | null;
  endDate: string | null;
  recurrence: Recurrence;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
};

export type WishlistAccess = {
  wishlist: Wishlist;
  isOwner: boolean;
  isCollaborator: boolean;
  canView: boolean;
  canEditItems: boolean;
  canManage: boolean;
};

type WishlistRow = {
  id: number;
  owner_id: number;
  owner_username: string;
  title: string;
  description: string | null;
  image_path: string | null;
  end_date: string | null;
  recurrence: Recurrence;
  is_public: number;
  created_at: string;
  updated_at: string;
  item_count: number;
};

const SELECT = `
  SELECT w.*, u.username AS owner_username,
    (SELECT COUNT(*) FROM items i WHERE i.wishlist_id = w.id) AS item_count
  FROM wishlists w
  JOIN users u ON u.id = w.owner_id
`;

function mapWishlist(row: WishlistRow): Wishlist {
  return {
    id: row.id,
    ownerId: row.owner_id,
    ownerUsername: row.owner_username,
    title: row.title,
    description: row.description,
    imagePath: row.image_path,
    endDate: row.end_date,
    recurrence: row.recurrence,
    isPublic: Boolean(row.is_public),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: Number(row.item_count),
  };
}

export function getWishlist(id: number): Wishlist | null {
  if (!Number.isInteger(id) || id <= 0) return null;
  const row = getDb().prepare(`${SELECT} WHERE w.id = ?`).get(id) as unknown as
    | WishlistRow
    | undefined;
  return row ? mapWishlist(row) : null;
}

export function listPublicWishlists(): Wishlist[] {
  const rows = getDb()
    .prepare(`${SELECT} WHERE w.is_public = 1 ORDER BY w.updated_at DESC`)
    .all() as unknown as WishlistRow[];
  return rows.map(mapWishlist);
}

export function listMyWishlists(userId: number): Wishlist[] {
  const rows = getDb()
    .prepare(
      `${SELECT}
       WHERE w.owner_id = ? OR EXISTS (
         SELECT 1 FROM wishlist_collaborators c
         WHERE c.wishlist_id = w.id AND c.user_id = ?
       )
       ORDER BY w.updated_at DESC`,
    )
    .all(userId, userId) as unknown as WishlistRow[];
  return rows.map(mapWishlist);
}

export function isCollaborator(wishlistId: number, userId: number | null): boolean {
  if (!userId) return false;
  const row = getDb()
    .prepare("SELECT 1 AS ok FROM wishlist_collaborators WHERE wishlist_id = ? AND user_id = ?")
    .get(wishlistId, userId) as { ok?: number } | undefined;
  return Boolean(row);
}

export function getWishlistAccess(wishlistId: number, viewerId: number | null): WishlistAccess | null {
  const wishlist = getWishlist(wishlistId);
  if (!wishlist) return null;
  const isOwner = viewerId != null && viewerId === wishlist.ownerId;
  const collaborator = !isOwner && isCollaborator(wishlistId, viewerId);
  return {
    wishlist,
    isOwner,
    isCollaborator: collaborator,
    canView: wishlist.isPublic || isOwner || collaborator,
    canEditItems: isOwner || collaborator,
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
): number {
  const timestamp = nowIso();
  const result = getDb()
    .prepare(
      `INSERT INTO wishlists
        (owner_id, title, description, image_path, end_date, recurrence, is_public, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      ownerId,
      data.title,
      data.description,
      data.imagePath,
      data.endDate,
      data.recurrence,
      timestamp,
      timestamp,
    );
  return Number(result.lastInsertRowid);
}

export function updateWishlist(
  id: number,
  data: {
    title: string;
    description: string | null;
    endDate: string | null;
    recurrence: Recurrence;
    imagePath: string | null;
  },
): void {
  getDb()
    .prepare(
      `UPDATE wishlists
       SET title = ?, description = ?, end_date = ?, recurrence = ?, image_path = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      data.title,
      data.description,
      data.endDate,
      data.recurrence,
      data.imagePath,
      nowIso(),
      id,
    );
}

export function setWishlistPublic(id: number, isPublic: boolean): void {
  getDb()
    .prepare("UPDATE wishlists SET is_public = ?, updated_at = ? WHERE id = ?")
    .run(isPublic ? 1 : 0, nowIso(), id);
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

export type Collaborator = { userId: number; username: string; addedAt: string };

export function listCollaborators(wishlistId: number): Collaborator[] {
  const rows = getDb()
    .prepare(
      `SELECT u.id AS user_id, u.username, c.created_at AS added_at
       FROM wishlist_collaborators c JOIN users u ON u.id = c.user_id
       WHERE c.wishlist_id = ?
       ORDER BY u.username COLLATE NOCASE ASC`,
    )
    .all(wishlistId) as unknown as { user_id: number; username: string; added_at: string }[];
  return rows.map((r) => ({ userId: r.user_id, username: r.username, addedAt: r.added_at }));
}

export function addCollaborator(
  wishlistId: number,
  username: string,
): { ok: true } | { ok: false; error: string } {
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

  const exists = db
    .prepare("SELECT 1 AS ok FROM wishlist_collaborators WHERE wishlist_id = ? AND user_id = ?")
    .get(wishlistId, user.id);
  if (exists) return { ok: false, error: "That person can already edit this wishlist." };

  db.prepare(
    "INSERT INTO wishlist_collaborators (wishlist_id, user_id, created_at) VALUES (?, ?, ?)",
  ).run(wishlistId, user.id, nowIso());
  return { ok: true };
}

export function removeCollaborator(wishlistId: number, userId: number): void {
  getDb()
    .prepare("DELETE FROM wishlist_collaborators WHERE wishlist_id = ? AND user_id = ?")
    .run(wishlistId, userId);
}

export function listEditableWishlists(userId: number): Wishlist[] {
  return listMyWishlists(userId);
}

export function isDefaultWishlistEditable(userId: number, wishlistId: number): boolean {
  const access = getWishlistAccess(wishlistId, userId);
  return Boolean(access?.canEditItems);
}
