import { useTranslation } from "react-i18next";
import { WhatsAppIcon } from "./ContactIcons";
import { CONTACT } from "../config";
import { localizedField } from "../lib/localize";
import type { Product } from "../types/database";

/**
 * Unlike ShareWhatsAppButton (opens WhatsApp's own picker, no fixed
 * number, for forwarding a deal to anyone), this one goes straight to the
 * store's own WhatsApp number — for asking the store about this specific
 * product, with its link included so they know exactly what's being asked
 * about.
 */
export function AskWhatsAppButton({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const name = localizedField(product, "name", i18n.language);
  const message = t("product.askMessage", { name, url: window.location.href });

  return (
    <a
      href={`https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noreferrer"
      className="font-label inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-sm text-white hover:bg-emerald-700"
    >
      <WhatsAppIcon className="h-4 w-4" />
      {t("product.askDetails")}
    </a>
  );
}
