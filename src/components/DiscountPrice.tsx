import { discountPercent } from "../lib/discounts";
import { formatPrice } from "../lib/localize";

/**
 * Shared discount price display for both discount types: original price
 * struck through in red, the new price beside it, and a savings-percent
 * badge — see SPEC.md decision log.
 */
export function DiscountPrice({
  originalPrice,
  newPrice,
  lang,
  size = "md",
}: {
  originalPrice: number;
  newPrice: number;
  lang: string;
  size?: "sm" | "md" | "lg";
}) {
  const percent = discountPercent(originalPrice, newPrice);
  const newPriceClass = size === "lg" ? "text-2xl font-semibold" : size === "sm" ? "text-sm font-semibold" : "font-semibold";
  const originalPriceClass = size === "lg" ? "text-base" : "text-sm";

  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className={`text-red-500 line-through ${originalPriceClass}`}>{formatPrice(originalPrice, lang)}</span>
      <span className={`text-emerald-700 ${newPriceClass}`}>{formatPrice(newPrice, lang)}</span>
      {percent > 0 && (
        <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">-{percent}%</span>
      )}
    </span>
  );
}
