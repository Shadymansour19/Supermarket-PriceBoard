import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { fetchActiveLimitedTimeDeals } from "../lib/discounts";
import type { LimitedTimeDiscount, Product } from "../types/database";

/** How many deals the home page teaser shows before "Show more" takes over. */
const PREVIEW_LIMIT = 10;

/**
 * Home-page-only horizontally-scrolling teaser of active limited-time
 * discounts, linking to the full `/deals` page. Renders nothing if there
 * are none active, so it never leaves an empty section on the page.
 */
export function LimitedTimeDealsSection() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: LimitedTimeDiscount }[] | null>(null);

  useEffect(() => {
    fetchActiveLimitedTimeDeals(PREVIEW_LIMIT)
      .then(setDeals)
      .catch(() => setDeals([]));
  }, []);

  if (!deals || deals.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">{t("deals.sectionTitle")}</h2>
        <Link to="/deals" className="text-sm font-medium text-emerald-700 hover:underline">
          {t("deals.showMore")}
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {deals.map(({ product, discount }) => (
          <div key={product.id} className="w-40 shrink-0 sm:w-48">
            <ProductCard product={product} limitedTimeDiscount={discount} />
          </div>
        ))}
      </div>
    </section>
  );
}
