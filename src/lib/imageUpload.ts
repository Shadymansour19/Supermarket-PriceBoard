import imageCompression from "browser-image-compression";
import { supabase, IMAGE_BUCKET } from "./supabase";

/**
 * Resizes/compresses an image client-side before it ever reaches Supabase
 * Storage — keeps free-tier storage and bandwidth usage down. Targets a
 * ~1000px long edge, which is plenty for product photos in a grid/detail
 * view.
 */
async function prepareImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: 1000,
    maxSizeMB: 0.5,
    useWebWorker: true,
    fileType: "image/webp",
  });
}

/** Uploads a product image and returns its storage path (not a full URL). */
export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const prepared = await prepareImage(file);
  const path = `${productId}/${Date.now()}.webp`;

  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, prepared, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) throw error;

  return path;
}

export async function deleteProductImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(IMAGE_BUCKET).remove([path]);
  if (error) throw error;
}
