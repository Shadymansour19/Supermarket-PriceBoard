import { supabase } from "./supabase";
import type {
  LimitedTimeDiscount,
  Product,
  QuantityDiscount,
  QuantityDiscountTier,
} from "../types/database";

/** Rounded percent saved going from `originalPrice` to `discountedPrice`. */
export function discountPercent(originalPrice: number, discountedPrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}

/** True while a limited-time discount hasn't reached its `ends_at` yet. */
export function isLimitedTimeDiscountActive(discount: LimitedTimeDiscount): boolean {
  return new Date(discount.ends_at).getTime() > Date.now();
}

// ---------------------------------------------------------------------------
// Limited-time discounts
// ---------------------------------------------------------------------------

/** The current limited-time discount for a product, active or expired. Used
 * by the admin form, which needs to show/edit it either way. */
export async function fetchLimitedTimeDiscount(productId: string): Promise<LimitedTimeDiscount | null> {
  const { data, error } = await supabase
    .from("limited_time_discounts")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw error;
  return data as LimitedTimeDiscount | null;
}

/**
 * All still-active limited-time discounts, keyed by product id — one query
 * for a whole product list rather than one per card.
 */
export async function fetchActiveLimitedTimeDiscountMap(): Promise<Map<string, LimitedTimeDiscount>> {
  const { data, error } = await supabase
    .from("limited_time_discounts")
    .select("*")
    .gt("ends_at", new Date().toISOString());
  if (error) throw error;
  const rows = (data ?? []) as LimitedTimeDiscount[];
  return new Map(rows.map((row) => [row.product_id, row]));
}

/** Active limited-time discounts joined with their (visible) products,
 * soonest-to-expire first — for the home page section and the deals page. */
export async function fetchActiveLimitedTimeDeals(
  limit?: number,
): Promise<{ product: Product; discount: LimitedTimeDiscount }[]> {
  let query = supabase
    .from("limited_time_discounts")
    .select("*, product:products!inner(*)")
    .gt("ends_at", new Date().toISOString())
    .eq("product.is_active", true)
    .order("ends_at", { ascending: true });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as (LimitedTimeDiscount & { product: Product })[]).map(({ product, ...discount }) => ({
    product,
    discount: discount as LimitedTimeDiscount,
  }));
}

export type LimitedTimeDiscountInput = {
  new_price: number;
  duration_days: number;
};

/** Creates or replaces a product's limited-time discount, always restarting
 * the countdown from now — matches "set a discount for N days" rather than
 * tracking a history of periods. */
export async function setLimitedTimeDiscount(
  productId: string,
  input: LimitedTimeDiscountInput,
): Promise<LimitedTimeDiscount> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("limited_time_discounts")
    .upsert(
      {
        product_id: productId,
        new_price: input.new_price,
        duration_days: input.duration_days,
        starts_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      },
      { onConflict: "product_id" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as LimitedTimeDiscount;
}

export async function removeLimitedTimeDiscount(productId: string): Promise<void> {
  const { error } = await supabase.from("limited_time_discounts").delete().eq("product_id", productId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Quantity discounts
// ---------------------------------------------------------------------------

export async function fetchQuantityDiscount(productId: string): Promise<QuantityDiscount | null> {
  const { data, error } = await supabase
    .from("quantity_discounts")
    .select("*, tiers:quantity_discount_tiers(*)")
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { tiers, ...rest } = data as QuantityDiscount & { tiers: QuantityDiscountTier[] };
  return { ...rest, tiers: [...tiers].sort((a, b) => a.min_quantity - b.min_quantity) };
}

export type QuantityDiscountTierInput = { min_quantity: number; price: number };

/** Replaces a product's whole tier list (delete-and-reinsert — tier sets are
 * small and edited as a unit from the admin form, so this is simpler than
 * diffing). */
export async function setQuantityDiscount(
  productId: string,
  tiers: QuantityDiscountTierInput[],
): Promise<QuantityDiscount> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: discount, error: upsertError } = await supabase
    .from("quantity_discounts")
    .upsert({ product_id: productId, updated_by: user?.id ?? null }, { onConflict: "product_id" })
    .select()
    .single();
  if (upsertError) throw upsertError;

  const { error: deleteError } = await supabase
    .from("quantity_discount_tiers")
    .delete()
    .eq("quantity_discount_id", discount.id);
  if (deleteError) throw deleteError;

  const sorted = [...tiers].sort((a, b) => a.min_quantity - b.min_quantity);
  const { data: insertedTiers, error: insertError } = await supabase
    .from("quantity_discount_tiers")
    .insert(sorted.map((tier) => ({ ...tier, quantity_discount_id: discount.id })))
    .select();
  if (insertError) throw insertError;

  return { ...(discount as QuantityDiscount), tiers: (insertedTiers ?? []) as QuantityDiscountTier[] };
}

export async function removeQuantityDiscount(productId: string): Promise<void> {
  const { error } = await supabase.from("quantity_discounts").delete().eq("product_id", productId);
  if (error) throw error;
}
