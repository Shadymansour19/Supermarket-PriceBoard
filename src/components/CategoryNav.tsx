import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { CATEGORY_AVATAR_COLORS, CategoryAvatar } from "./CategoryAvatar";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

/**
 * Top-level categories only, flat — no inline expand/collapse for
 * subcategories any more. Picking a specific subcategory is the
 * in-category picker's job now (CatalogPage), not this persistent sidebar's.
 * Still highlights the right top-level entry when the active page is one of
 * its subcategories, so navigating there doesn't leave the sidebar looking
 * like nothing is selected.
 */
export function CategoryNav({ categories }: { categories: CategoryWithChildren[] }) {
  const { t, i18n } = useTranslation();
  const { categoryId: activeCategoryId } = useParams();

  return (
    <nav className="space-y-4">
      <Link
        to="/"
        className={`font-label block rounded-md px-3 py-1.5 text-sm font-medium ${
          !activeCategoryId ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        {t("nav.allCategories")}
      </Link>

      <ul className="space-y-1">
        {categories.map((category, index) => {
          const name = localizedField(category, "name", i18n.language);
          const isActive =
            category.id === activeCategoryId || category.children.some((child) => child.id === activeCategoryId);

          return (
            <li key={category.id}>
              <Link
                to={`/category/${category.id}`}
                className={`font-label flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold ${
                  isActive ? "bg-emerald-600 text-white" : "text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <CategoryAvatar
                  imagePath={category.image_path}
                  name={name}
                  colorClass={CATEGORY_AVATAR_COLORS[index % CATEGORY_AVATAR_COLORS.length]}
                  className="h-5 w-5 text-[10px]"
                />
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
