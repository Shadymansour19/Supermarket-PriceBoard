import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CartIcon, CheckIcon } from "./Icons";
import { useCart } from "../context/CartContext";
import { flyToCart } from "../lib/cartFlyAnimation";

/**
 * Quick "add 1 to cart" button for the product card grid — always adds a
 * single unit (no quantity picker here; that's still a product-detail-page
 * thing). `stopNavigation` is needed on the card since the whole card is a
 * `<Link>`, same reasoning as FavoriteButton.
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

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (stopNavigation) {
      e.preventDefault();
      e.stopPropagation();
    }
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
    flyToCart(e.currentTarget, imageUrl, () => addToCart(productId, 1));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={t("cart.addToCart")}
      className={`flex items-center justify-center rounded-full text-white transition ${
        justAdded ? "bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
      } ${className}`}
    >
      {justAdded ? <CheckIcon className="h-4 w-4" /> : <CartIcon className="h-4 w-4" />}
    </button>
  );
}
