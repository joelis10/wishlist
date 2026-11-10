"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { requireViewer } from "@/lib/auth";
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
