"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import {
  addCollaborator,
  createWishlist,
  deleteWishlist,
  getWishlistAccess,
  removeCollaborator,
  setWishlistPublic,
  updateWishlist,
} from "@/lib/wishlists";
import { booleanFromForm, cleanText, parseEndDate, parseRecurrence } from "@/lib/validation";
import { deleteUpload, ImageError, saveWishlistImage } from "@/lib/uploads";
import type { FormState } from "@/lib/forms";

function imageFile(formData: FormData): File | null {
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) return file;
  return null;
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
  let id: number;
  try {
    const file = imageFile(formData);
    if (file) imagePath = await saveWishlistImage(file);
    id = createWishlist(viewer.id, { title, description, endDate, recurrence, imagePath });
  } catch (error) {
    if (imagePath) await deleteUpload(imagePath);
    if (error instanceof ImageError) return { error: error.message };
    throw error;
  }

  revalidatePath("/");
  revalidatePath("/wishlists");
  redirect(`/w/${id}/settings`);
}

export async function updateWishlistAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/wishlists");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return { error: "Only the owner can change wishlist settings." };

  const title = cleanText(formData.get("title"), 120);
  const description = cleanText(formData.get("description"), 2000) || null;
  const endDate = parseEndDate(formData.get("endDate"));
  const recurrence = endDate ? parseRecurrence(formData.get("recurrence")) : "none";
  if (!title) return { error: "Give the wishlist a title." };

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

    updateWishlist(id, { title, description, endDate, recurrence, imagePath: newImagePath });

    if (access.wishlist.imagePath && access.wishlist.imagePath !== newImagePath) {
      await deleteUpload(access.wishlist.imagePath);
    }

    revalidatePath(`/w/${id}`);
    revalidatePath(`/w/${id}/settings`);
    revalidatePath("/");
    revalidatePath("/wishlists");
    return { ok: true, message: "Saved." };
  } catch (error) {
    if (uploaded) await deleteUpload(uploaded);
    if (error instanceof ImageError) return { error: error.message };
    throw error;
  }
}

export async function setWishlistPublicAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer("/wishlists");
  const id = Number(formData.get("wishlistId"));
  const makePublic = booleanFromForm(formData.get("isPublic"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return;

  setWishlistPublic(id, makePublic);
  revalidatePath(`/w/${id}`);
  revalidatePath(`/w/${id}/settings`);
  revalidatePath("/");
  revalidatePath("/wishlists");
}

export async function deleteWishlistAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer("/wishlists");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return;

  const imagePath = deleteWishlist(id);
  if (imagePath) await deleteUpload(imagePath);
  revalidatePath("/");
  revalidatePath("/wishlists");
  redirect("/wishlists");
}

export async function addCollaboratorAction(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const viewer = await requireViewer("/wishlists");
  const id = Number(formData.get("wishlistId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return { error: "Only the owner can share edit access." };

  const username = cleanText(formData.get("username"), 32).replace(/^@/, "");
  if (!username) return { error: "Enter a username." };

  const result = addCollaborator(id, username);
  if (!result.ok) return { error: result.error };
  revalidatePath(`/w/${id}/settings`);
  return { ok: true, message: `${username} can now edit this wishlist.` };
}

export async function removeCollaboratorAction(formData: FormData): Promise<void> {
  const viewer = await requireViewer("/wishlists");
  const id = Number(formData.get("wishlistId"));
  const userId = Number(formData.get("userId"));
  const access = getWishlistAccess(id, viewer.id);
  if (!access?.canManage) return;

  removeCollaborator(id, userId);
  revalidatePath(`/w/${id}/settings`);
}
