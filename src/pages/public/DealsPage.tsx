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
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("deals.pageTitle")}</h1>

      {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}
      {!loading && !error && deals.length === 0 && <p className="text-neutral-500">{t("deals.noActiveDeals")}</p>}

      {!loading && !error && deals.length > 0 && (
        // Extra top margin (beyond the page's own space-y-4) — a hot-deal
        // card's fire frame pokes well above the card itself, and without
        // this clearance it painted over the page title right above it.
        // The frame's poke is `21cqw` of the card's own width; this
        // page's grid tops out around 268px wide (the `main` element is
        // capped at max-w-6xl, 4 columns, gap-4), so ~56px is all it ever
        // needs — mt-16 (64px) covers that without leaving a big dead gap
        // under the title on a narrower card, unlike the old mt-28.
        <div className="mt-16 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {deals.map(({ product, discount }) => (
            <ProductCard key={product.id} product={product} limitedTimeDiscount={discount} />
          ))}
        </div>
      )}
    </div>
  );
}
