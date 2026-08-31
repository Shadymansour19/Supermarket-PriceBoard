import { supabase } from "./supabase";
import type { Product } from "../types/database";

export type ProductFilter = {
  categoryId?: string | null;
  search?: string;
  /** Admin views want inactive products too; public views never do. */
  includeInactive?: boolean;
};

export async function fetchProducts(filter: ProductFilter = {}): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("created_at", { ascending: false });

  if (!filter.includeInactive) {
    query = query.eq("is_active", true);
  }
  if (filter.categoryId) {
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

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export type ProductInput = {
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en?: string | null;
  description_ar?: string | null;
  price: number;
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
