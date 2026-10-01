import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CATEGORY_AVATAR_COLORS, CategoryAvatar } from "./CategoryAvatar";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

/**
 * Horizontally-scrollable row of top-level categories, shown on the
 * customer-facing home page as a quick-access shortcut — the sidebar
 * (`CategoryNav`) already covers this on desktop/tablet, so this row is
 * mobile-only, same as the subcategory chip row it sits alongside.
 */
export function TopCategoriesRow({ categories }: { categories: CategoryWithChildren[] }) {
  const { i18n } = useTranslation();
  if (categories.length === 0) return null;

  return (
    <div className="scrollbar-hide -mx-4 flex gap-4 overflow-x-auto px-4 pb-1 md:hidden">
      {categories.map((category, index) => (
        <Link
          key={category.id}
          to={`/category/${category.id}`}
          className="flex shrink-0 flex-col items-center gap-1.5"
        >
          <CategoryAvatar
            imagePath={category.image_path}
            name={localizedField(category, "name", i18n.language)}
            colorClass={CATEGORY_AVATAR_COLORS[index % CATEGORY_AVATAR_COLORS.length]}
            className="h-14 w-14 border border-neutral-200 text-lg"
          />
          <span className="font-label max-w-16 truncate text-center text-xs text-neutral-700">
            {localizedField(category, "name", i18n.language)}
          </span>
        </Link>
      ))}
    </div>
  );
}
