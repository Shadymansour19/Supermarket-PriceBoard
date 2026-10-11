import { supabase } from "./supabase";
import type { Product, ProductUnit } from "../types/database";

export type ProductFilter = {
  /** A single category id for an exact match, or a list of ids to match any of
   * (e.g. a parent category plus its subcategories). */
  categoryId?: string | string[] | null;
  search?: string;
  /** Admin views want inactive products too; public views never do. */
  includeInactive?: boolean;
};

/** How many active products exist in each category — used for the
 * category cards' "N products" count, not for filtering, so it only ever
 * needs the category id and nothing else per row. */
export async function fetchActiveProductCategoryIds(): Promise<string[]> {
  const { data, error } = await supabase.from("products").select("category_id").eq("is_active", true);
  if (error) throw error;
  return (data ?? []).map((row) => row.category_id);
}

export async function fetchProducts(filter: ProductFilter = {}): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (!filter.includeInactive) {
    query = query.eq("is_active", true);
  }
  if (Array.isArray(filter.categoryId)) {
    if (filter.categoryId.length > 0) {
      query = query.in("category_id", filter.categoryId);
    }
  } else if (filter.categoryId) {
    query = query.eq("category_id", filter.categoryId);
  }
  if (filter.search?.trim()) {
    const term = filter.search.trim();
    // Matches either language's name field.
    query = query.or(`name_en.ilike.%${term}%,name_ar.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Product[];
}

/** Other active products in the same category, closest in price first — a
 * simple, always-available "similar products" signal for a catalog this
 * size. No purchase/view history exists to build real recommendations
 * from (checkout is a WhatsApp message, not a stored order; recently-
 * viewed is per-device only), so same category + price proximity is the
 * strongest signal available without new infrastructure — see the
 * evaluated options in the SPEC.md decision log. */
export async function fetchSimilarProducts(product: Product, limit = 8): Promise<Product[]> {
  const inCategory = await fetchProducts({ categoryId: product.category_id });
  return inCategory
    .filter((p) => p.id !== product.id)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, limit);
}

/** Active products created within the last `daysBack` days, newest first —
 * keyed off `created_at`, which is set once at insert and never touched
 * again (only `updated_at` has a trigger bumping it). That's what makes
 * this safe from the thing it needs to avoid: a product that already
 * existed, went inactive/out of stock, and later came back doesn't get a
 * new `created_at`, so it never re-appears here as if it were new. */
export async function fetchRecentlyArrivedProducts(daysBack = 14, limit = 8): Promise<Product[]> {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

/** Products matching a set of ids (favorites) — only visible ones, same as
 * the default `fetchProducts` behavior, so a since-hidden product quietly
 * drops off the favorites list instead of erroring. */
export async function fetchProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("products").select("*").in("id", ids).eq("is_active", true);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export type ProductInput = {
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  price: number;
  unit: ProductUnit;
  size?: string | null;
  image_path?: string | null;
  in_stock?: boolean;
  is_active?: boolean;
};

export async function createProduct(input: ProductInput): Promise<Product> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("products")
    .insert({ ...input, updated_by: user?.id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<Product> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("products")
    .update({ ...input, updated_by: user?.id ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}
