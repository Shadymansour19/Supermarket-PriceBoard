import type { Product } from "../types/database";

/** Smallest purchasable fraction (e.g. 0.01 kg = 10 g). The DB keeps 3
 * decimals, so nothing finer is representable anyway. */
export const MIN_FRACTION = 0.01;

/** Rounds to the 3 decimals the database stores — also cleans up float
 * noise like 0.1 + 0.2 = 0.30000000000000004. */
export function roundQuantity(quantity: number): number {
  return Math.round(quantity * 1000) / 1000;
}

/** Smallest quantity of this product that can be bought. */
export function minQuantity(product: Pick<Product, "allow_fraction">): number {
  return product.allow_fraction ? MIN_FRACTION : 1;
}

/** Most that can be bought given stock on hand, or undefined when stock
 * isn't tracked for it (0 on hand but still marked in stock — an older
 * product nobody has counted yet — means "no limit", not "none left"). */
export function maxQuantity(product: Pick<Product, "allow_fraction" | "stock_quantity">): number | undefined {
  if (product.stock_quantity <= 0) return undefined;
  return product.allow_fraction ? product.stock_quantity : Math.floor(product.stock_quantity);
}
