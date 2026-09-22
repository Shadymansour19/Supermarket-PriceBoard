import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Chevron } from "../../components/Chevron";
import { fetchCategoryTree } from "../../lib/categories";
import { localizedField } from "../../lib/localize";
import type { CategoryWithChildren } from "../../types/database";

/** Cycled by row index so the list reads as a set of distinct sections at
 * a glance, rather than a flat wall of identical rows — categories have no
 * icon/image of their own to do that job. */
const AVATAR_COLORS = [
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-indigo-100 text-indigo-700",
];

/**
 * Dedicated "browse by category" page, reached from the mobile bottom nav
 * bar (replacing the old inline dropdown toggle). Tapping a category's
 * name goes straight to `/category/:id` (all of its products, including
 * subcategories'); tapping the chevron instead expands its subcategories
 * inline, so picking a specific one doesn't need a page round-trip.
 */
export function CategoriesPage() {
  const { t, i18n } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithChildren[] | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategoryTree()
      .then(setCategories)
      .catch(() => setError(true));
  }, []);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-lg font-semibold text-neutral-900">{t("nav.categories")}</h1>

      {categories === null && !error && <p className="text-neutral-500">{t("common.loading")}</p>}
      {error && <p className="text-red-600">{t("common.error")}</p>}

      {categories && categories.length > 0 && (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {categories.map((category, index) => {
            const hasChildren = category.children.length > 0;
            const isOpen = expanded.has(category.id);
            const name = localizedField(category, "name", i18n.language);

            return (
              <li key={category.id}>
                <div className="flex items-center gap-3 px-3 py-2.5">
                  <span
                    className={`font-heading flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                      AVATAR_COLORS[index % AVATAR_COLORS.length]
                    }`}
                    aria-hidden="true"
                  >
                    {name.charAt(0)}
                  </span>
                  <Link to={`/category/${category.id}`} className="font-label flex-1 py-1 text-neutral-900">
                    {name}
                  </Link>
                  {hasChildren ? (
                    <button
                      type="button"
                      onClick={() => toggle(category.id)}
                      aria-expanded={isOpen}
                      aria-label={isOpen ? t("common.hide") : t("common.show")}
                      className="font-label flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
                    >
                      {category.children.length}
                      <Chevron open={isOpen} />
                    </button>
                  ) : (
                    <span className="shrink-0 text-neutral-300" aria-hidden="true">
                      <Chevron open={false} />
                    </span>
                  )}
                </div>

                {hasChildren && isOpen && (
                  <ul className="ms-14 space-y-0.5 border-s border-neutral-200 ps-3 pb-2">
                    {category.children.map((child) => (
                      <li key={child.id}>
                        <Link
                          to={`/category/${child.id}`}
                          className="font-label block rounded-md px-2 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
                        >
                          {localizedField(child, "name", i18n.language)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
