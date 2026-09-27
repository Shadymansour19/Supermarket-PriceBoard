import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DealsCarousel } from "./DealsCarousel";
import { ProductCard } from "./ProductCard";
import { fetchActiveLimitedTimeDiscountMap, fetchActiveQuantityDeals } from "../lib/discounts";
import { fetchSimilarProducts } from "../lib/products";
import type { LimitedTimeDiscount, Product, QuantityDiscount } from "../types/database";

/**
 * Product-page-only strip of other products in the same category, closest
 * in price first — see the evaluated options in the SPEC.md decision log
 * for why this heuristic instead of something fancier. No dedicated page,
 * same as RecentlyViewedSection. Renders nothing until there's at least
 * one to show, and re-fetches whenever the viewed product changes (this
 * component stays mounted across a product-to-product navigation, since
 * ProductDetailPage doesn't remount on a param change).
 */
export function SimilarProductsSection({ product }: { product: Product }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [limitedTimeMap, setLimitedTimeMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [quantityMap, setQuantityMap] = useState<Map<string, QuantityDiscount>>(new Map());

  useEffect(() => {
    setProducts(null);
    Promise.all([fetchSimilarProducts(product), fetchActiveLimitedTimeDiscountMap(), fetchActiveQuantityDeals()])
      .then(([similar, limitedTime, quantityDeals]) => {
        setProducts(similar);
        setLimitedTimeMap(limitedTime);
        setQuantityMap(new Map(quantityDeals.map(({ product: p, discount }) => [p.id, discount])));
      })
      .catch(() => setProducts([]));
  }, [product]);

  if (!products) return null;

  return (
    <DealsCarousel
      title={t("similarProducts.sectionTitle")}
      items={products}
      getKey={(p) => p.id}
      slideLabel={(index) => t("similarProducts.goToSlide", { count: index + 1 })}
      renderCard={(p) => (
        <ProductCard product={p} limitedTimeDiscount={limitedTimeMap.get(p.id)} quantityDiscount={quantityMap.get(p.id)} />
      )}
    />
  );
}
