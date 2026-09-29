import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { HeartIcon } from "./Icons";
import { useFavorites } from "../context/FavoritesContext";

/**
 * Heart toggle, shared by ProductCard (overlaid on the image) and
 * ProductDetailPage (inline). `stopNavigation` is needed on the card since
 * the whole card is a `<Link>` — without it, tapping the heart would also
 * navigate to the product.
 */
export function FavoriteButton({
  productId,
  stopNavigation = false,
  className = "",
  style,
  iconClassName,
  iconStyle,
}: {
  productId: string;
  stopNavigation?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Overrides the heart icon's own size — otherwise it stays a fixed
   * h-5/w-5 regardless of how big or small `className`/`style` make the
   * button itself, since those only reach the `<button>`, not the
   * `<HeartIcon>` inside it. */
  iconClassName?: string;
  iconStyle?: CSSProperties;
}) {
  const { t } = useTranslation();
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorited = isFavorite(productId);

  return (
    <button
      type="button"
      onClick={(e) => {
        if (stopNavigation) {
          e.preventDefault();
          e.stopPropagation();
        }
        toggleFavorite(productId);
      }}
      aria-pressed={favorited}
      aria-label={t(favorited ? "favorites.remove" : "favorites.add")}
      className={`flex items-center justify-center rounded-full text-red-500 transition ${className}`}
      style={style}
    >
      <HeartIcon filled={favorited} className={iconClassName ?? "h-5 w-5"} style={iconStyle} />
    </button>
  );
}
