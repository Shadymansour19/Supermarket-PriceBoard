import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

/** Shared -/+ quantity control — used both when choosing how many to add
 * to the cart (ProductDetailPage) and when adjusting an item already in it
 * (CartPage). The number itself is also a text field, so a quantity can be
 * typed directly from the keyboard instead of only tapping +/- repeatedly. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
}: {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
}) {
  const { t } = useTranslation();
  // A separate string draft, not just `String(value)` inline — typing needs
  // to allow a momentarily-empty field (clearing it to type a new number)
  // without every keystroke snapping it back to `min`.
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  function commit(raw: string) {
    const parsed = parseInt(raw, 10);
    const next = Number.isNaN(parsed) ? min : Math.max(min, parsed);
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div className="font-label inline-flex items-center rounded-lg border border-neutral-300">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t("cart.decreaseQuantity")}
        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={t("cart.quantity")}
        value={draft}
        onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
        className="w-10 border-0 bg-transparent text-center text-sm font-medium text-neutral-900 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={t("cart.increaseQuantity")}
        className="flex h-9 w-9 items-center justify-center text-lg text-neutral-600 hover:bg-neutral-100"
      >
        +
      </button>
    </div>
  );
}
