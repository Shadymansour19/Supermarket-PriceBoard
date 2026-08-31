import { CURRENCY_CODE } from "../config";

/** Picks the `${field}_en` / `${field}_ar` property matching the given language. */
export function localizedField<T extends Record<string, unknown>>(
  item: T,
  field: string,
  lang: string,
): string {
  const key = `${field}_${lang === "ar" ? "ar" : "en"}`;
  return (item[key] as string | undefined) ?? "";
}

const currencyFormatters: Record<string, Intl.NumberFormat> = {};

/** App-wide single-currency price formatting (see SPEC.md decision log). */
export function formatPrice(price: number, lang: string): string {
  const locale = lang === "ar" ? "ar" : "en";
  if (!currencyFormatters[locale]) {
    currencyFormatters[locale] = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: CURRENCY_CODE,
    });
  }
  return currencyFormatters[locale].format(price);
}

/**
 * "each" means the price is for one whole item/pack — showing "/ each"
 * next to it reads as noise, not information, so it's suppressed. Every
 * other unit (kg, liter, dozen, ...) says something the price alone
 * doesn't, so it's always shown.
 */
export function shouldShowUnit(unit: string): boolean {
  return unit !== "each";
}
