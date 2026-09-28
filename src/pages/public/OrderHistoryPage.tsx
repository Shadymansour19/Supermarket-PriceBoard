import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CartIcon } from "../../components/Icons";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../lib/localize";
import { clearOrderHistory, getOrderHistory, type OrderHistoryEntry } from "../../lib/orderHistory";

export function OrderHistoryPage() {
  const { t, i18n } = useTranslation();
  const { items, addToCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);

  useEffect(() => {
    setOrders(getOrderHistory());
  }, []);

  function handleClear() {
    if (!confirm(t("orderHistory.confirmClearHistory"))) return;
    clearOrderHistory();
    setOrders([]);
  }

  /** Replaces whatever's currently in the cart with this past order's
   * items and goes there — not a one-tap resend, since the customer might
   * want to adjust quantities or add a few more things before actually
   * sending it via WhatsApp again. Confirms first if that would actually
   * discard something, since it's a destructive replace, not a merge. */
  function handleReorder(order: OrderHistoryEntry) {
    if (items.length > 0 && !confirm(t("orderHistory.confirmReorderDiscard"))) return;
    clearCart();
    for (const item of order.items) addToCart(item.productId, item.quantity);
    navigate("/cart");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("orderHistory.title")}</h1>
        {orders.length > 0 && (
          <button type="button" onClick={handleClear} className="text-sm font-medium text-red-600 hover:underline">
            {t("orderHistory.clearHistory")}
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <p className="text-neutral-500">{t("orderHistory.empty")}</p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id} className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-label text-sm text-neutral-500">
                  {new Date(order.createdAt).toLocaleString(i18n.language === "ar" ? "ar" : "en")}
                </span>
                <span className="font-label text-sm font-semibold text-emerald-700">
                  {t("orderHistory.total")}: {formatPrice(order.total, i18n.language)}
                </span>
              </div>

              <ul className="divide-y divide-neutral-100 border-y border-neutral-100">
                {order.items.map((item) => (
                  <li key={item.productId} className="font-label flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate text-neutral-700">
                      {item.name} <span className="text-neutral-400">× {item.quantity}</span>
                    </span>
                    <span className="shrink-0 text-neutral-900">{formatPrice(item.subtotal, i18n.language)}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleReorder(order)}
                className="font-label flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50"
              >
                <CartIcon className="h-4 w-4" />
                {t("orderHistory.reorder")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
