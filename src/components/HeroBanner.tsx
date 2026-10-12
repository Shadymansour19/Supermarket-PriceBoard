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

/** Little spark ticks, like the ones beside the ads' headlines. */
function Sparks({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 12h5M6 5.5l4 3.5M6 18.5l4-3.5" />
    </svg>
  );
}

/** Hand-drawn curly arrow (same one used on the ad posters), pointing at the CTA. */
function CurlyArrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 50"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M76 6C70 22 50 30 38 24C26 18 36 6 44 14C52 22 36 40 6 40" />
      <path d="M17 31 5 40l14 8" />
    </svg>
  );
}

/** A bar with wobbly, dry-brush edges (deterministic, so it never changes between renders). */
const UNDERLINE_PATH = (() => {
  let seed = 3;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const jag = (v: number) => (v + (rnd() - 0.5) * 3.2).toFixed(1);
  const top = [];
  const bottom = [];
  for (let x = 0; x <= 300; x += 6) {
    top.push(`${x},${jag(2)}`);
    bottom.unshift(`${x},${jag(10)}`);
  }
  return `M${top.join(" L")} L${bottom.join(" L")} Z`;
})();

const SCRIPT_FONT = "Rakkas, Lalezar, Cairo, system-ui, sans-serif";
// Same stacked-copies trick the ad posters use for the 3D headline; em units
// so the depth scales with the font size.
const HEADLINE_SHADOW = [1, 2, 3, 4, 5, 6]
  .map((n) => `${n * 0.012}em ${n * 0.022}em 0 #000`)
  .concat("0 0.3em 0.4em rgba(0,0,0,.45)")
  .join(", ");

/**
 * Home-page-only welcome banner — purely branding, no data fetch. Styled
 * after the store's social-media ads: dark green panel with a mint curve, a
 * gold hand-lettered line, a big white headline with a 3D black shadow, a
 * brush underline, feature pills and a gold call-to-action. The gradient
 * shimmer / floating icons are kept (see the hero-* keyframes in index.css,
 * all disabled under prefers-reduced-motion).
 */
export function HeroBanner() {
  const { t } = useTranslation();
  const chips = t("hero.chips", { returnObjects: true }) as string[];

  return (
    <section
      className="hero-fade-in relative isolate overflow-hidden rounded-2xl px-5 py-7 text-white sm:px-10 sm:py-12"
      style={{ backgroundColor: "#0f4a3a" }}
    >
      {/* Mint curve on the trailing side, like the ads' two-tone field. */}
      <svg
        className="pointer-events-none absolute inset-y-0 end-0 h-full w-[46%] ltr:-scale-x-100"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0 0H62C62 24 34 34 40 56C46 80 80 92 100 100H0Z" fill="#a6dcbf" opacity="0.3" />
      </svg>
      <div className="hero-shimmer pointer-events-none absolute inset-y-0 -start-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      {/* Dot grid, top corner, like the ads. */}
      <svg className="pointer-events-none absolute start-3 top-3 h-14 w-20 text-white/25" aria-hidden="true">
        <defs>
          <pattern id="hero-dots" width="14" height="14" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="2.2" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      {/* Dashed orbit rings, like the one around the ad photo. */}
      <svg
        className="pointer-events-none absolute -end-10 -bottom-10 h-44 w-44 text-[#f6b100]/50 sm:h-64 sm:w-64"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1.6" strokeDasharray="4 5" />
        <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" />
      </svg>

      <BasketIcon className="hero-float-rotate pointer-events-none absolute end-8 bottom-3 hidden h-14 w-14 text-white/15 sm:block" />
      <LeafIcon
        className="hero-float-rotate pointer-events-none absolute start-[38%] top-3 hidden h-9 w-9 text-white/15 sm:block"
        style={{ animationDelay: "1.2s" }}
      />
      <AppleIcon
        className="hero-float-rotate pointer-events-none absolute end-[26%] top-5 hidden h-8 w-8 text-white/15 sm:block"
        style={{ animationDelay: "2.4s" }}
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt=""
            className="h-12 w-12 shrink-0 rounded-full border-2 border-[#f6b100] object-cover sm:h-16 sm:w-16"
          />
          <span className="hero-badge-pulse font-label inline-flex items-center gap-1.5 rounded-full bg-[#ffeea8] px-3 py-1 text-xs font-bold text-[#0b3a2d] sm:text-sm">
            🛒 {t("hero.badge")}
          </span>
        </div>

        <p
          className="mt-4 flex items-center gap-2 text-2xl text-[#f6b100] sm:text-4xl"
          style={{ fontFamily: SCRIPT_FONT }}
        >
          {t("hero.script")}
          <Sparks className="h-6 w-6 -scale-x-100 text-white sm:h-8 sm:w-8 rtl:scale-x-100" />
        </p>
        <h1
          className="mt-1 text-4xl leading-tight font-black sm:text-6xl"
          style={{ fontFamily: "Cairo, Poppins, system-ui, sans-serif", textShadow: HEADLINE_SHADOW }}
        >
          {t("hero.title")}
        </h1>
        <svg
          viewBox="0 0 300 12"
          preserveAspectRatio="none"
          className="mt-3 h-3 w-72 sm:h-3.5 sm:w-[32rem]"
          aria-hidden="true"
        >
          {/* Ragged brush bar, same look as the underline on the ad posters. */}
          <path d={UNDERLINE_PATH} fill="#f6b100" />
        </svg>
        <p className="mt-3 max-w-md text-lg text-white sm:text-2xl" style={{ fontFamily: SCRIPT_FONT }}>
          {t("hero.subtitle")}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="font-label rounded-full bg-[#ffeea8] px-3 py-1 text-xs font-bold text-[#0b3a2d] shadow sm:text-sm"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Link
            to="/deals"
            className="font-label inline-flex items-center rounded-full bg-[#f6b100] px-6 py-2.5 text-base font-black text-[#06281d] shadow-lg ring-4 ring-[#f6b100]/25 transition hover:bg-[#ffc42e] sm:text-lg"
          >
            {t("hero.cta")}
          </Link>
          <CurlyArrow className="hero-nudge h-10 w-16 text-white/90 rtl:-scale-x-100 sm:h-12 sm:w-20" />
        </div>
      </div>
    </section>
  );
}
