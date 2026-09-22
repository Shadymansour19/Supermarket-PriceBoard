import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AskWhatsAppButton } from "../../components/AskWhatsAppButton";
import { DiscountPrice } from "../../components/DiscountPrice";
import { FavoriteButton } from "../../components/FavoriteButton";
import { ShareWhatsAppButton } from "../../components/ShareWhatsAppButton";
import { fetchLimitedTimeDiscount, fetchQuantityDiscount, isLimitedTimeDiscountActive } from "../../lib/discounts";
import { formatPrice, localizedField, shouldShowUnit } from "../../lib/localize";
import { fetchProductById } from "../../lib/products";
import { productImageUrl } from "../../lib/supabase";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../../types/database";

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [limitedTimeDiscount, setLimitedTimeDiscount] = useState<LimitedTimeDiscount | null>(null);
  const [quantityDiscount, setQuantityDiscount] = useState<QuantityDiscount | null>(null);

  useEffect(() => {
    if (!productId) return;
    fetchProductById(productId).then(setProduct);
    fetchLimitedTimeDiscount(productId)
      .then((discount) => setLimitedTimeDiscount(discount && isLimitedTimeDiscountActive(discount) ? discount : null))
      .catch(() => setLimitedTimeDiscount(null));
    fetchQuantityDiscount(productId)
      .then(setQuantityDiscount)
      .catch(() => setQuantityDiscount(null));
  }, [productId]);

  if (product === undefined) {
    return <p className="text-neutral-500">{t("common.loading")}</p>;
  }

  if (product === null) {
    return (
      <div className="space-y-4">
        <p className="text-neutral-500">{t("product.notFound")}</p>
        <Link to="/" className="text-emerald-700 underline">
          {t("product.backToCatalog")}
        </Link>
      </div>
    );
  }

  const imageUrl = productImageUrl(product.image_path);
  const name = localizedField(product, "name", i18n.language);
  const description = localizedField(product, "description", i18n.language);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="font-label mb-4 inline-block text-sm text-emerald-700 underline">
        {t("product.backToCatalog")}
      </Link>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <span className="text-6xl">🛒</span>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-heading text-2xl font-bold text-neutral-900">{name}</h1>
            <FavoriteButton productId={product.id} className="h-9 w-9 shrink-0 border border-neutral-200" />
          </div>
          {product.size && (
            <p className="font-label text-sm text-neutral-500">
              {t("product.size")}: {product.size}
            </p>
          )}
          <div className="font-label flex flex-wrap items-baseline gap-2">
            {limitedTimeDiscount ? (
              <DiscountPrice
                originalPrice={product.price}
                newPrice={limitedTimeDiscount.new_price}
                lang={i18n.language}
                size="lg"
              />
            ) : (
              <p className="text-2xl font-semibold text-emerald-700">
                {formatPrice(product.price, i18n.language)}
              </p>
            )}
            {shouldShowUnit(product.unit) && (
              <span className="text-base font-normal text-neutral-500">/ {t(`unit.${product.unit}`)}</span>
            )}
          </div>
          {limitedTimeDiscount && (
            <p className="text-sm text-red-600">
              {t("deals.endsIn", { count: daysRemaining(limitedTimeDiscount.ends_at) })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-label inline-block rounded-full px-3 py-1 text-sm ${
                product.in_stock ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {t(product.in_stock ? "product.inStock" : "product.outOfStock")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AskWhatsAppButton product={product} />
            <ShareWhatsAppButton product={product} />
          </div>
          {description && <p className="text-neutral-600">{description}</p>}

          {quantityDiscount && quantityDiscount.tiers.length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-3">
              <h2 className="font-heading mb-2 text-sm font-semibold text-neutral-900">{t("deals.quantityDiscountTitle")}</h2>
              <ul className="space-y-1.5">
                {quantityDiscount.tiers.map((tier) => (
                  <li key={tier.id} className="font-label flex items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-600">
                      {t("deals.tierLabel", { count: tier.min_quantity })}
                    </span>
                    <DiscountPrice
                      originalPrice={product.price}
                      newPrice={tier.price}
                      lang={i18n.language}
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Whole days left until `endsAt`, floored at 0 (never shows negative). */
function daysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
