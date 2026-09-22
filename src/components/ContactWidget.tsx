import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CONTACT } from "../config";
import { ChatIcon, CloseIcon, FacebookIcon, LocationIcon, PhoneIcon, WhatsAppIcon } from "./ContactIcons";

/**
 * Floating "Contact us" button shown on every public page. Clicking it
 * pops open a dialog with all contact methods — no dedicated /contact
 * route needed.
 */
export function ContactWidget() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("contact.title")}
        className="fixed bottom-6 end-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
      >
        <ChatIcon className="h-7 w-7" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("contact.title")}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-sm space-y-3 overflow-y-auto rounded-xl bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold text-neutral-900">{t("contact.title")}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <a
              href={`https://wa.me/${CONTACT.whatsappNumber}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <WhatsAppIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-medium text-neutral-900">{t("contact.whatsapp")}</span>
                <span className="block text-sm text-neutral-500">{t("contact.chatOnWhatsapp")}</span>
              </span>
            </a>

            <a
              href={CONTACT.facebookUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 hover:bg-neutral-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <FacebookIcon className="h-5 w-5" />
              </span>
              <span>
                <span className="block font-medium text-neutral-900">{t("contact.facebook")}</span>
                <span className="block text-sm text-neutral-500">{t("contact.visitFacebook")}</span>
              </span>
            </a>

            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <PhoneIcon className="h-5 w-5" />
                </span>
                <span className="font-medium text-neutral-900">{t("contact.phone")}</span>
              </div>
              <div className="mt-2 flex flex-col items-start gap-1 ps-[52px]">
                {CONTACT.phoneNumbers.map((phone) => (
                  <a key={phone.href} href={phone.href} className="text-emerald-700 hover:underline" dir="ltr">
                    {phone.display}
                  </a>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-neutral-200 p-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-700">
                  <LocationIcon className="h-5 w-5" />
                </span>
                <span className="font-medium text-neutral-900">{t("contact.location")}</span>
              </div>
              <p className="mt-2 ps-[52px] text-neutral-700">{CONTACT.address}</p>
              {CONTACT.mapsUrl ? (
                <a
                  href={CONTACT.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block ps-[52px] text-emerald-700 hover:underline"
                >
                  {t("contact.getDirections")}
                </a>
              ) : (
                <p className="mt-1 ps-[52px] text-sm text-neutral-400">{t("contact.directionsSoon")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
