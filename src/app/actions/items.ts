"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getRequestIp, getViewer, requireViewer } from "@/lib/auth";
import { addItem, claimItem, deleteItem, getItem, unclaimItem, updateItem } from "@/lib/items";
import type { ClaimResult, FormState } from "@/lib/forms";
import { checkRateLimit } from "@/lib/rate-limit";
import { getWishlistAccess } from "@/lib/wishlists";
import {
  cleanText,
  normalizeUrlInput,
  optionalUrl,
  parseCurrency,
  parsePriceToCents,
  siteDomain,
} from "@/lib/validation";

type ParsedItem =
  | {
      ok: true;
      input: {
        title: string;
        url: string | null;
        description: string | null;
        note: string | null;
        priceCents: number | null;
        currency: string;
        imageUrl: string | null;
        domain: string | null;
      };
    }
  | { ok: false; error: string };

function parseItemForm(formData: FormData): ParsedItem {
  const title = cleanText(formData.get("title"), 200);
  if (!title) return { ok: false, error: "Give the item a title." };

  const rawUrl = cleanText(formData.get("url"), 2000);
  let url: string | null = null;
  if (rawUrl) {
    try {
      url = normalizeUrlInput(rawUrl);
    } catch {
      return { ok: false, error: "That item link is not valid." };
    }
  }

  const rawImage = cleanText(formData.get("imageUrl"), 2000);
  let imageUrl: string | null = null;
  if (rawImage) {
    imageUrl = optionalUrl(rawImage);
    if (!imageUrl) return { ok: false, error: "That image link is not valid." };
  }

  const rawPrice = cleanText(formData.get("price"), 30);
  let priceCents: number | null = null;
  if (rawPrice) {
    priceCents = parsePriceToCents(rawPrice);
    if (priceCents == null) return { ok: false, error: "Enter a valid price." };
  }

  return {
    ok: true,
    input: {
      title,
      url,
      description: cleanText(formData.get("description"), 5000) || null,
      note: cleanText(formData.get("note"), 2000) || null,
      priceCents,
      currency: parseCurrency(formData.get("currency")),
      imageUrl,
      domain: siteDomain(url),
    },
  };
}

function revalidateWishlist(id: number): void {
  revalidatePath(`/w/${id}`);
  revalidatePath("/");
  revalidatePath("/wishlists");
}

export async function addItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  const wishlistId = Number(formData.get("wishlistId"));
  const viewer = await requireViewer(`/w/${wishlistId}/add`);
  const access = getWishlistAccess(wishlistId, viewer.id);
  if (!access?.canEditItems) return { error: "You cannot add items to this wishlist." };

  const parsed = parseItemForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const result = addItem(wishlistId, parsed.input);
  if (!result.ok) return { error: result.error };

  revalidateWishlist(wishlistId);
  redirect(`/w/${wishlistId}`);
}

export async function updateItemAction(_state: FormState, formData: FormData): Promise<FormState> {
  const wishlistId = Number(formData.get("wishlistId"));
  const itemId = Number(formData.get("itemId"));
  const viewer = await requireViewer(`/w/${wishlistId}`);
  const access = getWishlistAccess(wishlistId, viewer.id);
  if (!access?.canEditItems) return { error: "You cannot edit this wishlist." };

  const item = getItem(itemId);
  if (!item || item.wishlistId !== wishlistId) return { error: "Item not found." };

  const parsed = parseItemForm(formData);
  if (!parsed.ok) return { error: parsed.error };

  const unclaim = formData.get("unclaim") === "on";
  updateItem(itemId, wishlistId, parsed.input, { unclaim });
  revalidateWishlist(wishlistId);
  redirect(`/w/${wishlistId}`);
}

export async function deleteItemAction(formData: FormData): Promise<void> {
  const wishlistId = Number(formData.get("wishlistId"));
  const itemId = Number(formData.get("itemId"));
  const viewer = await requireViewer(`/w/${wishlistId}`);
  const access = getWishlistAccess(wishlistId, viewer.id);
  if (!access?.canEditItems) return;

  const item = getItem(itemId);
  if (!item || item.wishlistId !== wishlistId) return;

  deleteItem(itemId, wishlistId);
  revalidateWishlist(wishlistId);
  redirect(`/w/${wishlistId}`);
}

export async function unclaimItemAction(formData: FormData): Promise<void> {
  const wishlistId = Number(formData.get("wishlistId"));
  const itemId = Number(formData.get("itemId"));
  const viewer = await requireViewer(`/w/${wishlistId}`);
  const access = getWishlistAccess(wishlistId, viewer.id);
  if (!access?.canEditItems) return;

  const item = getItem(itemId);
  if (!item || item.wishlistId !== wishlistId) return;

  unclaimItem(itemId, wishlistId);
  revalidateWishlist(wishlistId);
}

export async function claimItemAction(
  itemId: number,
  wishlistId: number,
  rawName: string,
): Promise<ClaimResult> {
  const ip = await getRequestIp();
  if (!checkRateLimit(`claim:${ip}`, 30, 60 * 1000)) {
    return { ok: false, error: "Too many claims in a short time. Try again in a minute." };
  }

  const name = rawName.replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return { ok: false, error: "Enter your name so others know who claimed it." };

  const viewer = await getViewer();
  const access = getWishlistAccess(wishlistId, viewer?.id ?? null);
  if (!access?.canView) return { ok: false, error: "This wishlist is not available." };
  if (access.isOwner) return { ok: false, error: "You cannot claim an item on your own wishlist." };

  const item = getItem(itemId);
  if (!item || item.wishlistId !== wishlistId) return { ok: false, error: "Item not found." };

  const claimed = claimItem(itemId, wishlistId, name, viewer?.id ?? null);
  if (!claimed) return { ok: false, error: "Someone has already claimed this item." };

  revalidatePath(`/w/${wishlistId}`);
  return { ok: true };
}
