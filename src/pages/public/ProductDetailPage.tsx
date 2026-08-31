import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { formatPrice, localizedField, shouldShowUnit } from "../../lib/localize";
import { fetchProductById } from "../../lib/products";
import { productImageUrl } from "../../lib/supabase";
import type { Product } from "../../types/database";

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);

  useEffect(() => {
    if (!productId) return;
    fetchProductById(productId).then(setProduct);
  }, [productId]);

  if (product === undefined) {
    return <p className="text-neutral-500">{t("common.loading")}</p>;
  }

  if (product === null) {
    return (
      <div className="space-y-4">
        <p className="text-neutral-500">{t("product.notFound")}</p>
        <Link to="/" className="text-emerald-700 underline">
          {t("product.backToCatalog")}
        </Link>
      </div>
    );
  }

  const imageUrl = productImageUrl(product.image_path);
  const name = localizedField(product, "name", i18n.language);
  const description = localizedField(product, "description", i18n.language);

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-block text-sm text-emerald-700 underline">
        {t("product.backToCatalog")}
      </Link>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <span className="text-6xl">🛒</span>
            </div>
          )}
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-neutral-900">{name}</h1>
          {product.size && (
            <p className="text-sm text-neutral-500">
              {t("product.size")}: {product.size}
            </p>
          )}
          <p className="text-2xl font-semibold text-emerald-700">
            {formatPrice(product.price, i18n.language)}
            {shouldShowUnit(product.unit) && (
              <span className="text-base font-normal text-neutral-500"> / {t(`unit.${product.unit}`)}</span>
            )}
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm ${
              product.in_stock ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {t(product.in_stock ? "product.inStock" : "product.outOfStock")}
          </span>
          {description && <p className="text-neutral-600">{description}</p>}
        </div>
      </div>
    </div>
  );
}
