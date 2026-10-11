import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CategoryAvatar } from "./CategoryAvatar";
import { localizedField } from "../lib/localize";
import type { CategoryWithChildren } from "../types/database";

/**
 * A top-level category, presented as a browseable card (image + name +
 * how much is inside it) rather than a plain text row — replaces the old
 * expandable list row on the dedicated /categories page. Always links
 * straight to the category itself; picking a specific subcategory from
 * here isn't the point (that's what the in-category picker is for) — this
 * is about deciding which top-level section to go into at all.
 */
export function CategoryCard({
  category,
  productCount,
  colorClass,
}: {
  category: CategoryWithChildren;
  productCount: number;
  colorClass: string;
}) {
  const { t, i18n } = useTranslation();
  const name = localizedField(category, "name", i18n.language);

  return (
    <Link
      to={`/category/${category.id}`}
      className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-center transition hover:shadow-md"
    >
      <CategoryAvatar imagePath={category.image_path} name={name} colorClass={colorClass} className="h-16 w-16 text-xl" />
      <span className="font-label font-semibold text-neutral-900">{name}</span>
      <span className="font-label text-xs text-neutral-500">
        {category.children.length > 0 && (
          <>
            {t("categories.subcategoriesCount", { count: category.children.length })}
            {" · "}
          </>
        )}
        {t("categories.productsCount", { count: productCount })}
      </span>
    </Link>
  );
}
