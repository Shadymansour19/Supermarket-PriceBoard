import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

export function CategoryNav({ categories }: { categories: CategoryWithChildren[] }) {
  const { t, i18n } = useTranslation();

  return (
    <nav className="space-y-4">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `block rounded-md px-3 py-1.5 text-sm font-medium ${
            isActive ? "bg-emerald-600 text-white" : "text-neutral-700 hover:bg-neutral-100"
          }`
        }
      >
        {t("nav.allCategories")}
      </NavLink>

      <ul className="space-y-3">
        {categories.map((category) => (
          <li key={category.id}>
            <NavLink
              to={`/category/${category.id}`}
              className={({ isActive }) =>
                `block rounded-md px-3 py-1.5 text-sm font-semibold ${
                  isActive ? "bg-emerald-600 text-white" : "text-neutral-900 hover:bg-neutral-100"
                }`
              }
            >
              {localizedField(category, "name", i18n.language)}
            </NavLink>
            {category.children.length > 0 && (
              <ul className="ms-3 mt-1 space-y-1 border-s border-neutral-200 ps-3">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <NavLink
                      to={`/category/${child.id}`}
                      className={({ isActive }) =>
                        `block rounded-md px-3 py-1 text-sm ${
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
        ))}
      </ul>
    </nav>
  );
}
