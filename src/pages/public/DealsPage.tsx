import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProductCard } from "../../components/ProductCard";
import { fetchActiveLimitedTimeDeals } from "../../lib/discounts";
import type { LimitedTimeDiscount, Product } from "../../types/database";

/** Full grid of every active limited-time discount — reached via the home
 * page teaser's "Show more" link. */
export function DealsPage() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: LimitedTimeDiscount }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchActiveLimitedTimeDeals()
      .then(setDeals)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">{t("deals.pageTitle")}</h1>

      {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}
      {!loading && !error && deals.length === 0 && <p className="text-neutral-500">{t("deals.noActiveDeals")}</p>}

      {!loading && !error && deals.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map(({ product, discount }) => (
            <ProductCard key={product.id} product={product} limitedTimeDiscount={discount} />
          ))}
        </div>
      )}
    </div>
  );
}
