import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { HeartIcon } from "../../components/Icons";
import { ProductCard } from "../../components/ProductCard";
import { useFavorites } from "../../context/FavoritesContext";
import { fetchActiveLimitedTimeDiscountMap } from "../../lib/discounts";
import { fetchProductsByIds } from "../../lib/products";
import type { LimitedTimeDiscount, Product } from "../../types/database";

export function FavoritesPage() {
  const { t } = useTranslation();
  const { favoriteIds } = useFavorites();
  const [products, setProducts] = useState<Product[]>([]);
  const [discountMap, setDiscountMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    Promise.all([fetchProductsByIds([...favoriteIds]), fetchActiveLimitedTimeDiscountMap()])
      .then(([fetchedProducts, discounts]) => {
        setProducts(fetchedProducts);
        setDiscountMap(discounts);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // Only the id set (not its identity) should re-trigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [[...favoriteIds].sort().join(",")]);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("favorites.title")}</h1>

      {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}
      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-heading text-lg font-semibold text-neutral-700">{t("favorites.emptyTitle")}</p>
          <HeartIcon className="h-40 w-40 animate-icon-sway text-neutral-300" />
          <Link to="/" className="text-sm font-medium text-emerald-700 hover:underline">
            {t("favorites.emptyCta")}
          </Link>
        </div>
      )}

      {!loading && !error && products.length > 0 && (
        // Extra top margin — see the matching comment in DealsPage.
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} limitedTimeDiscount={discountMap.get(product.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
