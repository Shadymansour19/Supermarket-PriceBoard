import { useTranslation } from "react-i18next";

/** Shared -/+ quantity control — used both when choosing how many to add
 * to the cart (ProductDetailPage) and when adjusting an item already in it
 * (CartPage). */
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
      <span className="w-8 text-center text-sm font-medium text-neutral-900">{value}</span>
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
