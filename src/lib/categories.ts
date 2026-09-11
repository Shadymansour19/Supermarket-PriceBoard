import { supabase } from "./supabase";
import type { Category, CategoryWithChildren } from "../types/database";

export async function fetchCategoryTree(): Promise<CategoryWithChildren[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw error;

  const all = (data ?? []) as Category[];
  const byId = new Map<string, CategoryWithChildren>(
    all.map((c) => [c.id, { ...c, children: [] }]),
  );
  const roots: CategoryWithChildren[] = [];

  for (const category of byId.values()) {
    if (category.parent_id) {
      const parent = byId.get(category.parent_id);
      // Orphaned rows (parent deleted) fall back to top-level rather than
      // disappearing from the nav.
      if (parent) parent.children.push(category);
      else roots.push(category);
    } else {
      roots.push(category);
    }
  }

  return roots;
}

/**
 * Resolves a selected category to the set of category ids its product
 * filter should match: itself plus, when it's a top-level category, all of
 * its subcategories. Selecting a subcategory only ever matches itself.
 */
export function getCategoryFilterIds(
  tree: CategoryWithChildren[],
  categoryId: string,
): string[] {
  for (const root of tree) {
    if (root.id === categoryId) {
      return [root.id, ...root.children.map((child) => child.id)];
    }
    if (root.children.some((child) => child.id === categoryId)) {
      return [categoryId];
    }
  }
  // Tree not loaded yet (or id not found) — fall back to an exact match.
  return [categoryId];
}

/**
 * Flattens a category tree into a depth-annotated list, for <select> options.
 * Only handles the two levels the schema/UI actually support (category,
 * subcategory) — see CategoryWithChildren.
 */
export function flattenCategoryTree(
  tree: CategoryWithChildren[],
): { category: Category; depth: number }[] {
  const result: { category: Category; depth: number }[] = [];
  for (const node of tree) {
    const { children, ...category } = node;
    result.push({ category, depth: 0 });
    for (const child of children) {
      result.push({ category: child, depth: 1 });
    }
  }
  return result;
}

export async function createCategory(input: {
  name_en: string;
  name_ar: string;
  parent_id: string | null;
  sort_order?: number;
}): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

export async function updateCategory(
  id: string,
  input: Partial<Pick<Category, "name_en" | "name_ar" | "parent_id" | "sort_order">>,
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Category;
}

/**
 * Deletes a category. Fails at the DB level (FK restrict) if products still
 * reference it, and children fall back to top-level via `on delete set null`
 * rather than being deleted too.
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}
