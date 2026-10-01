import { categoryImageUrl } from "../lib/supabase";

/** Cycled by index wherever a list of categories needs a fallback color per
 * row/item — shared so every category listing (sidebar, categories page,
 * admin list, this row) reads as the same consistent set of colors instead
 * of each screen inventing its own. */
export const CATEGORY_AVATAR_COLORS = [
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
 * A category's own image if it has one, otherwise the same colored-letter
 * fallback used everywhere a category needs a small visual anchor (admin
 * list, the public categories page, the sidebar nav) — shared so all three
 * stay in sync instead of re-implementing the same fallback three times.
 */
export function CategoryAvatar({
  imagePath,
  name,
  colorClass,
  className = "h-8 w-8 text-sm",
}: {
  imagePath: string | null;
  name: string;
  /** Background/text color classes for the letter fallback — ignored once
   * there's a real image. */
  colorClass: string;
  className?: string;
}) {
  const url = categoryImageUrl(imagePath);
  if (url) {
    return <img src={url} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span
      className={`font-heading flex shrink-0 items-center justify-center rounded-full font-bold ${colorClass} ${className}`}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </span>
  );
}
