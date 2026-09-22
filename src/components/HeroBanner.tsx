import { useTranslation } from "react-i18next";

/**
 * Home-page-only welcome banner — purely branding, no data fetch. Slow
 * floating blur blobs plus a one-shot fade-in on mount (see the
 * hero-float/hero-fade-in keyframes in index.css, both disabled under
 * prefers-reduced-motion).
 */
export function HeroBanner() {
  const { t } = useTranslation();

  return (
    <section className="hero-fade-in relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-900 px-5 py-7 text-white sm:px-8 sm:py-10">
      <div className="hero-float pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div
        className="hero-float pointer-events-none absolute -start-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl"
        style={{ animationDelay: "2s" }}
      />
      <div className="relative flex items-center gap-4">
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
    </section>
  );
}
