import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { fetchBestSellingProducts } from "../lib/bestSellers";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals, isProductHot } from "../lib/discounts";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/** How many days of order history to rank best sellers over. */
const DAYS_BACK = 30;

/**
 * Home-page-only strip of the best-selling products over the last 30 days,
 * ranked by real confirmed orders (see lib/bestSellers.ts) rather than
 * add-to-cart activity — no dedicated page for it, just the carousel
 * itself. Renders nothing until there's at least one order to rank by.
 */
export function BestSellersSection() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityMap, setQuantityMap] = useState<Map<string, QuantityDiscount>>(new Map());

  useEffect(() => {
    Promise.all([
      fetchBestSellingProducts(DAYS_BACK),
      fetchActiveLimitedTimeDiscountMap(),
      fetchActiveQuantityDeals(),
    ])
      .then(([fetchedProducts, limitedTime, quantityDeals]) => {
        setProducts(fetchedProducts);
        setLimitedTimeMap(limitedTime);
        setQuantityMap(new Map(quantityDeals.map(({ product, discount }) => [product.id, discount])));
      })
      .catch(() => setProducts([]));
  }, []);

  if (!products) return null;

  return (
    <DealsCarousel
      title={t("bestSellers.sectionTitle")}
      items={products}
      getKey={(product) => product.id}
      slideLabel={(index) => t("bestSellers.goToSlide", { count: index + 1 })}
      renderCard={(product) => (
        <ProductCard
          product={product}
          limitedTimeDiscount={limitedTimeMap.get(product.id)}
          quantityDiscount={quantityMap.get(product.id)}
        />
      )}
      hasHotItem={products.some((product) =>
        isProductHot(product, limitedTimeMap.get(product.id), quantityMap.get(product.id)),
      )}
    />
  );
}
