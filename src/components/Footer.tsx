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
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:py-14">
        <div className="flex items-center gap-3">
          <img src="/logo.jpg" alt="" className="h-12 w-12 rounded-full object-cover sm:h-14 sm:w-14" />
          <div>
            <p className="font-heading text-lg font-bold text-emerald-700 sm:text-xl">{t("app.name")}</p>
            <p className="font-label text-sm text-neutral-500">{t("contact.title")}</p>
          </div>
        </div>

        <div className="font-label grid gap-5 text-base text-neutral-700 sm:grid-cols-2 md:grid-cols-4">
          <a
            href={`https://wa.me/${CONTACT.whatsappNumber}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 hover:text-emerald-700"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <WhatsAppIcon className="h-5 w-5" />
            </span>
            {t("contact.whatsapp")}
          </a>

          <div className="flex flex-col gap-2">
            {CONTACT.phoneNumbers.map((phone) => (
              <a key={phone.href} href={phone.href} className="flex items-center gap-3 hover:text-emerald-700" dir="ltr">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                {phone.display}
              </a>
            ))}
          </div>

          <a
            href={CONTACT.facebookUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 hover:text-emerald-700"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <FacebookIcon className="h-5 w-5" />
            </span>
            {t("contact.facebook")}
          </a>

          {CONTACT.mapsUrl ? (
            <a
              href={CONTACT.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 hover:text-emerald-700"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <LocationIcon className="h-5 w-5" />
              </span>
              {CONTACT.address}
            </a>
          ) : (
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                <LocationIcon className="h-5 w-5" />
              </span>
              {CONTACT.address}
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
