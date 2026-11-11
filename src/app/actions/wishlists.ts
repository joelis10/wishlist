"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, requireViewer } from "@/lib/auth";
import { addGuestWishlistSlug } from "@/lib/guest-shares";
import { notifyUserIfEnabled } from "@/lib/push";
import {
  createWishlist,
  deleteWishlist,
  getWishlistAccess,
  getWishlistBySlug,
  removeShare,
  saveWishlistForUser,
  shareWishlist,
  updateWishlist,
  type SharePermission,
} from "@/lib/wishlists";
import { booleanFromForm, cleanText, parseEndDate, parseRecurrence } from "@/lib/validation";
import { isShareSlug } from "@/lib/slugs";
import { normalizeAccentColor } from "@/lib/accent";
import { deleteUpload, ImageError, saveWishlistImage } from "@/lib/uploads";
import type { FormState } from "@/lib/forms";

function imageFile(formData: FormData): File | null {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) return file;
  return null;
}

function revalidateWishlist(slug: string) {
  revalidatePath(`/w/${slug}`);
  revalidatePath(`/w/${slug}/settings`);
  revalidatePath("/");
  revalidatePath("/shared");
}

export async function createWishlistAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/w/new");
  const title = cleanText(formData.get("title"), 120);
  const description = cleanText(formData.get("description"), 2000) || null;
  const endDate = parseEndDate(formData.get("endDate"));
  const recurrence = endDate ? parseRecurrence(formData.get("recurrence")) : "none";

  if (!title) return { error: "Give the wishlist a title." };

  let imagePath: string | null = null;
  let created: { id: number; slug: string };
  try {
    const file = imageFile(formData);
    if (file) imagePath = await saveWishlistImage(file);
    created = createWishlist(viewer.id, { title, description, endDate, recurrence, imagePath });
  } catch (error) {
    if (imagePath) await deleteUpload(imagePath);
    if (error instanceof ImageError) return { error: error.message };
    throw error;
  }

  revalidatePath("/");
  redirect(`/w/${created.slug}/settings`);
}

export async function updateWishlistAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return { error: "Only the owner can change wishlist settings." };

  const title = cleanText(formData.get("title"), 120);
  const description = cleanText(formData.get("description"), 2000) || null;
  const endDate = parseEndDate(formData.get("endDate"));
  const recurrence = endDate ? parseRecurrence(formData.get("recurrence")) : "none";
  const useDefaultAccent = booleanFromForm(formData.get("useDefaultAccent"));
  const rawAccent = cleanText(formData.get("accentColor"), 20);
  const accentColor = useDefaultAccent || !rawAccent ? null : normalizeAccentColor(rawAccent);
  if (!title) return { error: "Give the wishlist a title." };
  if (!useDefaultAccent && rawAccent && !accentColor) {
    return { error: "Choose a valid accent colour." };
  }

  const file = imageFile(formData);
  const removeImage = booleanFromForm(formData.get("removeImage"));
  let newImagePath = access.wishlist.imagePath;
  let uploaded: string | null = null;

  try {
    if (file) {
      uploaded = await saveWishlistImage(file);
      newImagePath = uploaded;
    } else if (removeImage) {
      newImagePath = null;
    }

    updateWishlist(id, {
      title,
      description,
      endDate,
      recurrence,
      imagePath: newImagePath,
      accentColor,
    });

    if (access.wishlist.imagePath && access.wishlist.imagePath !== newImagePath) {
      await deleteUpload(access.wishlist.imagePath);
    }

    revalidateWishlist(access.wishlist.slug);
    return { ok: true, message: "Saved." };
  } catch (error) {
    if (uploaded) await deleteUpload(uploaded);
    if (error instanceof ImageError) return { error: error.message };
    throw error;
  }
}

export async function deleteWishlistAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer("/");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return;

  const slug = access.wishlist.slug;
  const imagePath = deleteWishlist(id);
  if (imagePath) await deleteUpload(imagePath);
  revalidatePath("/");
  revalidatePath("/shared");
  revalidatePath(`/w/${slug}`);
  redirect("/");
}

export async function shareWishlistAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return { error: "Only the owner can share this wishlist." };

  const username = cleanText(formData.get("username"), 32).replace(/^@/, "");
  const permission: SharePermission =
    formData.get("permission") === "edit" ? "edit" : "view";
  if (!username) return { error: "Enter a username." };

  const result = shareWishlist(id, username, permission);
  if (!result.ok) return { error: result.error };

  if (result.created) {
    await notifyUserIfEnabled(result.userId, {
      title: "Wishlist shared with you",
      body: `${viewer.username} shared “${access.wishlist.title}” with you.`,
      url: `/w/${access.wishlist.slug}`,
    });
  }

  revalidatePath(`/w/${access.wishlist.slug}/settings`);
  return {
    ok: true,
    message: result.created
      ? `Shared with ${result.username} (${permission === "edit" ? "can edit" : "view only"}).`
      : `Updated ${result.username}'s access.`,
  };
}

export async function removeShareAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer("/");
  const id = Number(formData.get("wishlistId"));
  const userId = Number(formData.get("userId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return;

  removeShare(id, userId);
  revalidatePath(`/w/${access.wishlist.slug}/settings`);
  revalidatePath("/shared");
}

export async function rememberWishlistAction(slug: string): Promise<void> {
  if (!isShareSlug(slug)) return;
  const wishlist = getWishlistBySlug(slug);
  if (!wishlist) return;

  const viewer = await getViewer();
  if (viewer) {
    if (wishlist.ownerId === viewer.id) return;
    saveWishlistForUser(viewer.id, wishlist.id);
  } else {
    await addGuestWishlistSlug(slug);
  }
}
