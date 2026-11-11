import * as webpush from "web-push";
import { config } from "./env";
import { getDb, getSetting, nowIso, setSetting } from "./db";

type Vapid = { publicKey: string; privateKey: string; subject: string };
type GlobalWithVapid = typeof globalThis & { __wishlistVapid?: Vapid };

function getVapid(): Vapid {
  const g = globalThis as GlobalWithVapid;
  if (g.__wishlistVapid) return g.__wishlistVapid;

  let publicKey = config.vapid.publicKey;
  let privateKey = config.vapid.privateKey;

  if (!publicKey || !privateKey) {
    const storedPublic = getSetting("vapid_public_key");
    const storedPrivate = getSetting("vapid_private_key");
    if (storedPublic && storedPrivate) {
      publicKey = storedPublic;
      privateKey = storedPrivate;
    } else {
      const generated = webpush.generateVAPIDKeys();
      publicKey = generated.publicKey;
      privateKey = generated.privateKey;
      setSetting("vapid_public_key", publicKey);
      setSetting("vapid_private_key", privateKey);
    }
  }

  const subject =
    config.vapid.subject.startsWith("mailto:") || config.vapid.subject.startsWith("https://")
      ? config.vapid.subject
      : "mailto:admin@example.com";

  const vapid = { publicKey, privateKey, subject };
  g.__wishlistVapid = vapid;
  return vapid;
}

export function getPublicVapidKey(): string {
  return getVapid().publicKey;
}

export type PushSubscriptionInput = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function savePushSubscription(userId: number, subscription: PushSubscriptionInput): void {
  getDb()
    .prepare(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id,
         p256dh = excluded.p256dh, auth = excluded.auth`,
    )
    .run(userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth, nowIso());
  getDb().prepare("UPDATE users SET notify_enabled = 1 WHERE id = ?").run(userId);
}

export function removePushSubscription(userId: number, endpoint?: string): void {
  const db = getDb();
  if (endpoint) {
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?").run(
      userId,
      endpoint,
    );
  } else {
    db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
  }
  const remaining = db
    .prepare("SELECT COUNT(*) AS count FROM push_subscriptions WHERE user_id = ?")
    .get(userId) as { count: number };
  db.prepare("UPDATE users SET notify_enabled = ? WHERE id = ?").run(
    Number(remaining.count) > 0 ? 1 : 0,
    userId,
  );
}

export async function sendPushToUser(
  userId: number,
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  const rows = getDb()
    .prepare("SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?")
    .all(userId) as unknown as { endpoint: string; p256dh: string; auth: string }[];
  if (rows.length === 0) return 0;

  const vapid = getVapid();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url || "/",
        }),
        { TTL: 60 * 60 },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        getDb()
          .prepare("DELETE FROM push_subscriptions WHERE endpoint = ?")
          .run(row.endpoint);
      }
    }
  }
  return sent;
}

export async function notifyUserIfEnabled(
  userId: number,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const row = getDb()
    .prepare("SELECT notify_enabled FROM users WHERE id = ?")
    .get(userId) as { notify_enabled: number } | undefined;
  if (!row || !row.notify_enabled) return;
  await sendPushToUser(userId, payload).catch(() => {});
}
