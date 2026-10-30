import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MIN_FRACTION, roundQuantity } from "../lib/stock";

/** Shared -/+ quantity control — used when choosing how many to add to the
 * cart (ProductDetailPage), when adjusting an item already in it
 * (CartPage), and on the cashier's invoice lines. The -/+ buttons always
 * step by 1; the number itself is also a text field, so a quantity can be
 * typed directly — including a fraction (0.5) when `allowFraction` says
 * the product can be bought that way. `max` is the stock on hand, if
 * tracked. */
export function QuantityStepper({
  value,
  onChange,
  allowFraction = false,
  min = allowFraction ? MIN_FRACTION : 1,
  max,
}: {
  value: number;
  onChange: (quantity: number) => void;
  allowFraction?: boolean;
  min?: number;
  max?: number;
}) {
  const { t } = useTranslation();
  // A separate string draft, not just `String(value)` inline — typing needs
  // to allow a momentarily-empty field (clearing it to type a new number)
  // without every keystroke snapping it back to `min`.
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  // `max` below `min` (e.g. 0.5 left of a whole-units product) can't be
  // satisfied — min wins, and the caller is expected to block adding.
  function clamp(quantity: number) {
    const capped = max === undefined ? quantity : Math.min(quantity, max);
    return Math.max(min, roundQuantity(capped));
  }

  function commit(raw: string) {
    const parsed = allowFraction ? parseFloat(raw) : parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? clamp(min) : clamp(parsed);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  function sanitize(raw: string) {
    if (!allowFraction) return raw.replace(/[^0-9]/g, "");
    // Comma / Arabic decimal separator typed on some keyboards → ".", and
    // only the first separator is kept.
    const cleaned = raw.replace(/[,٫]/g, ".").replace(/[^0-9.]/g, "");
    const firstDot = cleaned.indexOf(".");
    return firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  return (
    <div className="font-label inline-flex items-center rounded-lg border border-neutral-300">
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value - 1 < min}
        aria-label={t("cart.decreaseQuantity")}
        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode={allowFraction ? "decimal" : "numeric"}
        aria-label={t("cart.quantity")}
        value={draft}
        onChange={(e) => setDraft(sanitize(e.target.value))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className={`${allowFraction ? "w-16" : "w-10"} border-0 bg-transparent text-center text-sm font-medium text-neutral-900 focus:outline-none`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={max !== undefined && value >= max}
        aria-label={t("cart.increaseQuantity")}
        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
