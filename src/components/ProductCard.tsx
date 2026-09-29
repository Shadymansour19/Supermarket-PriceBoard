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
        isHotDeal ? "card-border-glow border-2 border-amber-400" : "border border-neutral-200"
      }`}
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
        {isHotDeal && (
          <img
            src="/fire-frame.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -start-[9.3%] h-auto max-w-none w-[119.5%]"
            style={{ top: "-21cqw" }}
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
             * image and pill drifting out of proportion with each other.
             * This div is left at its natural (unshifted) position — the
             * favorite button and the plain badge are the ones that move
             * to match *this* badge's level (via `--badge-level` in
             * index.css, defined to equal exactly where the ball inside
             * hot-badge.png naturally sits), not the other way around. */}
            <div dir="ltr" className="flex items-center">
              <img
                src="/hot-badge.png"
                alt=""
                className="relative z-10 shrink-0"
                style={{
                  width: "calc(5.5rem * var(--hb-scale))",
                  height: "auto",
                  transform: "translateX(calc(15px * var(--hb-scale)))",
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
                  paddingInlineStart: "calc(40px * var(--hb-scale))",
                  paddingInlineEnd: "calc(12px * var(--hb-scale))",
                  fontSize: "calc(0.875rem * var(--hb-scale))",
                }}
              >
                -{percentOff}%
              </span>
            </div>
          </div>
        ) : (
          // Fixed `h-8` + flex centering (rather than relying on text
          // metrics + padding to happen to land at some height) so its
          // center lands exactly at `top + 16px`, matching the `-16px`
          // in its own `top` below. `dir="ltr"` on the *inner* span (not
          // this outer one) keeps "-52%" reading the same way in Arabic
          // as in English — plain text with a leading "-" and trailing
          // "%" is exactly the kind of thing the bidi algorithm reorders
          // around digits in an RTL context (it was rendering as
          // "52%-") — while this outer span's own `start-2` stays
          // logical/RTL-aware, so the badge still lands on the correct
          // corner instead of colliding with the favorite button (that
          // bug already happened once before, on the hot badge).
          <span
            className="font-label absolute start-2 z-30 flex h-8 items-center rounded-full bg-red-600 bg-gradient-to-br from-red-600 to-orange-500 px-2 text-xs font-bold text-white shadow-md ring-2 ring-white"
            style={{ top: "calc(var(--badge-level) - 16px)" }}
          >
            <span dir="ltr">-{percentOff}%</span>
          </span>
        ))}
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
        <div className="font-label mt-auto flex flex-col gap-1 pt-1">
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
          {/* Its own line now (was sharing a row with the price) — the
           * quantity stepper + cart button together are wider than the
           * old single icon button, and squeezed next to the price it
           * was crowding out longer prices/discounts on a narrow card. */}
          {product.in_stock ? (
            <AddToCartButton productId={product.id} imageUrl={imageUrl} stopNavigation className="self-start" />
          ) : (
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
