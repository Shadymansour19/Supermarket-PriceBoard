import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CategoryNav } from "../../components/CategoryNav";
import { HeroBanner } from "../../components/HeroBanner";
import { LimitedTimeDealsSection } from "../../components/LimitedTimeDealsSection";
import { ProductCard } from "../../components/ProductCard";
import { QuantityDealsSection } from "../../components/QuantityDealsSection";
import { SearchBar } from "../../components/SearchBar";
import { fetchCategoryTree, getCategoryFilterIds } from "../../lib/categories";
import { fetchActiveLimitedTimeDiscountMap } from "../../lib/discounts";
import { localizedField } from "../../lib/localize";
import { fetchProducts } from "../../lib/products";
import type { CategoryWithChildren, LimitedTimeDiscount, Product } from "../../types/database";

export function CatalogPage() {
  const { t, i18n } = useTranslation();
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discountMap, setDiscountMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isHome = !categoryId && !search;
  // Only set when `categoryId` is a top-level category (not a
  // subcategory, which has no children of its own to drill into) — drives
  // the mobile subcategory chip row below.
  const currentTopCategory = categoryId ? categories.find((c) => c.id === categoryId) : undefined;

  useEffect(() => {
    fetchCategoryTree()
      .then(setCategories)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(false);
    // Selecting a top-level category also matches all of its subcategories;
    // selecting a subcategory matches only itself.
    const filterCategoryId = categoryId ? getCategoryFilterIds(categories, categoryId) : undefined;
    Promise.all([fetchProducts({ categoryId: filterCategoryId, search }), fetchActiveLimitedTimeDiscountMap()])
      .then(([fetchedProducts, discounts]) => {
        setProducts(fetchedProducts);
        setDiscountMap(discounts);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [categoryId, search, categories]);

  return (
    <div className="space-y-6">
      {isHome && <HeroBanner />}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
        {/* Category navigation on mobile lives on its own /categories page
         * (reached from the bottom nav bar) instead of an inline dropdown
         * here — this sidebar is desktop/tablet-only. */}
        <aside className="hidden md:block">
          <CategoryNav categories={categories} />
        </aside>
        <section className="space-y-4">
          <SearchBar value={search} onChange={(q) => setSearchParams(q ? { q } : {})} />

          {currentTopCategory && currentTopCategory.children.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
              {currentTopCategory.children.map((child) => (
                <Link
                  key={child.id}
                  to={`/category/${child.id}`}
                  className="font-label shrink-0 rounded-full border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
                >
                  {localizedField(child, "name", i18n.language)}
                </Link>
              ))}
            </div>
          )}

          {isHome && <LimitedTimeDealsSection />}
          {isHome && <QuantityDealsSection />}

          {loading && <p className="text-neutral-500">{t("common.loading")}</p>}
          {error && <p className="text-red-600">{t("common.error")}</p>}
          {!loading && !error && products.length === 0 && (
            <p className="text-neutral-500">{t("search.noResults")}</p>
          )}

          {!loading && !error && products.length > 0 && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  limitedTimeDiscount={discountMap.get(product.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
