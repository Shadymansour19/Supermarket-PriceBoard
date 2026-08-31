import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { RTL_LANGUAGES } from "../i18n";

/** Keeps <html lang>/<html dir> in sync with the active i18n language. */
export function useDocumentDirection() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const apply = (lang: string) => {
      document.documentElement.lang = lang;
      document.documentElement.dir = RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
    };

    apply(i18n.language);
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, [i18n]);
}
