import { supabase } from "./supabase";
import type { ProductImage } from "../types/database";

/** All of a product's extra images (beyond its own `image_path` cover
 * photo), in display order — for the product detail page's gallery. */
export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProductImage[];
}

/** Just the first extra image per product, for however many of `productIds`
 * have one — used for the card hover/touch "second image" swap, which only
 * ever needs one image per card, not the full gallery. Fetched as a single
 * bulk query (not one per card) when a batch of ids is known ahead of time;
 * `fetchFirstExtraImage` below covers the lazy, one-card-at-a-time case. */
export async function fetchFirstExtraImageMap(productIds: string[]): Promise<Map<string, string>> {
  if (productIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from("product_images")
    .select("product_id, image_path, sort_order")
    .in("product_id", productIds)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    // Rows arrive sorted by sort_order already — keep only the first one
    // seen per product.
    if (!map.has(row.product_id)) map.set(row.product_id, row.image_path);
  }
  return map;
}

/** Lazily fetches just one product's first extra image — used by
 * ProductCard on hover/touch, so a card nobody interacts with never
 * triggers a request for an image nobody ends up seeing. */
export async function fetchFirstExtraImage(productId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("product_images")
    .select("image_path")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data?.image_path ?? null;
}

export async function addProductImage(productId: string, imagePath: string, sortOrder: number): Promise<ProductImage> {
  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, image_path: imagePath, sort_order: sortOrder })
    .select()
    .single();
  if (error) throw error;
  return data as ProductImage;
}

export async function deleteProductImageRow(id: string): Promise<void> {
  const { error } = await supabase.from("product_images").delete().eq("id", id);
  if (error) throw error;
}
