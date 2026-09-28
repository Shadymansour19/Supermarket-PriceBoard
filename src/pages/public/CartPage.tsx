import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CloseIcon, WhatsAppIcon } from "../../components/ContactIcons";
import { QuantityStepper } from "../../components/QuantityStepper";
import { useCart } from "../../context/CartContext";
import { CONTACT } from "../../config";
import { confirmAfterReturn } from "../../lib/confirmAfterReturn";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals } from "../../lib/discounts";
import { formatPrice, localizedField } from "../../lib/localize";
import { recordOrder } from "../../lib/orderHistory";
import { fetchProductsByIds } from "../../lib/products";
import { productImageUrl } from "../../lib/supabase";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../../types/database";

/** The cheapest price this item can actually be bought at, at its current
 * cart quantity — unlike the catalog card (which only ever headlines one
 * kind of deal, for a clean, uncluttered display), the cart is where the
 * customer's money is on the line, so it compares every offer that
 * currently applies (regular price, an active limited-time discount, the
 * best quantity-discount tier this quantity qualifies for) and picks
 * whichever is actually lowest, instead of assuming one type always
 * beats the other. */
function unitPriceFor(
  product: Product,
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

export function CartPage() {
  const { t, i18n } = useTranslation();
  const { items, setItemQuantity, removeFromCart, clearCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityDealMap, setQuantityDealMap] = useState<Map<string, QuantityDiscount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([
      fetchProductsByIds(items.map((item) => item.productId)),
      fetchActiveLimitedTimeDiscountMap(),
      fetchActiveQuantityDeals(),
    ])
      .then(([fetchedProducts, limitedTime, quantityDeals]) => {
        setProducts(fetchedProducts);
        setLimitedTimeMap(limitedTime);
        setQuantityDealMap(new Map(quantityDeals.map(({ product, discount }) => [product.id, discount])));
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // Only the id set (not its identity) should re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((item) => item.productId).sort().join(",")]);

  const rows = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      const limitedTimeDiscount = limitedTimeMap.get(product.id);
      const quantityDiscount = quantityDealMap.get(product.id);
      const unitPrice = unitPriceFor(product, item.quantity, limitedTimeDiscount, quantityDiscount);
      return { product, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  const total = rows.reduce((sum, row) => sum + row.subtotal, 0);

  function handleClear() {
    if (!confirm(t("cart.confirmClearCart"))) return;
    clearCart();
  }

  function handleRemove(productId: string) {
    if (!confirm(t("cart.confirmRemoveItem"))) return;
    removeFromCart(productId);
  }

  function handleOrderViaWhatsApp() {
    const lines = rows.map((row) =>
      t("cart.whatsappLine", {
        name: localizedField(row.product, "name", i18n.language),
        quantity: row.quantity,
        subtotal: formatPrice(row.subtotal, i18n.language),
      }),
    );
    const message = [t("cart.whatsappIntro"), ...lines, t("cart.whatsappTotal", { total: formatPrice(total, i18n.language) })].join(
      "\n",
    );
    window.open(`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noreferrer");

    // Snapshotted now, at the moment of the click — `rows`/`total` belong
    // to this render and shouldn't be re-read later from possibly-stale
    // component state once the user actually comes back.
    const orderItems = rows.map((row) => ({
      productId: row.product.id,
      name: localizedField(row.product, "name", i18n.language),
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      subtotal: row.subtotal,
    }));
    // Only recorded (and the cart only cleared) once they actually leave
    // this tab and come back — a `wa.me` link gives no real confirmation
    // that the message was sent, so this is the closest available signal,
    // and clearing the cart immediately on click would risk wiping it out
    // for someone who back out of sending after all.
    confirmAfterReturn(() => {
      recordOrder(orderItems, total);
      clearCart();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("cart.title")}</h1>
        <div className="flex items-center gap-3">
          <Link to="/orders" className="text-sm font-medium text-emerald-700 hover:underline">
            {t("cart.orderHistory")}
          </Link>
          {rows.length > 0 && (
            <button type="button" onClick={handleClear} className="text-sm font-medium text-red-600 hover:underline">
              {t("cart.clearCart")}
            </button>
          )}
        </div>
      </div>

      {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}
      {!loading && !error && rows.length === 0 && <p className="text-neutral-500">{t("cart.empty")}</p>}

      {!loading && !error && rows.length > 0 && (
        <>
          <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {rows.map(({ product, quantity, unitPrice, subtotal }) => {
              const imageUrl = productImageUrl(product.image_path);
              const name = localizedField(product, "name", i18n.language);
              return (
                <li key={product.id} className="flex gap-3 p-3">
                  <Link to={`/product/${product.id}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    {imageUrl ? (
                      <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-neutral-300">
                        <span className="text-2xl">🛒</span>
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <Link to={`/product/${product.id}`} className="truncate font-medium text-neutral-900">
                        {name}
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleRemove(product.id)}
                        aria-label={t("cart.remove")}
                        className="shrink-0 rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                      >
                        <CloseIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="font-label text-sm text-neutral-600">
                      {formatPrice(unitPrice, i18n.language)}
                      <span className="text-neutral-400"> × {quantity} = </span>
                      <span className="font-semibold text-emerald-700">{formatPrice(subtotal, i18n.language)}</span>
                    </p>
                    <QuantityStepper value={quantity} onChange={(q) => setItemQuantity(product.id, q)} />
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4">
            <span className="font-heading text-base font-semibold text-neutral-900">{t("cart.total")}</span>
            <span className="font-label text-xl font-bold text-emerald-700">{formatPrice(total, i18n.language)}</span>
          </div>

          <button
            type="button"
            onClick={handleOrderViaWhatsApp}
            className="font-label flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t("cart.orderWhatsapp")}
          </button>
        </>
      )}
    </div>
  );
}
