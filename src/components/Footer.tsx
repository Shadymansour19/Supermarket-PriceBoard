import { useTranslation } from "react-i18next";
import { FacebookIcon, LocationIcon, PhoneIcon, WhatsAppIcon } from "./ContactIcons";
import { CONTACT } from "../config";

/**
 * Contact details repeated at the end of every public page — unlike
 * ContactWidget (a floating button + modal, always one tap away),  this is
 * always-visible, for people scrolling to the bottom looking for it the
 * way they would on any storefront.
 */
export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-10 border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="" className="h-8 w-8 rounded-full object-cover" />
          <span className="font-heading font-bold text-emerald-700">{t("app.name")}</span>
        </div>

        <div className="font-label grid gap-3 text-sm text-neutral-600 sm:grid-cols-2 md:grid-cols-4">
          <a
            href={`https://wa.me/${CONTACT.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-emerald-700"
          >
            <WhatsAppIcon className="h-4 w-4 shrink-0" />
            {t("contact.whatsapp")}
          </a>

          <div className="flex flex-col gap-1">
            {CONTACT.phoneNumbers.map((phone) => (
              <a key={phone.href} href={phone.href} className="flex items-center gap-2 hover:text-emerald-700" dir="ltr">
                <PhoneIcon className="h-4 w-4 shrink-0" />
                {phone.display}
              </a>
            ))}
          </div>

          <a
            href={CONTACT.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 hover:text-emerald-700"
          >
            <FacebookIcon className="h-4 w-4 shrink-0" />
            {t("contact.facebook")}
          </a>

          {CONTACT.mapsUrl ? (
            <a
              href={CONTACT.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 hover:text-emerald-700"
            >
              <LocationIcon className="h-4 w-4 shrink-0" />
              {CONTACT.address}
            </a>
          ) : (
            <span className="flex items-center gap-2">
              <LocationIcon className="h-4 w-4 shrink-0" />
              {CONTACT.address}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
