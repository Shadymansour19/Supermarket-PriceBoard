import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AddToCartButton } from "./AddToCartButton";
import { DiscountPrice } from "./DiscountPrice";
import { FavoriteButton } from "./FavoriteButton";
import { daysRemaining, discountPercent } from "../lib/discounts";
import { productImageUrl } from "../lib/supabase";
import { formatPrice, localizedField, shouldShowUnit } from "../lib/localize";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/** From this percent off up, a deal is "hot" enough to earn the
 * flame-badge + glow treatment — below it, the plain gradient badge alone
 * is enough. Keeps it meaningful (a genuinely standout deal) instead of
 * every discounted card in a full grid getting the same treatment. */
const HOT_DEAL_THRESHOLD = 20;

/** Individual flame tongues making up the fire frame around a hot-deal
 * card — concentrated along the top edge (like a fireplace opening) and
 * tapering down the upper sides, left empty along the bottom to match the
 * reference look instead of a uniform ring. `left`/`top` position each
 * flame's own center (in %/px, `top` relative to the card's own top edge,
 * negative = poking above it); `rotate` leans the side flames outward;
 * `delay` staggers each one's flicker so they don't pulse in sync. */
const HOT_CARD_FLAMES = [
  { left: 6, top: -14, size: 22, rotate: -14, delay: 0.1 },
  { left: 16, top: -24, size: 28, rotate: -6, delay: 0.4 },
  { left: 27, top: -30, size: 30, rotate: 3, delay: 0 },
  { left: 38, top: -26, size: 26, rotate: -4, delay: 0.25 },
  { left: 50, top: -32, size: 34, rotate: 0, delay: 0.15 },
  { left: 62, top: -26, size: 26, rotate: 4, delay: 0.35 },
  { left: 73, top: -30, size: 30, rotate: -3, delay: 0.05 },
  { left: 84, top: -24, size: 28, rotate: 6, delay: 0.3 },
  { left: 94, top: -14, size: 22, rotate: 14, delay: 0.2 },
  { left: 0, top: 6, size: 18, rotate: -24, delay: 0.45 },
  { left: 100, top: 6, size: 18, rotate: 24, delay: 0.5 },
  { left: 0, top: 34, size: 14, rotate: -30, delay: 0.55 },
  { left: 100, top: 34, size: 14, rotate: 30, delay: 0.15 },
];

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
      className={`group relative flex flex-col rounded-xl border bg-white transition hover:shadow-md ${
        isHotDeal ? "card-fire-glow border-orange-300" : "border-neutral-200"
      }`}
    >
      {isHotDeal && (
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
          {HOT_CARD_FLAMES.map((f, i) => (
            <span
              key={i}
              className="absolute"
              style={{
                left: `${f.left}%`,
                top: `${f.top}px`,
                width: f.size,
                height: f.size * 1.3,
                transform: `translateX(-50%) rotate(${f.rotate}deg)`,
              }}
            >
              <span
                className="card-flame-shape flame-flicker block h-full w-full"
                style={{ animationDelay: `${f.delay}s` }}
              />
            </span>
          ))}
        </div>
      )}
      {(limitedTimeDiscount || cheapestTier) &&
        (isHotDeal ? (
          // "Comet" badge — a HOT bubble with a single flickering flame
          // trailing off it, overlapping into the percentage pill —
          // replaces the plain badge for deals that clear the hot-deal
          // threshold, instead of stacking a separate flame ring around
          // the whole card.
          <div className="absolute start-2 top-2 z-10">
            {/* Forced `dir="ltr"` — this badge is a small fixed graphic
             * (ball trailing into a pill), not reading text, so its
             * internal layout must stay the same shape in both languages
             * instead of mirroring like the rest of the RTL-aware page.
             * Only this inner wrapper is forced; the outer div above keeps
             * logical start/top positioning so the badge itself still
             * lands on the correct (non-colliding) corner next to the
             * favorite button in both languages. */}
            <div dir="ltr" className="flex items-center">
              <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 shadow-md">
                <span className="font-label text-[9px] font-extrabold leading-none text-red-600">HOT</span>
                <span
                  aria-hidden="true"
                  className="flame-flicker absolute -top-2.5 left-1/2 -translate-x-1/2 text-base"
                >
                  🔥
                </span>
              </span>
              <span className="font-label -ml-2.5 rounded-full bg-gradient-to-r from-red-600 to-red-500 py-1 pl-4 pr-2.5 text-xs font-bold text-white shadow-md">
                -{percentOff}%
              </span>
            </div>
          </div>
        ) : (
          <span className="font-label absolute start-2 top-2 z-10 rounded-full bg-gradient-to-br from-red-600 to-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-md ring-2 ring-white">
            -{percentOff}%
          </span>
        ))}
      <FavoriteButton
        productId={product.id}
        stopNavigation
        className="absolute end-2 top-2 z-10 h-8 w-8 bg-white/90 shadow-sm hover:bg-white"
      />
      <div className="aspect-square w-full overflow-hidden rounded-t-xl bg-neutral-100">
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
