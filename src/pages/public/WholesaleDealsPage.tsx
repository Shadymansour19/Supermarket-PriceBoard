import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductCard } from "../../components/ProductCard";
import { fetchActiveQuantityDeals } from "../../lib/discounts";
import type { Product, QuantityDiscount } from "../../types/database";

/** Full grid of every active quantity ("buy in bulk") discount — reached
 * via the home page teaser's "Show more" link. Mirrors DealsPage. */
export function WholesaleDealsPage() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: QuantityDiscount }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchActiveQuantityDeals()
      .then(setDeals)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("deals.wholesalePageTitle")}</h1>

      {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}
      {!loading && !error && deals.length === 0 && (
        <p className="text-neutral-500">{t("deals.noActiveWholesaleDeals")}</p>
      )}

      {!loading && !error && deals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map(({ product, discount }) => (
            <ProductCard key={product.id} product={product} quantityDiscount={discount} />
          ))}
        </div>
      )}
    </div>
  );
}
