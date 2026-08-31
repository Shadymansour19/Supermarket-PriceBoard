import { useTranslation } from "react-i18next";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(isArabic ? "en" : "ar")}
      className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      aria-label="Toggle language"
    >
      {isArabic ? "English" : "العربية"}
    </button>
  );
}
