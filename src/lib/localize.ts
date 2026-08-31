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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return currencyFormatters[locale].format(price);
}
