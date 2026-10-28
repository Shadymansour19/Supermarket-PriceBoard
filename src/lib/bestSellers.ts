import { fetchProductsByIds } from "./products";
import { supabase } from "./supabase";
import type { Product } from "../types/database";

/**
 * Logs a confirmed order's line items (see CartPage's
 * handleOrderViaWhatsApp) so best sellers can be ranked by real orders
 * rather than add-to-cart activity, which doesn't mean the customer
 * actually went through with it. Best-effort — losing this doesn't affect
 * the order itself, which already went out via WhatsApp independently.
 */
export async function recordOrderLineItems(items: { productId: string; quantity: number }[]): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((item) => ({ product_id: item.productId, quantity: item.quantity }));
  const { error } = await supabase.from("order_line_items").insert(rows);
  if (error) throw error;
}

/** Best-selling active products over the last `daysBack` days, ranked by
 * total ordered quantity via the `best_selling_products` RPC — it
 * aggregates `order_line_items` server-side, since anon has no select
 * policy on that table directly (only the aggregate is ever exposed). */
export async function fetchBestSellingProducts(daysBack = 30, limit = 8): Promise<Product[]> {
  const { data, error } = await supabase.rpc("best_selling_products", { days_back: daysBack, result_limit: limit });
  if (error) throw error;
  const ids: string[] = (data ?? []).map((row: { product_id: string }) => row.product_id);
  if (ids.length === 0) return [];

  const products = await fetchProductsByIds(ids);
  // fetchProductsByIds doesn't preserve input order (and drops ids for
  // products since hidden/deleted) — re-derive the ranking from the RPC's
  // own order instead.
  const byId = new Map<string, Product>(products.map((product) => [product.id, product]));
  return ids.map((id) => byId.get(id)).filter((product): product is Product => product !== undefined);
}

/** Every product's total ordered quantity, for the catalog grid's "best
 * selling" sort — a full year back and a high limit, unlike the home
 * teaser's 30-day/8-item version, since sorting an entire category by
 * sales should reflect its whole history, not just a recent highlight
 * reel. A product with no orders at all simply never gets a map entry
 * (absence means 0, not that something failed). */
export async function fetchOrderCountMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("best_selling_products", { days_back: 365, result_limit: 10000 });
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of (data ?? []) as { product_id: string; total_quantity: number }[]) {
    map.set(row.product_id, row.total_quantity);
  }
  return map;
}
