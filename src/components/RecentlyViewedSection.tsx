import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals } from "../lib/discounts";
import { fetchProductsByIds } from "../lib/products";
import { getRecentlyViewedIds } from "../lib/recentlyViewed";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/**
 * Home-page-only strip of products this device has viewed recently — no
 * dedicated page for it (unlike the deals sections), just the carousel
 * itself. Renders nothing until there's at least one to show.
 */
export function RecentlyViewedSection() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityMap, setQuantityMap] = useState<Map<string, QuantityDiscount>>(new Map());

  useEffect(() => {
    const ids = getRecentlyViewedIds();
    if (ids.length === 0) {
      setProducts([]);
      return;
    }
    Promise.all([fetchProductsByIds(ids), fetchActiveLimitedTimeDiscountMap(), fetchActiveQuantityDeals()])
      .then(([fetchedProducts, limitedTime, quantityDeals]) => {
        // fetchProductsByIds doesn't preserve input order (and drops ids
        // for products that are since hidden/deleted) — re-derive the
        // most-recent-first order from the id list instead.
        const byId = new Map(fetchedProducts.map((product) => [product.id, product]));
        const ordered = ids.map((id) => byId.get(id)).filter((product): product is Product => product !== undefined);
        setProducts(ordered);
        setLimitedTimeMap(limitedTime);
        setQuantityMap(new Map(quantityDeals.map(({ product, discount }) => [product.id, discount])));
      })
      .catch(() => setProducts([]));
  }, []);

  if (!products) return null;

  return (
    <DealsCarousel
      title={t("recentlyViewed.sectionTitle")}
      items={products}
      getKey={(product) => product.id}
      slideLabel={(index) => t("recentlyViewed.goToSlide", { count: index + 1 })}
      renderCard={(product) => (
        <ProductCard
          product={product}
          limitedTimeDiscount={limitedTimeMap.get(product.id)}
          quantityDiscount={quantityMap.get(product.id)}
        />
      )}
    />
  );
}
