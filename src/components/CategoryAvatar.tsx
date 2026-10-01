import { categoryImageUrl } from "../lib/supabase";

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
