import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { productImageUrl } from "../lib/supabase";
import { formatPrice, localizedField, shouldShowUnit } from "../lib/localize";
import type { Product } from "../types/database";

export function ProductCard({ product }: { product: Product }) {
  const { t, i18n } = useTranslation();
  const imageUrl = productImageUrl(product.image_path);
  const name = localizedField(product, "name", i18n.language);

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:shadow-md"
    >
      <div className="aspect-square w-full bg-neutral-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <span className="text-4xl">🛒</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-neutral-900">{name}</h3>
        {product.size && <span className="text-xs text-neutral-500">{product.size}</span>}
        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="font-semibold text-emerald-700">
            {formatPrice(product.price, i18n.language)}
            {shouldShowUnit(product.unit) && (
              <span className="text-xs font-normal text-neutral-500"> / {t(`unit.${product.unit}`)}</span>
            )}
          </span>
          {!product.in_stock && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
              {t("product.outOfStock")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
