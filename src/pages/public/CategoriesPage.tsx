import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Chevron } from "../../components/Chevron";
import { fetchCategoryTree } from "../../lib/categories";
import { localizedField } from "../../lib/localize";
import type { CategoryWithChildren } from "../../types/database";

/**
 * Dedicated "browse by category" page, reached from the mobile bottom nav
 * bar (replacing the old inline dropdown toggle). Lists top-level
 * categories only; tapping one goes to `/category/:id`, which shows that
 * category's products and (on mobile) its own subcategory chips.
 */
export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithChildren[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetchCategoryTree()
      .then(setCategories)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("nav.categories")}</h1>

      {categories === null && !error && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}

      {categories && categories.length > 0 && (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                to={`/category/${category.id}`}
                className="font-label flex items-center justify-between px-4 py-3.5 text-neutral-900 hover:bg-neutral-50"
              >
                <span>{localizedField(category, "name", i18n.language)}</span>
                <span className="text-neutral-400">
                  <Chevron open={false} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
