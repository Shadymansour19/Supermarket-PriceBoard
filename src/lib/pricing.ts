import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/** The cheapest price this item can actually be bought at, at the given
 * quantity — unlike the catalog card (which only ever headlines one kind
 * of deal, for a clean, uncluttered display), the cart and the cashier's
 * invoice are where money is on the line, so this compares every offer
 * that currently applies (regular price, an active limited-time discount,
 * the best quantity-discount tier this quantity qualifies for) and picks
 * whichever is actually lowest, instead of assuming one type always
 * beats the other. */
export function unitPriceFor(
  product: Pick<Product, "price">,
  quantity: number,
  limitedTimeDiscount: LimitedTimeDiscount | undefined,
  quantityDiscount: QuantityDiscount | undefined,
): number {
  const candidates = [product.price];
  if (limitedTimeDiscount) candidates.push(limitedTimeDiscount.new_price);
  const bestTier = quantityDiscount?.tiers
    .filter((tier) => tier.min_quantity <= quantity)
    .sort((a, b) => b.min_quantity - a.min_quantity)[0];
  if (bestTier) candidates.push(bestTier.price);
  return Math.min(...candidates);
}
