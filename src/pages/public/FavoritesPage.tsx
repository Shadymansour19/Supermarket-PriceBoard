import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
      {!loading && !error && products.length === 0 && <p className="text-neutral-500">{t("favorites.empty")}</p>}

      {!loading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} limitedTimeDiscount={discountMap.get(product.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
