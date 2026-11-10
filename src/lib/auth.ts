import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, config } from "./env";
import { getDb, nowIso } from "./db";

export type Viewer = {
  id: number;
  username: string;
  defaultWishlistId: number | null;
  notifyEnabled: boolean;
};

type ViewerRow = {
  id: number;
  username: string;
  default_wishlist_id: number | null;
  notify_enabled: number;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getViewer(): Promise<Viewer | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = getDb()
    .prepare(
      `SELECT u.id, u.username, u.default_wishlist_id, u.notify_enabled
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as unknown as ViewerRow | undefined;

  if (!row) return null;
  return {
    id: row.id,
    username: row.username,
    defaultWishlistId: row.default_wishlist_id,
    notifyEnabled: Boolean(row.notify_enabled),
  };
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const db = getDb();
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    nowIso(),
  );

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireViewer(nextPath = "/"): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return viewer;
}

export function safeNextPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  let decoded: string;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
    return fallback;
  }
  return value;
}

export async function getRequestIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    "local"
  );
}
