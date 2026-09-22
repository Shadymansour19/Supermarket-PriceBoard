import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

type IconProps = { className?: string; style?: React.CSSProperties };

/** Decorative only, used nowhere else — kept local rather than in the
 * shared icon files. Rough silhouettes are fine at the low opacity/small
 * size they're rendered at here. */
function BasketIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M5 9h14l-1.2 9.5a2 2 0 0 1-2 1.5H8.2a2 2 0 0 1-2-1.5L5 9Z" />
      <path d="M8 9 9.5 4M16 9l-1.5-5M3 9h18" />
    </svg>
  );
}

function LeafIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M20 4c-9 0-16 7-16 16 9 0 16-7 16-16Z" />
      <path d="M6 18C10 14 14 10 18 6" />
    </svg>
  );
}

function AppleIcon({ className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d="M12 8c-4 0-7 3-7 7a6 6 0 0 0 6 6c1 0 1.5-.5 2-.5s1 .5 2 .5a6 6 0 0 0 6-6c0-4-3-7-7-7Z" />
      <path d="M12 8c0-2 1-4 3-4" />
    </svg>
  );
}

/**
 * Home-page-only welcome banner — purely branding, no data fetch. An
 * animated gradient, a light shimmer sweep, and slow-floating decorative
 * icons/blobs (see the hero-* keyframes in index.css, all disabled under
 * prefers-reduced-motion). No generated artwork here — this session had no
 * image-generation tool available, so the "image" is built entirely from
 * CSS/SVG instead of a raster asset.
 */
export function HeroBanner() {
  const { t } = useTranslation();

  return (
    <section
      className="hero-fade-in hero-gradient-shift relative isolate overflow-hidden rounded-2xl px-5 py-8 text-white sm:px-10 sm:py-14"
      style={{
        backgroundImage: "linear-gradient(120deg, #0f3d2e, #059669, #0f3d2e)",
        backgroundSize: "200% 200%",
      }}
    >
      <div className="hero-shimmer pointer-events-none absolute inset-y-0 -start-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="hero-float pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div
        className="hero-float pointer-events-none absolute -start-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl"
        style={{ animationDelay: "2s" }}
      />

      <BasketIcon
        className="hero-float-rotate pointer-events-none absolute end-8 bottom-3 hidden h-14 w-14 text-white/15 sm:block"
      />
      <LeafIcon
        className="hero-float-rotate pointer-events-none absolute start-[38%] top-3 hidden h-9 w-9 text-white/15 sm:block"
        style={{ animationDelay: "1.2s" }}
      />
      <AppleIcon
        className="hero-float-rotate pointer-events-none absolute end-[26%] top-5 hidden h-8 w-8 text-white/15 sm:block"
        style={{ animationDelay: "2.4s" }}
      />

      <div className="relative">
        <span className="hero-badge-pulse font-label inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm sm:text-sm">
          🛒 {t("hero.badge")}
        </span>
        <div className="mt-3 flex items-center gap-4">
          <img
            src="/logo.jpg"
            alt=""
            className="h-14 w-14 shrink-0 rounded-full border-2 border-white/40 object-cover sm:h-20 sm:w-20"
          />
          <div>
            <h1 className="font-heading text-xl font-bold sm:text-3xl">{t("hero.title")}</h1>
            <p className="mt-1 max-w-md text-emerald-50 sm:text-lg">{t("hero.subtitle")}</p>
          </div>
        </div>
        <Link
          to="/deals"
          className="font-label mt-5 inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:bg-emerald-50"
        >
          {t("hero.cta")}
        </Link>
      </div>
    </section>
  );
}
