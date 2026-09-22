import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useParams } from "react-router-dom";
import { Chevron } from "./Chevron";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

export function CategoryNav({ categories }: { categories: CategoryWithChildren[] }) {
  const { t, i18n } = useTranslation();
  const { categoryId: activeCategoryId } = useParams();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Auto-expand the branch containing the currently selected (sub)category,
  // so navigating here from a link never hides the active selection.
  useEffect(() => {
    if (!activeCategoryId) return;
    const parent = categories.find(
      (c) => c.id === activeCategoryId || c.children.some((child) => child.id === activeCategoryId),
    );
    if (parent) setExpanded((prev) => new Set(prev).add(parent.id));
  }, [activeCategoryId, categories]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <nav className="space-y-4">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `font-label block rounded-md px-3 py-1.5 text-sm font-medium ${
            isActive ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
          }`
        }
      >
        {t("nav.allCategories")}
      </NavLink>

      <ul className="space-y-1">
        {categories.map((category) => {
          const isOpen = expanded.has(category.id);
          const hasChildren = category.children.length > 0;

          return (
            <li key={category.id}>
              <div className="flex items-center">
                {hasChildren && (
                  <button
                    type="button"
                    onClick={() => toggle(category.id)}
                    aria-expanded={isOpen}
                    aria-label={isOpen ? "Collapse" : "Expand"}
                    className="w-6 shrink-0 text-center text-neutral-400 hover:text-neutral-700"
                  >
                    <Chevron open={isOpen} />
                  </button>
                )}
                <NavLink
                  to={`/category/${category.id}`}
                  className={({ isActive }) =>
                    `font-label block flex-1 rounded-md px-2 py-1.5 text-sm font-semibold ${
                      hasChildren ? "" : "ms-6"
                    } ${isActive ? "bg-emerald-600 text-white" : "text-neutral-900 hover:bg-neutral-100"}`
                  }
                >
                  {localizedField(category, "name", i18n.language)}
                </NavLink>
              </div>
              {hasChildren && isOpen && (
                <ul className="ms-3 mt-1 space-y-1 border-s border-neutral-200 ps-3">
                  {category.children.map((child) => (
                    <li key={child.id}>
                      <NavLink
                        to={`/category/${child.id}`}
                        className={({ isActive }) =>
                          `font-label block rounded-md px-2 py-1 text-sm ${
                            isActive
                              ? "bg-emerald-600 text-white"
                              : "text-neutral-600 hover:bg-neutral-100"
                          }`
                        }
                      >
                        {localizedField(child, "name", i18n.language)}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
