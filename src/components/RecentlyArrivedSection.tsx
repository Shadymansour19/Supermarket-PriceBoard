import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals, isProductHot } from "../lib/discounts";
import { fetchRecentlyArrivedProducts } from "../lib/products";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/** How many days back counts as "new arrivals". */
const DAYS_BACK = 14;

/**
 * Home-page-only strip of products actually created in the last 14 days —
 * ranked by `created_at`, which never changes once a product exists (see
 * lib/products.ts), so a product that merely went back in stock after
 * being unavailable never shows up here as if it were new. No dedicated
 * page, just the carousel; renders nothing when nothing's new.
 */
export function RecentlyArrivedSection() {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityMap, setQuantityMap] = useState<Map<string, QuantityDiscount>>(new Map());

  useEffect(() => {
    Promise.all([
      fetchRecentlyArrivedProducts(DAYS_BACK),
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
      title={t("recentlyArrived.sectionTitle")}
      items={products}
      getKey={(product) => product.id}
      slideLabel={(index) => t("recentlyArrived.goToSlide", { count: index + 1 })}
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
