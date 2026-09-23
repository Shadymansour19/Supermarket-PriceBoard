import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { discountPercent, fetchActiveQuantityDeals } from "../lib/discounts";
import type { Product, QuantityDiscount } from "../types/database";

/** How many deals the home page teaser shows before "Show more" takes over. */
const PREVIEW_LIMIT = 5;

/**
 * Home-page-only teaser of active quantity ("buy in bulk") discounts,
 * linking to the full `/wholesale-deals` page — same shape as
 * LimitedTimeDealsSection, just for the other discount type. Ranked by
 * the biggest discount on each product's cheapest (easiest-to-reach) tier.
 */
export function QuantityDealsSection() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: QuantityDiscount }[] | null>(null);

  useEffect(() => {
    fetchActiveQuantityDeals()
      .then((allDeals) => {
        const byBiggestDiscount = [...allDeals].sort(
          (a, b) =>
            discountPercent(b.product.price, b.discount.tiers[0].price) -
            discountPercent(a.product.price, a.discount.tiers[0].price),
        );
        setDeals(byBiggestDiscount.slice(0, PREVIEW_LIMIT));
      })
      .catch(() => setDeals([]));
  }, []);

  if (!deals) return null;

  return (
    <DealsCarousel
      title={t("deals.wholesaleSectionTitle")}
      showMoreHref="/wholesale-deals"
      showMoreLabel={t("deals.showMore")}
      items={deals}
      getKey={(deal) => deal.product.id}
      slideLabel={(index) => t("deals.goToSlide", { count: index + 1 })}
      renderCard={({ product, discount }) => <ProductCard product={product} quantityDiscount={discount} />}
    />
  );
}
