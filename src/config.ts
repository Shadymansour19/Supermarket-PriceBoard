// App-wide settings that aren't per-product data (see SPEC.md decision log
// — single currency for the whole store, not a per-product field).

/** ISO 4217 code. Change this single value to switch the store's currency. */
export const CURRENCY_CODE = "EGP";

// Contact Us details (see SPEC.md decision log, 2026-09-11). Sourced from
// the store's Facebook page — update here if any of it changes.
export const CONTACT = {
  /** Digits only, country code first, no "+"/spaces — as required by wa.me. */
  whatsappNumber: "201092255364",
  /** Shown as-is; `href` is the same number with spaces stripped. */
  phoneNumbers: [
    { display: "+20 109 225 5364", href: "tel:+201092255364" },
    { display: "050 4426255", href: "tel:0504426255" },
  ],
  facebookUrl: "https://www.facebook.com/share/1C6YVJMRkJ/",
  /** Kept in Arabic for both locales — it's a precise place name, and
   *  guessing an English transliteration risks getting it wrong. */
  address: "الدير - أجا - الدقهلية",
  mapsUrl: "https://maps.app.goo.gl/8J7uKXqsRFwikUem9?g_st=aw" as string | null,
};
