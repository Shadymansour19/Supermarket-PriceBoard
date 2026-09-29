import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CartIcon, CheckIcon } from "./Icons";
import { useCart } from "../context/CartContext";
import { flyToCart } from "../lib/cartFlyAnimation";

/**
 * Quick add-to-cart control for the product card grid — a -/+ quantity
 * stepper (typing the number directly also works, same as
 * QuantityStepper) attached to a cart button, instead of a single icon
 * that always added exactly one unit. `stopNavigation` is needed on the
 * card since the whole card is a `<Link>`, same reasoning as
 * FavoriteButton — handled once on the wrapping div (every click inside
 * bubbles up to it) rather than repeated on each of the four buttons.
 */
export function AddToCartButton({
  productId,
  imageUrl,
  stopNavigation = false,
  className = "",
}: {
  productId: string;
  imageUrl: string | null;
  stopNavigation?: boolean;
  className?: string;
}) {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd(e: React.MouseEvent<HTMLButtonElement>) {
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    flyToCart(e.currentTarget.getBoundingClientRect(), imageUrl, () => addToCart(productId, quantity));
    setQuantity(1);
  }

  return (
    <div
      // `flex` (not `inline-flex`) + the cart button below being `flex-1`
      // is what lets that button actually grow into whatever width this
      // whole control is given — an inline-flex container only ever sizes
      // to its children's own widths, so nothing would be left for a
      // `flex-1` child to grow into. The `-`/qty/`+` segments keep their
      // own fixed widths since fixed-size tap targets there is right;
      // only the cart button should absorb the rest of the available row.
      className={`font-label flex h-9 items-stretch overflow-hidden rounded-md border border-neutral-300 bg-white ${className}`}
      onClick={(e) => {
        if (stopNavigation) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
        disabled={quantity <= 1}
        aria-label={t("cart.decreaseQuantity")}
        className="flex w-7 shrink-0 items-center justify-center text-base text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={t("cart.quantity")}
        value={quantity}
        onChange={(e) => {
          const parsed = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
          setQuantity(Number.isNaN(parsed) ? 1 : Math.max(1, parsed));
        }}
        className="w-7 shrink-0 border-x border-neutral-300 bg-transparent text-center text-sm font-medium text-neutral-900 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => setQuantity((q) => q + 1)}
        aria-label={t("cart.increaseQuantity")}
        className="flex w-7 shrink-0 items-center justify-center text-base text-neutral-600 hover:bg-neutral-100"
      >
        +
      </button>
      <button
        type="button"
        onClick={handleAdd}
        aria-label={t("cart.addToCart")}
        className={`flex flex-1 items-center justify-center text-white transition ${
          justAdded ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {justAdded ? <CheckIcon className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />}
      </button>
    </div>
  );
}
