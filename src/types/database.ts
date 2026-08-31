// Hand-written types mirroring supabase/migrations/0001_init.sql and
// 0002_product_unit_size.sql. If the schema changes, update this alongside
// the migrations.

/** Matches the `products_unit_check` constraint in 0002_product_unit_size.sql. */
export const PRODUCT_UNITS = [
  "each",
  "kg",
  "g",
  "liter",
  "ml",
  "dozen",
  "pack",
  "box",
  "bag",
] as const;

export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export type Category = {
  id: string;
  parent_id: string | null;
  name_en: string;
  name_ar: string;
  sort_order: number;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price: number;
  unit: ProductUnit;
  size: string | null;
  image_path: string | null;
  in_stock: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
};

export type Profile = {
  id: string;
  role: string;
  created_at: string;
};

/** A category with its direct subcategories attached, for nav trees. */
export type CategoryWithChildren = Category & {
  children: Category[];
};
