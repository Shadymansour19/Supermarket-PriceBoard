import { supabase } from "./supabase";
import type { PaymentsBucket, StockValuation } from "../types/database";

export type Granularity = "day" | "week" | "month";

/** How many periods back each view charts (including the current one). */
export const BUCKET_COUNT: Record<Granularity, number> = { day: 14, week: 12, month: 12 };

/** Money in (sales) and out (purchases) per day/week/month, oldest first —
 * aggregated in the database (`payments_by_period`, admin only). */
export async function fetchPayments(granularity: Granularity): Promise<PaymentsBucket[]> {
  const { data, error } = await supabase.rpc("payments_by_period", {
    p_granularity: granularity,
    p_buckets: BUCKET_COUNT[granularity],
  });
  if (error) throw error;
  return ((data ?? []) as PaymentsBucket[]).map((row) => ({
    bucket: row.bucket,
    payments_in: Number(row.payments_in),
    payments_out: Number(row.payments_out),
  }));
}

/** What's on the shelves right now, at cost and at selling price. */
export async function fetchStockValuation(): Promise<StockValuation> {
  const { data, error } = await supabase.rpc("stock_valuation");
  if (error) throw error;
  const row = (data as StockValuation[])[0];
  return {
    cost_value: Number(row.cost_value),
    retail_value: Number(row.retail_value),
    products_in_stock: Number(row.products_in_stock),
    products_missing_cost: Number(row.products_missing_cost),
  };
}
