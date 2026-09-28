import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AddToCartButton } from "./AddToCartButton";
import { DiscountPrice } from "./DiscountPrice";
import { FavoriteButton } from "./FavoriteButton";
import { daysRemaining, discountPercent } from "../lib/discounts";
import { productImageUrl } from "../lib/supabase";
import { formatPrice, localizedField, shouldShowUnit } from "../lib/localize";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/** From this percent off up, a deal is "hot" enough to earn the flame +
 * pulse treatment — below it, the gradient badge alone is enough. Keeps
 * the animation meaningful (a genuinely standout deal) instead of every
 * discounted card in a full grid pulsing at once. */
const HOT_DEAL_THRESHOLD = 20;

export function ProductCard({
  product,
  limitedTimeDiscount,
  quantityDiscount,
}: {
  product: Product;
  limitedTimeDiscount?: LimitedTimeDiscount;
  /** Only the cheapest (lowest min_quantity) tier is shown, to keep the
   * card compact — the full tier table stays a product-detail-page thing.
   * Ignored if `limitedTimeDiscount` is also passed; a card only ever
   * headlines one kind of deal. */
  quantityDiscount?: QuantityDiscount;
}) {
  const { t, i18n } = useTranslation();
  const imageUrl = productImageUrl(product.image_path);
  const name = localizedField(product, "name", i18n.language);
  const cheapestTier = quantityDiscount?.tiers[0];
  const percentOff = limitedTimeDiscount
    ? discountPercent(product.price, limitedTimeDiscount.new_price)
    : cheapestTier
      ? discountPercent(product.price, cheapestTier.price)
      : 0;
  const isHotDeal = percentOff >= HOT_DEAL_THRESHOLD;

  return (
    <Link
      to={`/product/${product.id}`}
      className={`group relative flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-md ${
        isHotDeal ? "card-fire-glow border-orange-300" : "border-neutral-200"
      }`}
    >
      {(limitedTimeDiscount || cheapestTier) && (
        <span
          className={`font-label absolute start-2 top-2 z-10 flex items-center gap-0.5 rounded-full bg-gradient-to-br from-red-600 to-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-md ring-2 ring-white ${
            isHotDeal ? "hero-badge-pulse" : ""
          }`}
        >
          {isHotDeal && <span aria-hidden="true">🔥</span>}-{percentOff}%
        </span>
      )}
      <FavoriteButton
        productId={product.id}
        stopNavigation
        className="absolute end-2 top-2 z-10 h-8 w-8 bg-white/90 shadow-sm hover:bg-white"
      />
      <div className="aspect-square w-full bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <span className="text-4xl">🛒</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-label line-clamp-2 min-h-[2.5rem] text-sm font-medium text-neutral-900">{name}</h3>
        {/* Always rendered (even without a size) so every card reserves the
         * same vertical space here instead of shrinking. */}
        <span className="font-label text-xs text-neutral-500">{product.size || " "}</span>
        <div className="font-label mt-auto flex flex-col gap-0.5 pt-1">
          <div className="flex items-center justify-between">
            {limitedTimeDiscount ? (
              <DiscountPrice
                originalPrice={product.price}
                newPrice={limitedTimeDiscount.new_price}
                lang={i18n.language}
                size="sm"
              />
            ) : cheapestTier ? (
              <DiscountPrice
                originalPrice={product.price}
                newPrice={cheapestTier.price}
                lang={i18n.language}
                size="sm"
              />
            ) : (
              <span className="font-semibold text-emerald-700">
                {formatPrice(product.price, i18n.language)}
                {shouldShowUnit(product.unit) && (
                  <span className="text-xs font-normal text-neutral-500"> / {t(`unit.${product.unit}`)}</span>
                )}
              </span>
            )}
            {product.in_stock ? (
              <AddToCartButton
                productId={product.id}
                imageUrl={imageUrl}
                stopNavigation
                className="h-7 w-7 shrink-0"
              />
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                {t("product.outOfStock")}
              </span>
            )}
          </div>
          {/* The badge/price alone would read as an unconditional price
           * drop — this is the only place left saying it only applies
           * when buying the minimum quantity. */}
          {cheapestTier && !limitedTimeDiscount && (
            <span className="text-xs text-neutral-500">{t("deals.tierLabel", { count: cheapestTier.min_quantity })}</span>
          )}
          {/* A bit of urgency for the "hot" deals specifically — small
           * enough not to compete with the badge/price for attention on
           * an ordinary discount. */}
          {limitedTimeDiscount && isHotDeal && (
            <span className="text-xs font-medium text-red-600">
              {t("deals.endsIn", { count: daysRemaining(limitedTimeDiscount.ends_at) })}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
