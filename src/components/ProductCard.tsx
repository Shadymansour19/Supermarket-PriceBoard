import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DiscountPrice } from "./DiscountPrice";
import { FavoriteButton } from "./FavoriteButton";
import { discountPercent } from "../lib/discounts";
import { productImageUrl } from "../lib/supabase";
import { formatPrice, localizedField, shouldShowUnit } from "../lib/localize";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

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

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md"
    >
      {limitedTimeDiscount ? (
        <span className="font-label absolute start-2 top-2 z-10 rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">
          -{discountPercent(product.price, limitedTimeDiscount.new_price)}%
        </span>
      ) : (
        cheapestTier && (
          <span className="font-label absolute start-2 top-2 z-10 rounded-full bg-amber-600 px-2 py-0.5 text-xs font-semibold text-white">
            {t("deals.wholesaleBadge")}
          </span>
        )
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
        <div className="font-label mt-auto flex items-center justify-between pt-1">
          {limitedTimeDiscount ? (
            <DiscountPrice
              originalPrice={product.price}
              newPrice={limitedTimeDiscount.new_price}
              lang={i18n.language}
              size="sm"
            />
          ) : cheapestTier ? (
            <span className="font-semibold text-emerald-700">
              {formatPrice(cheapestTier.price, i18n.language)}
              <span className="text-xs font-normal text-neutral-500">
                {" "}
                {t("deals.tierLabel", { count: cheapestTier.min_quantity })}
              </span>
            </span>
          ) : (
            <span className="font-semibold text-emerald-700">
              {formatPrice(product.price, i18n.language)}
              {shouldShowUnit(product.unit) && (
                <span className="text-xs font-normal text-neutral-500"> / {t(`unit.${product.unit}`)}</span>
              )}
            </span>
          )}
          {!product.in_stock && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              {t("product.outOfStock")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
