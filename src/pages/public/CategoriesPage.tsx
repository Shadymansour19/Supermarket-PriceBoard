import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CATEGORY_AVATAR_COLORS } from "../../components/CategoryAvatar";
import { CategoryCard } from "../../components/CategoryCard";
import { fetchCategoryTree, getCategoryFilterIds } from "../../lib/categories";
import { fetchActiveProductCategoryIds } from "../../lib/products";
import type { CategoryWithChildren } from "../../types/database";

/**
 * Dedicated "browse by category" page, reached from the mobile bottom nav
 * bar. Top-level categories only, as cards — picking a specific
 * subcategory isn't this page's job any more (see the in-category picker
 * on CatalogPage instead), so there's nothing here to expand.
 */
export function CategoriesPage() {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithChildren[] | null>(null);
  const [productCategoryIds, setProductCategoryIds] = useState<string[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([fetchCategoryTree(), fetchActiveProductCategoryIds()])
      .then(([tree, ids]) => {
        setCategories(tree);
        setProductCategoryIds(ids);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("nav.categories")}</h1>

      {categories === null && !error && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}

      {categories && categories.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((category, index) => {
            // A top-level category's own product count includes its
            // subcategories' products too, matching what tapping into it
            // actually shows (see getCategoryFilterIds).
            const matchingIds = new Set(getCategoryFilterIds(categories, category.id));
            const productCount = productCategoryIds.filter((id) => matchingIds.has(id)).length;
            return (
              <CategoryCard
                key={category.id}
                category={category}
                productCount={productCount}
                colorClass={CATEGORY_AVATAR_COLORS[index % CATEGORY_AVATAR_COLORS.length]}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
