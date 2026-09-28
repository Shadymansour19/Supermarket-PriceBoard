import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CloseIcon } from "../../components/ContactIcons";
import { CartIcon } from "../../components/Icons";
import { useCart } from "../../context/CartContext";
import { formatPrice } from "../../lib/localize";
import { clearOrderHistory, getOrderHistory, type OrderHistoryEntry } from "../../lib/orderHistory";

export function OrderHistoryPage() {
  const { t, i18n } = useTranslation();
  const { items, addToCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderHistoryEntry[]>([]);
  // Only set (opening the choice dialog below) when reordering would
  // actually collide with something already in the cart — an empty cart
  // has nothing to ask about, so that case just adds and goes straight
  // to /cart.
  const [reorderPrompt, setReorderPrompt] = useState<OrderHistoryEntry | null>(null);

  useEffect(() => {
    setOrders(getOrderHistory());
  }, []);

  function handleClear() {
    if (!confirm(t("orderHistory.confirmClearHistory"))) return;
    clearOrderHistory();
    setOrders([]);
  }

  function addOrderItems(order: OrderHistoryEntry) {
    for (const item of order.items) addToCart(item.productId, item.quantity);
    navigate("/cart");
  }

  function handleReorder(order: OrderHistoryEntry) {
    if (items.length === 0) {
      addOrderItems(order);
      return;
    }
    setReorderPrompt(order);
  }

  function handleReplaceCart() {
    if (!reorderPrompt) return;
    clearCart();
    addOrderItems(reorderPrompt);
    setReorderPrompt(null);
  }

  function handleAddToExisting() {
    if (!reorderPrompt) return;
    addOrderItems(reorderPrompt);
    setReorderPrompt(null);
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

      {reorderPrompt && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("orderHistory.reorderPromptTitle")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setReorderPrompt(null)}
        >
          <div className="w-full max-w-sm space-y-3 rounded-xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-base font-bold text-neutral-900">{t("orderHistory.reorderPromptTitle")}</h2>
              <button
                type="button"
                onClick={() => setReorderPrompt(null)}
                aria-label={t("common.close")}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-neutral-600">{t("orderHistory.reorderPromptBody")}</p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleAddToExisting}
                className="font-label w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                {t("orderHistory.addToExisting")}
              </button>
              <button
                type="button"
                onClick={handleReplaceCart}
                className="font-label w-full rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
              >
                {t("orderHistory.startNewCart")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
