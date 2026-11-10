import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { config } from "./env";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export class ImageError extends Error {}

export async function saveWishlistImage(file: File): Promise<string> {
  if (!file || file.size === 0) throw new ImageError("Choose an image.");
  if (file.size > config.maxImageBytes) throw new ImageError("Image must be smaller than 8 MB.");
  if (file.type && !ALLOWED.has(file.type)) {
    throw new ImageError("Use a JPG, PNG, WebP, AVIF or GIF image.");
  }

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const output = await sharp(input, { animated: false, limitInputPixels: 40_000_000 })
      .rotate()
      .resize(1600, 1000, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toBuffer();

    const filename = `${randomUUID()}.jpg`;
    const target = path.join(config.dataDir, "uploads", filename);
    await fs.writeFile(target, output);
    return `/uploads/${filename}`;
  } catch {
    throw new ImageError("That image could not be processed.");
  }
}

export async function deleteUpload(imagePath: string | null): Promise<void> {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  const filename = path.basename(imagePath);
  if (!/^[a-zA-Z0-9-]+\.(jpg|webp)$/.test(filename)) return;
  await fs.unlink(path.join(config.dataDir, "uploads", filename)).catch(() => {});
}

export function isUploadPath(imagePath: string): boolean {
  return imagePath.startsWith("/uploads/");
}
