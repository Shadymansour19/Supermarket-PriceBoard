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
      className={`group relative flex flex-col rounded-xl bg-white transition hover:shadow-md ${
        isHotDeal ? "border-2 border-amber-400" : "border border-neutral-200"
      }`}
      style={{ containerType: "inline-size" }}
    >
      {isHotDeal && (
        // Static (no animation) — fire-frame.png is the user-supplied
        // reference image used as-is, rendered via CSS `border-image`
        // instead of a plain absolutely-positioned/stretched `<img>`.
        // border-image is what actually solves "resize correctly on any
        // card size": its 9-slice model keeps the flame's own corner and
        // edge art at the right proportions no matter the box's
        // width/height, instead of the whole image being stretched
        // non-uniformly to fit (which is what distorted the shapes on
        // every earlier hand-drawn attempt whenever a card ended up a
        // different height than the one thing was tuned against).
        // border-image-outset (not manual negative positioning) is what
        // lets the flame visually poke above/beside the card's own edges
        // — it's a real CSS feature for exactly this, sized as multiples
        // of border-image-width so it scales right along with it. No
        // bottom slice/width here since the source image has no flame
        // along the bottom edge, matching the plain glowing border there.
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20"
          style={{
            borderStyle: "solid",
            borderWidth: 1,
            borderColor: "transparent",
            borderImageSource: "url(/fire-frame.png)",
            borderImageSlice: "300 200 0 210",
            borderImageWidth: "21.77cqw 14.51cqw 0 15.24cqw",
            borderImageOutset: "0.6 0.4 0 0.4",
            borderImageRepeat: "stretch",
          }}
        />
      )}
      {(limitedTimeDiscount || cheapestTier) &&
        (isHotDeal ? (
          // "Comet" badge — a HOT bubble with a flame trailing off it,
          // overlapping into the percentage pill. hot-badge.png is the
          // reference "HOT" ball+flame image supplied by the user, used
          // untouched (no recoloring, no re-cutting its transparency) —
          // the pill is a plain CSS element behind/under it since the
          // source image has no pill of its own to reuse.
          <div className="absolute start-2 top-2 z-30">
            {/* Forced `dir="ltr"` — this badge is a small fixed graphic
             * (ball trailing into a pill), not reading text, so its
             * internal layout must stay the same shape in both languages
             * instead of mirroring like the rest of the RTL-aware page.
             * Only this inner wrapper is forced; the outer div above keeps
             * logical start/top positioning so the badge itself still
             * lands on the correct (non-colliding) corner next to the
             * favorite button in both languages. */}
            <div dir="ltr" className="flex items-center">
              <img src="/hot-badge.png" alt="" className="relative z-10 h-14 w-[5.5rem] shrink-0 translate-x-[15px]" />
              {/* The ball inside hot-badge.png sits well below the
               * image's own vertical center (the flame reaches much
               * higher above it than the ball extends below it) — flex
               * `items-center` alone aligns the pill to the image's
               * midpoint, not the ball, so it's nudged down to the ball's
               * actual center (measured at ~65% of the image's height). */}
              <span className="font-label -ml-11 translate-y-[8px] rounded-full bg-red-600 bg-gradient-to-r from-red-600 to-red-500 py-1 pl-14 pr-3 text-sm font-bold text-yellow-300 shadow-md">
                -{percentOff}%
              </span>
            </div>
          </div>
        ) : (
          <span className="font-label absolute start-2 top-2 z-30 rounded-full bg-red-600 bg-gradient-to-br from-red-600 to-orange-500 px-2 py-0.5 text-xs font-bold text-white shadow-md ring-2 ring-white">
            -{percentOff}%
          </span>
        ))}
      <FavoriteButton
        productId={product.id}
        stopNavigation
        className="absolute end-2 top-2 z-30 h-8 w-8 bg-white/90 shadow-sm hover:bg-white"
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
