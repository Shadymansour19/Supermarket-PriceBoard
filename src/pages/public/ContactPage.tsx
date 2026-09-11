import { useTranslation } from "react-i18next";
import { FacebookIcon, LocationIcon, PhoneIcon, WhatsAppIcon } from "../../components/ContactIcons";
import { CONTACT } from "../../config";

export function ContactPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-neutral-900">{t("contact.title")}</h1>

      <a
        href={`https://wa.me/${CONTACT.whatsappNumber}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
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
        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-4 hover:bg-neutral-50"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          <FacebookIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-medium text-neutral-900">{t("contact.facebook")}</span>
          <span className="block text-sm text-neutral-500">{t("contact.visitFacebook")}</span>
        </span>
      </a>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
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

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
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
  );
}
