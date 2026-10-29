import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CategoryAvatar } from "./CategoryAvatar";
import { CloseIcon } from "./ContactIcons";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

/** Below this many subcategories, scanning the plain list is faster than
 * typing — the search box only earns its keyboard-popping cost once there's
 * actually enough to search through. */
const SEARCH_THRESHOLD = 6;

/**
 * The "popout box" for picking a different category from within a category
 * page — scoped to just the current top-level category and its own
 * subcategories, not the full category list (that's what the sidebar/
 * /categories page are for). The top category itself is the first option
 * (all of its products, subcategories included), then each subcategory.
 */
export function CategoryPickerModal({
  topCategory,
  colorClass,
  onClose,
}: {
  topCategory: CategoryWithChildren;
  colorClass: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const topName = localizedField(topCategory, "name", i18n.language);
  const [search, setSearch] = useState("");
  const trimmedSearch = search.trim();
  const showSearch = topCategory.children.length > SEARCH_THRESHOLD;
  const visibleChildren = trimmedSearch
    ? topCategory.children.filter(
        (child) =>
          child.name_en.toLowerCase().includes(trimmedSearch.toLowerCase()) || child.name_ar.includes(trimmedSearch),
      )
    : topCategory.children;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("categories.selectCategory")}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[75vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 sm:max-w-sm sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-base font-bold text-neutral-900">{t("categories.selectCategory")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        {showSearch && (
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("categories.searchSubcategories")}
            className="font-label mb-2 w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        )}
        <ul className="divide-y divide-neutral-100">
          <li>
            <Link
              to={`/category/${topCategory.id}`}
              onClick={onClose}
              className="font-label flex items-center gap-3 py-2.5 font-semibold text-neutral-900 hover:text-emerald-700"
            >
              <CategoryAvatar imagePath={topCategory.image_path} name={topName} colorClass={colorClass} className="h-8 w-8 text-sm" />
              {topName}
            </Link>
            {visibleChildren.length > 0 ? (
              <ul className="ms-11 space-y-0.5 pb-2">
                {visibleChildren.map((child) => (
                  <li key={child.id}>
                    <Link
                      to={`/category/${child.id}`}
                      onClick={onClose}
                      className="font-label block rounded-md px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                    >
                      {localizedField(child, "name", i18n.language)}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              trimmedSearch && (
                <p className="font-label ms-11 pb-2 text-sm text-neutral-500">
                  {t("categories.noMatchingSubcategories")}
                </p>
              )
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}
