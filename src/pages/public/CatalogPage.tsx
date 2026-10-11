import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { BestSellersSection } from "../../components/BestSellersSection";
import { CATEGORY_AVATAR_COLORS } from "../../components/CategoryAvatar";
import { CategoryNav } from "../../components/CategoryNav";
import { CategoryPickerModal } from "../../components/CategoryPickerModal";
import { HeroBanner } from "../../components/HeroBanner";
import { LimitedTimeDealsSection } from "../../components/LimitedTimeDealsSection";
import { ProductCard } from "../../components/ProductCard";
import { QuantityDealsSection } from "../../components/QuantityDealsSection";
import { RecentlyArrivedSection } from "../../components/RecentlyArrivedSection";
import { RecentlyViewedSection } from "../../components/RecentlyViewedSection";
import { SearchBar } from "../../components/SearchBar";
import { TopCategoriesRow } from "../../components/TopCategoriesRow";
import { fetchCategoryTree, findCategoryWithParent, getCategoryFilterIds } from "../../lib/categories";
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const isHome = !categoryId && !search;
  // Undefined until the category tree loads, or if `categoryId` doesn't
  // match anything in it (e.g. still mid-fetch).
  const current = categoryId ? findCategoryWithParent(categories, categoryId) : undefined;
  // The picker is scoped to whichever top-level category is currently
  // relevant — itself if it's a top-level category, or its parent if it's
  // a subcategory — not the full category list.
  const activeTopCategoryId = current ? (current.parent ? current.parent.id : current.category.id) : undefined;
  const activeTopCategoryIndex = categories.findIndex((c) => c.id === activeTopCategoryId);
  const activeTopCategory = activeTopCategoryIndex !== -1 ? categories[activeTopCategoryIndex] : undefined;

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
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        {/* Category navigation on mobile lives on its own /categories page
         * (reached from the bottom nav bar) instead of an inline dropdown
         * here — this sidebar is desktop/tablet-only. */}
        <aside className="hidden md:block">
          <CategoryNav categories={categories} />
        </aside>
        <section className="space-y-4">
          <SearchBar value={search} onChange={(q) => setSearchParams(q ? { q } : {})} />

          {isHome && <TopCategoriesRow categories={categories} />}

          {/* One combined row for picking a different category from
           * within a category page: a "back to {parent}" link when
           * viewing a subcategory (there's nothing to go "back" to from a
           * top-level category itself), and a button that opens the
           * picker popout — on both mobile and desktop, since the sidebar
           * no longer offers subcategory drill-down inline. */}
          {current && (
            <div className="flex items-center justify-between gap-2">
              {current.parent ? (
                <Link
                  to={`/category/${current.parent.id}`}
                  className="font-label flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                >
                  ← {t("categories.backTo", { name: localizedField(current.parent, "name", i18n.language) })}
                </Link>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="font-label flex items-center gap-1 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {localizedField(current.category, "name", i18n.language)}
                <span aria-hidden="true">▾</span>
              </button>
            </div>
          )}

          {pickerOpen && activeTopCategory && (
            <CategoryPickerModal
              topCategory={activeTopCategory}
              colorClass={CATEGORY_AVATAR_COLORS[activeTopCategoryIndex % CATEGORY_AVATAR_COLORS.length]}
              onClose={() => setPickerOpen(false)}
            />
          )}

          {isHome && <LimitedTimeDealsSection />}
          {isHome && <QuantityDealsSection />}
          {isHome && <BestSellersSection />}
          {isHome && <RecentlyArrivedSection />}
          {isHome && <RecentlyViewedSection />}

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
