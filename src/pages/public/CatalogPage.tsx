import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useSearchParams } from "react-router-dom";
import { CategoryNav } from "../../components/CategoryNav";
import { Chevron } from "../../components/Chevron";
import { LimitedTimeDealsSection } from "../../components/LimitedTimeDealsSection";
import { ProductCard } from "../../components/ProductCard";
import { SearchBar } from "../../components/SearchBar";
import { fetchCategoryTree, getCategoryFilterIds } from "../../lib/categories";
import { fetchActiveLimitedTimeDiscountMap } from "../../lib/discounts";
import { fetchProducts } from "../../lib/products";
import type { CategoryWithChildren, LimitedTimeDiscount, Product } from "../../types/database";

export function CatalogPage() {
  const { t } = useTranslation();
  const { categoryId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";

  const [categories, setCategories] = useState<CategoryWithChildren[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [discountMap, setDiscountMap] = useState<Map<string, LimitedTimeDiscount>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const isHome = !categoryId && !search;
  // Sidebar starts collapsed on mobile to save vertical space; always
  // visible at md+ regardless of this flag (see className below).
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Collapse the mobile sidebar again once a category selection is made.
  useEffect(() => {
    setSidebarOpen(false);
  }, [categoryId]);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen((open) => !open)}
          aria-expanded={sidebarOpen}
          className="font-label flex w-full items-center justify-between rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700"
        >
          {t("nav.categories")}
          <Chevron open={sidebarOpen} />
        </button>
      </div>
      <aside className={sidebarOpen ? "block" : "hidden md:block"}>
        <CategoryNav categories={categories} />
      </aside>
      <section className="space-y-4">
        <SearchBar value={search} onChange={(q) => setSearchParams(q ? { q } : {})} />

        {isHome && <LimitedTimeDealsSection />}

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
  );
}
