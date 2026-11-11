"use server";

import { redirect } from "next/navigation";
import { getViewer, createSession, destroySession, getRequestIp, safeNextPath } from "@/lib/auth";
import { getDb, nowIso } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/passwords";
import { checkRateLimit } from "@/lib/rate-limit";
import { passwordSchema, usernameSchema } from "@/lib/validation";
import type { FormState } from "@/lib/forms";
import { config } from "@/lib/env";
import { migrateGuestWishlistSaves } from "@/lib/guest-shares";

export async function registerAction(_state: FormState, formData: FormData): Promise<FormState> {
  if (!config.allowRegistration) return { error: "Registration is disabled." };

  const ip = await getRequestIp();
  if (!checkRateLimit(`register:${ip}`, 6, 60 * 60 * 1000)) {
    return { error: "Too many attempts. Try again later." };
  }

  const username = usernameSchema.safeParse(String(formData.get("username") || ""));
  const password = passwordSchema.safeParse(String(formData.get("password") || ""));
  const confirm = String(formData.get("confirm") || "");
  const next = safeNextPath(formData.get("next"), "/");

  if (!username.success) return { error: username.error.issues[0]?.message };
  if (!password.success) return { error: password.error.issues[0]?.message };
  if (password.data !== confirm) return { error: "Passwords do not match." };

  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE")
    .get(username.data);
  if (existing) return { error: "That username is already taken." };

  const hash = await hashPassword(password.data);
  let userId: number;
  try {
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, default_wishlist_id, notify_enabled, created_at) VALUES (?, ?, NULL, 0, ?)",
      )
      .run(username.data, hash, nowIso());
    userId = Number(result.lastInsertRowid);
  } catch {
    return { error: "That username is already taken." };
  }

  try {
    await migrateGuestWishlistSaves(userId);
  } catch {
    // A failed migration should not block account creation.
  }
  await createSession(userId);
  redirect(next);
}

export async function loginAction(_state: FormState, formData: FormData): Promise<FormState> {
  const ip = await getRequestIp();
  if (!checkRateLimit(`login:${ip}`, 12, 15 * 60 * 1000)) {
    return { error: "Too many attempts. Try again in a few minutes." };
  }

  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  const next = safeNextPath(formData.get("next"), "/");

  if (!username || !password) return { error: "Enter your username and password." };

  const user = getDb()
    .prepare("SELECT id, password_hash FROM users WHERE username = ? COLLATE NOCASE")
    .get(username) as { id: number; password_hash: string } | undefined;

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Incorrect username or password." };
  }

  try {
    await migrateGuestWishlistSaves(user.id);
  } catch {
    // A failed migration should not block sign-in.
  }
  await createSession(user.id);
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/");
}

export async function changePasswordAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };

  const current = String(formData.get("current") || "");
  const password = passwordSchema.safeParse(String(formData.get("password") || ""));
  const confirm = String(formData.get("confirm") || "");
  if (!password.success) return { error: password.error.issues[0]?.message };
  if (password.data !== confirm) return { error: "New passwords do not match." };

  const db = getDb();
  const row = db
    .prepare("SELECT password_hash FROM users WHERE id = ?")
    .get(viewer.id) as { password_hash: string } | undefined;
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { error: "Your current password is incorrect." };
  }

  const hash = await hashPassword(password.data);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, viewer.id);
  return { ok: true, message: "Password updated." };
}
