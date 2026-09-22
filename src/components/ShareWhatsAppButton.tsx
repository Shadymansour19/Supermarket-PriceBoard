import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "./ContactIcons";
import { formatPrice, localizedField } from "../lib/localize";
import type { Product } from "../types/database";

/**
 * Opens `wa.me` with no fixed number, so it hits WhatsApp's own contact/
 * share picker — a customer can forward the deal to anyone, not just the
 * store. Message is filled with the product name, price, and this page's
 * URL, localized to whichever language the app is currently in.
 */
export function ShareWhatsAppButton({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const name = localizedField(product, "name", i18n.language);
  const message = t("product.shareMessage", {
    name,
    price: formatPrice(product.price, i18n.language),
    url: window.location.href,
  });

  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      className="font-label inline-flex items-center gap-1.5 rounded-full border border-neutral-200 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-50"
    >
      <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
      {t("product.shareWhatsapp")}
    </a>
  );
}
