import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { discountPercent, fetchActiveLimitedTimeDeals } from "../lib/discounts";
import type { LimitedTimeDiscount, Product } from "../types/database";

/** How many deals the home page teaser shows before "Show more" takes over. */
const PREVIEW_LIMIT = 5;

/**
 * Home-page-only teaser of active limited-time discounts, linking to the
 * full `/deals` page. Shows the biggest percentage-off deals first, since
 * a teaser is about grabbing attention — the full `/deals` page is where
 * "everything, soonest-expiring first" lives. Renders nothing if there
 * are none active (via DealsCarousel), so it never leaves an empty
 * section on the page.
 */
export function LimitedTimeDealsSection() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: LimitedTimeDiscount }[] | null>(null);

  useEffect(() => {
    fetchActiveLimitedTimeDeals()
      .then((allDeals) => {
        const byBiggestDiscount = [...allDeals].sort(
          (a, b) =>
            discountPercent(b.product.price, b.discount.new_price) -
            discountPercent(a.product.price, a.discount.new_price),
        );
        setDeals(byBiggestDiscount.slice(0, PREVIEW_LIMIT));
      })
      .catch(() => setDeals([]));
  }, []);

  if (!deals) return null;

  return (
    <DealsCarousel
      title={t("deals.sectionTitle")}
      showMoreHref="/deals"
      showMoreLabel={t("deals.showMore")}
      items={deals}
      getKey={(deal) => deal.product.id}
      slideLabel={(index) => t("deals.goToSlide", { count: index + 1 })}
      renderCard={({ product, discount }) => <ProductCard product={product} limitedTimeDiscount={discount} />}
    />
  );
}
