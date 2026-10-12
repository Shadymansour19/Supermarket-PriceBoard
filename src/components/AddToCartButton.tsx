import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CartIcon, CheckIcon } from "./Icons";
import { useCart } from "../context/CartContext";
import { flyToCart } from "../lib/cartFlyAnimation";

/**
 * Quick add-to-cart button for the product card grid — always adds exactly
 * one unit; adjusting quantity is a cart-page thing (QuantityStepper), not
 * a catalog-browsing one. `stopNavigation` is needed since the whole card
 * is a `<Link>` — without it, tapping the button would also navigate to
 * the product page.
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
  const [justAdded, setJustAdded] = useState(false);

  function handleAdd(e: React.MouseEvent<HTMLButtonElement>) {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    flyToCart(e.currentTarget.getBoundingClientRect(), imageUrl, () => addToCart(productId, 1));
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      aria-label={t("cart.addToCart")}
      // The white padding ring is what lets this read as a floating button
      // sitting half on the product photo, half on the card's white
      // background, instead of looking cropped by the image underneath it.
      // No shadow on the ring itself — it's the exact same white as the
      // card content below, so a shadow there would draw a visible seam
      // where none should show; the green circle inside still reads fine
      // against the photo above without one.
      className={`flex items-center justify-center rounded-full bg-white p-1 transition ${className}`}
    >
      <span
        className={`flex h-full w-full items-center justify-center rounded-full text-white transition ${
          justAdded ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {justAdded ? <CheckIcon className="h-5 w-5" /> : <CartIcon className="h-5 w-5" />}
      </span>
    </button>
  );
}
