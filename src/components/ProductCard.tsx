import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AddToCartButton } from "./AddToCartButton";
import { DiscountPrice } from "./DiscountPrice";
import { FavoriteButton } from "./FavoriteButton";
import { HOT_DEAL_THRESHOLD, daysRemaining, discountPercent } from "../lib/discounts";
import { fetchFirstExtraImage } from "../lib/productImages";
import { productImageUrl } from "../lib/supabase";
import { formatPrice, localizedField, shouldShowUnit } from "../lib/localize";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

export function ProductCard({
  product,
  limitedTimeDiscount,
  quantityDiscount,
  hideFireFrame = false,
}: {
  product: Product;
  limitedTimeDiscount?: LimitedTimeDiscount;
  /** Only the cheapest (lowest min_quantity) tier is shown, to keep the
   * card compact — the full tier table stays a product-detail-page thing.
   * Ignored if `limitedTimeDiscount` is also passed; a card only ever
   * headlines one kind of deal. */
  quantityDiscount?: QuantityDiscount;
  /** Drops just the oversized flame-frame image behind a hot deal's photo —
   * the badge and border stay. Used in the dense 2-column grid (catalog,
   * deals/wholesale/favorites pages); the carousel sections keep it. */
  hideFireFrame?: boolean;
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

  // Driven by JS state (not CSS `:hover`) so a touch-screen press gets the
  // exact same lift/shadow/image-swap as a mouse hover — `:hover` on touch
  // devices is inconsistent (some browsers apply it briefly on tap, some
  // leave it "stuck" until the next tap elsewhere). The second image is
  // fetched lazily on the first hover/touch, not up front, so a card
  // nobody interacts with never costs a request for an image nobody sees.
  const [isActive, setIsActive] = useState(false);
  const [secondImageUrl, setSecondImageUrl] = useState<string | null>(null);
  const [hasFetchedSecondImage, setHasFetchedSecondImage] = useState(false);

  function handleActivate() {
    setIsActive(true);
    if (hasFetchedSecondImage) return;
    setHasFetchedSecondImage(true);
    fetchFirstExtraImage(product.id)
      .then((path) => {
        if (path) setSecondImageUrl(productImageUrl(path));
      })
      .catch(() => {});
  }

  return (
    <Link
      to={`/product/${product.id}`}
      onMouseEnter={handleActivate}
      onMouseLeave={() => setIsActive(false)}
      onTouchStart={handleActivate}
      onTouchEnd={() => setIsActive(false)}
      className={`group relative flex flex-col rounded-xl bg-white transition-all duration-200 ${
        isActive ? "-translate-y-1 shadow-lg" : ""
      } ${isHotDeal ? "hot-border-travel" : "border border-neutral-200"}`}
      style={{ containerType: "inline-size" }}
    >
      {/* `.product-card` (the --hb-scale/--badge-level container-query
       * scope) lives on this wrapper, not the Link above — a container
       * query can't restyle the same element that establishes the
       * container (that's a spec rule against self-referential
       * containment, not a bug), so it has to sit on a descendant.
       * `pointer-events-none` + individual `pointer-events-auto` back on
       * the favorite button keeps this purely-decorative-except-for-that
       * wrapper from intercepting clicks meant for the image/content
       * below it. */}
      <div className="product-card pointer-events-none absolute inset-0 z-20">
        {isHotDeal && !hideFireFrame && (
          <img
            src="/fire-frame.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -start-[14%] h-auto max-w-none w-[136%]"
            style={{ top: "-36cqw" }}
          />
        )}
        {(limitedTimeDiscount || cheapestTier) && (
          // One shared "comet" structure for both — this is the original
          // hot badge layout, unchanged, with the ball simply invisible
          // (but still occupying its layout space) when not a hot deal.
          // That's what keeps the pill's own position pixel-identical
          // between the two instead of needing separately-derived offsets
          // for each — a plain `opacity-0` on an `invisible` ball doesn't
          // shift anything the pill's own margin/flex math depends on.
          <div className="absolute start-5 top-2 z-30">
            {/* Forced `dir="ltr"` — this badge is a small fixed graphic
             * (ball trailing into a pill), not reading text, so its
             * internal layout must stay the same shape in both languages
             * instead of mirroring like the rest of the RTL-aware page.
             * Only this inner wrapper is forced; the outer div above keeps
             * logical start/top positioning so the badge itself still
             * lands on the correct (non-colliding) corner next to the
             * favorite button in both languages.
             *
             * Everything below scales off the single `--hb-scale`
             * variable (1 normally, 0.68 on a narrower card per the
             * `.product-card` container query in index.css) so the whole
             * badge shrinks together on a smaller card instead of the
             * image and pill drifting out of proportion with each other. */}
            <div dir="ltr" className="flex items-center">
              <img
                src="/hot-badge.png"
                alt=""
                aria-hidden="true"
                className={`relative z-10 shrink-0 ${isHotDeal ? "" : "opacity-0"}`}
                style={{
                  width: "calc(5.5rem * var(--hb-scale))",
                  height: "auto",
                  transform: "translateX(calc(16px * var(--hb-scale)))",
                }}
              />
              {/* The pill's own extra offset (on top of the outer one
               * above) aligns it with where the flame's tail meets the
               * ball specifically, not the image's overall center. */}
              <span
                className="font-label rounded-full bg-red-600 bg-gradient-to-r from-red-600 to-red-500 font-bold text-yellow-300 shadow-md"
                style={{
                  marginLeft: "calc(-44px * var(--hb-scale))",
                  transform: "translateY(calc(8px * var(--hb-scale)))",
                  paddingBlock: "calc(4px * var(--hb-scale))",
                  // Hot needs the big asymmetric start padding to leave
                  // room for the ball's tail underneath it — without a
                  // visible ball there, that same padding just reads as
                  // the text sitting off-center in its own pill, so
                  // non-hot gets equal padding on both sides instead.
                  paddingInlineStart: `calc(${isHotDeal ? 32 : 12}px * var(--hb-scale))`,
                  paddingInlineEnd: "calc(12px * var(--hb-scale))",
                  fontSize: "calc(0.875rem * var(--hb-scale))",
                }}
              >
                <span dir="ltr">-{percentOff}%</span>
              </span>
            </div>
          </div>
        )}
        <FavoriteButton
          productId={product.id}
          stopNavigation
          // Scales with the same --hb-scale as the hot badge (so it
          // shrinks to match on a narrower "all products" card), and its
          // `top` is pinned to --badge-level — the hot badge's own
          // natural resting position — rather than a fixed top-2, so it
          // lines up with the hot badge instead of the hot badge being
          // pulled up to it. `pointer-events-auto` opts back in since the
          // wrapping div above turns pointer events off for everything
          // else in it.
          className="pointer-events-auto absolute end-2 z-30 bg-white/90 shadow-sm hover:bg-white"
          style={{
            top: "calc(var(--badge-level) - 1rem * var(--hb-scale))",
            height: "calc(2rem * var(--hb-scale))",
            width: "calc(2rem * var(--hb-scale))",
          }}
          iconClassName="shrink-0"
          iconStyle={{
            height: "calc(1.25rem * var(--hb-scale))",
            width: "calc(1.25rem * var(--hb-scale))",
          }}
        />
      </div>
      {/* Outer wrapper has no overflow clipping of its own — it exists so
       * the floating add-to-cart button below can be a sibling of the
       * (clipped) photo box instead of a child of it. As a child, the
       * button's bottom half (meant to overlap the card content below the
       * photo) was being clipped off by the photo box's own
       * `overflow-hidden`, which it still needs to contain the oversized
       * fire frame. */}
      <div className="relative aspect-square w-full">
        <div className="relative h-full w-full overflow-hidden rounded-t-xl bg-neutral-100">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt={name}
                className={`h-full w-full object-cover transition duration-200 ${isActive ? "scale-105" : ""} ${
                  isActive && secondImageUrl ? "opacity-0" : "opacity-100"
                }`}
                loading="lazy"
              />
              {/* A product's second photo (lib/productImages.ts) — only
               * fetched once hovered/touched, so it overlays the cover
               * photo rather than replacing it outright (nothing to show
               * while it's still loading on that first interaction). */}
              {secondImageUrl && (
                <img
                  src={secondImageUrl}
                  alt=""
                  aria-hidden="true"
                  className={`absolute inset-0 h-full w-full object-cover transition duration-200 ${
                    isActive ? "scale-105 opacity-100" : "opacity-0"
                  }`}
                />
              )}
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <span className="text-4xl">🛒</span>
            </div>
          )}
        </div>
        {product.in_stock && (
          // `left-1/2` (physical), not `start-1/2` (logical) — centering
          // is direction-independent, but `start-1/2` resolves to `right:
          // 50%` in RTL, and `-translate-x-1/2` is always a physical
          // leftward shift regardless of direction. Pairing a logical
          // anchor with a physical transform only cancels out correctly
          // in LTR; in RTL it shifted the button a full half-width left
          // of true center.
          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2">
            <AddToCartButton productId={product.id} imageUrl={imageUrl} stopNavigation className="h-10 w-10" />
          </div>
        )}
      </div>
      {/* `pt-6` (more than the `p-3` default) reserves enough clearance
       * for the floating add-to-cart button above, which overlaps this
       * area by half its own height (20px) — without it, the button sat
       * on top of the product name instead of just above it. */}
      <div className="flex flex-1 flex-col gap-1 px-3 pb-3 pt-6">
        <h3 className="font-label line-clamp-2 min-h-[2.5rem] text-sm font-medium text-neutral-900">{name}</h3>
        {/* Always rendered (even without a size) so every card reserves the
         * same vertical space here instead of shrinking. */}
        <span className="font-label text-xs text-neutral-500">{product.size || " "}</span>
        <div className="font-label mt-auto flex flex-col gap-1 pt-1">
          {limitedTimeDiscount ? (
            <DiscountPrice
              originalPrice={product.price}
              newPrice={limitedTimeDiscount.new_price}
              lang={i18n.language}
              size="sm"
              showPercent={false}
            />
          ) : cheapestTier ? (
            <DiscountPrice
              originalPrice={product.price}
              newPrice={cheapestTier.price}
              lang={i18n.language}
              size="sm"
              showPercent={false}
            />
          ) : (
            <span className="font-semibold text-emerald-700">
              {formatPrice(product.price, i18n.language)}
              {shouldShowUnit(product.unit) && (
                <span className="text-xs font-normal text-neutral-500"> / {t(`unit.${product.unit}`)}</span>
              )}
            </span>
          )}
          {/* The add-to-cart button itself now floats on the photo above
           * (bottom-center) — this only still needs to say something when
           * there's no button to show instead. */}
          {!product.in_stock && (
            <span className="w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              {t("product.outOfStock")}
            </span>
          )}
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
