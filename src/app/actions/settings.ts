"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getViewer, requireViewer } from "@/lib/auth";
import {
  currencyCookieOptions,
  savePreferredCurrency,
} from "@/lib/currency";
import { getDb } from "@/lib/db";
import { CURRENCY_COOKIE } from "@/lib/fx";
import { CURRENCIES } from "@/lib/money";
import { getWishlistAccess } from "@/lib/wishlists";
import type { FormState } from "@/lib/forms";

export async function setDefaultWishlistAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/settings");
  const raw = String(formData.get("defaultWishlistId") || "none");

  let wishlistId: number | null = null;
  if (raw !== "none") {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0) return { error: "Choose a wishlist." };
    const access = getWishlistAccess(id, viewer.id);
    if (!access?.canEditItems) return { error: "You cannot use that wishlist." };
    wishlistId = id;
  }

  getDb()
    .prepare("UPDATE users SET default_wishlist_id = ? WHERE id = ?")
    .run(wishlistId, viewer.id);
  revalidatePath("/settings");
  return {
    ok: true,
    message: wishlistId ? "Default wishlist saved." : "Default wishlist cleared.",
  };
}


export async function setPreferredCurrencyAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const currency = String(formData.get("currency") || "").trim().toUpperCase();
  if (!CURRENCIES.includes(currency)) return { error: "Choose a supported currency." };

  const viewer = await getViewer();
  if (viewer) savePreferredCurrency(viewer.id, currency);

  const cookieStore = await cookies();
  cookieStore.set(CURRENCY_COOKIE, currency, currencyCookieOptions());
  revalidatePath("/settings");
  return { ok: true, message: "Currency updated." };
}
