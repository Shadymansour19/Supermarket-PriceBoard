import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CATEGORY_AVATAR_COLORS, CategoryAvatar } from "./CategoryAvatar";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

/** How many categories the home page teaser shows before "Show more" takes
 * over — the full list lives on the dedicated /categories page. */
const PREVIEW_LIMIT = 8;

/**
 * Horizontally-scrollable row of top-level categories, shown on the
 * customer-facing home page as a quick-access shortcut — the sidebar
 * (`CategoryNav`) already covers this on desktop/tablet, so this row is
 * mobile-only, same as the subcategory chip row it sits alongside.
 */
export function TopCategoriesRow({ categories }: { categories: CategoryWithChildren[] }) {
  const { t, i18n } = useTranslation();
  if (categories.length === 0) return null;
  const preview = categories.slice(0, PREVIEW_LIMIT);

  return (
    <div className="md:hidden">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-neutral-900">{t("nav.topCategories")}</h2>
        {categories.length > PREVIEW_LIMIT && (
          <Link to="/categories" className="font-label text-sm font-medium text-emerald-700 hover:underline">
            {t("deals.showMore")}
          </Link>
        )}
      </div>
      <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-1">
        {preview.map((category, index) => (
          <Link
            key={category.id}
            to={`/category/${category.id}`}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <CategoryAvatar
              imagePath={category.image_path}
              name={localizedField(category, "name", i18n.language)}
              colorClass={CATEGORY_AVATAR_COLORS[index % CATEGORY_AVATAR_COLORS.length]}
              className="h-20 w-20 border border-neutral-200 text-2xl"
            />
            <span className="font-label max-w-20 truncate text-center text-xs text-neutral-700">
              {localizedField(category, "name", i18n.language)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
