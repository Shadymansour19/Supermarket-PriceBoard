import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AskWhatsAppButton } from "../../components/AskWhatsAppButton";
import { DiscountPrice } from "../../components/DiscountPrice";
import { FavoriteButton } from "../../components/FavoriteButton";
import { QuantityStepper } from "../../components/QuantityStepper";
import { ShareWhatsAppButton } from "../../components/ShareWhatsAppButton";
import { SimilarProductsSection } from "../../components/SimilarProductsSection";
import { useCart } from "../../context/CartContext";
import { flyToCart } from "../../lib/cartFlyAnimation";
import { fetchLimitedTimeDiscount, fetchQuantityDiscount, isLimitedTimeDiscountActive } from "../../lib/discounts";
import { formatPrice, localizedField, shouldShowUnit } from "../../lib/localize";
import { fetchProductById } from "../../lib/products";
import { recordProductView } from "../../lib/recentlyViewed";
import { productImageUrl } from "../../lib/supabase";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../../types/database";

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [limitedTimeDiscount, setLimitedTimeDiscount] = useState<LimitedTimeDiscount | null>(null);
  const [quantityDiscount, setQuantityDiscount] = useState<QuantityDiscount | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!productId) return;
    fetchProductById(productId).then((fetchedProduct) => {
      setProduct(fetchedProduct);
      if (fetchedProduct) recordProductView(fetchedProduct.id);
    });
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

  function handleAddToCart() {
    // Safe: this handler is only ever wired up to a button below, which
    // only renders once the early returns above have ruled out null/undefined.
    const id = product!.id;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    if (imageContainerRef.current) {
      flyToCart(imageContainerRef.current, imageUrl, () => addToCart(id, quantity));
    } else {
      addToCart(id, quantity);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/" className="font-label mb-4 inline-block text-sm text-emerald-700 underline">
        {t("product.backToCatalog")}
      </Link>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {/* Square, matching the admin upload/capture crop exactly — the
         * add-to-cart row is sticky-clamped near the bottom independently
         * of this, so a taller image no longer risks landing it behind
         * the fixed bottom nav/cart button on shorter phones. */}
        <div ref={imageContainerRef} className="aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
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

          {/* Sticky (not fixed) on mobile, clamped just above the notched
           * cart button/bottom nav — a plain in-flow row here can land
           * exactly behind those on shorter phones, since a full-width
           * product image plus everything above it can easily exceed a
           * short viewport's height on its own. `sticky` still scrolls
           * normally the rest of the time, it just refuses to go further
           * than that safe distance from the bottom. Reverts to a normal
           * inline row from `sm:` up, where the two-column layout means
           * this never gets anywhere near the bottom of the viewport. */}
          <div className="sticky bottom-[var(--mobile-fab-safe)] z-20 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.in_stock}
              className="font-label flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none"
            >
              {justAdded ? t("cart.added") : t("cart.addToCart")}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <SimilarProductsSection product={product} />
      </div>
    </div>
  );
}

/** Whole days left until `endsAt`, floored at 0 (never shows negative). */
function daysRemaining(endsAt: string): number {
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}
