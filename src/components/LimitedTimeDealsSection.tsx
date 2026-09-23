import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ProductCard } from "./ProductCard";
import { discountPercent, fetchActiveLimitedTimeDeals } from "../lib/discounts";
import type { LimitedTimeDiscount, Product } from "../types/database";

/** How many deals the home page teaser shows before "Show more" takes over. */
const PREVIEW_LIMIT = 5;

/** How often the strip auto-advances to the next card. */
const AUTO_ADVANCE_MS = 4000;
/** How long a manual scroll/swipe/dot-click pauses auto-advance for. */
const RESUME_AFTER_MS = 6000;
/** How long to ignore the visibility observer after we scroll the strip
 * ourselves — long enough for a short smooth-scroll to finish settling. */
const PROGRAMMATIC_SCROLL_SETTLE_MS = 600;

/**
 * Home-page-only horizontally-scrolling teaser of active limited-time
 * discounts, linking to the full `/deals` page. Shows the biggest
 * percentage-off deals first, since a teaser is about grabbing attention —
 * the full `/deals` page is where "everything, soonest-expiring first"
 * lives. Renders nothing if there are none active, so it never leaves an
 * empty section on the page.
 *
 * Auto-advances one card at a time. The active dot is set directly
 * whenever *we* move the strip (auto-advance or a dot click) — trusting
 * geometry instead would be ambiguous here, since the strip is wide
 * enough to show more than one card fully at once (e.g. at either scroll
 * edge), so "most visible card" doesn't always mean "the one just
 * scrolled to". An IntersectionObserver still tracks it the rest of the
 * time, so the dots stay honest if the user swipes the strip themselves.
 * Auto-advance pauses for a while after any manual interaction, and
 * doesn't run at all under prefers-reduced-motion.
 */
export function LimitedTimeDealsSection() {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<{ product: Product; discount: LimitedTimeDiscount }[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pausedUntilRef = useRef(0);
  const ignoreObserverUntilRef = useRef(0);

  useEffect(() => {
    fetchActiveLimitedTimeDeals()
      .then((allDeals) => {
        const byBiggestDiscount = [...allDeals].sort(
          (a, b) =>
            discountPercent(b.product.price, b.discount.new_price) -
            discountPercent(a.product.price, a.discount.new_price),
        );
        setDeals(byBiggestDiscount.slice(0, PREVIEW_LIMIT));
      })
      .catch(() => setDeals([]));
  }, []);

  // Tracks whichever card is most visible, for the case the user swipes
  // the strip themselves rather than using a dot or waiting for
  // auto-advance. A callback only reports entries whose ratio crossed a
  // threshold since the last check, not every observed card's current
  // state — so "most visible" has to be computed from a running record of
  // every card's last-known ratio, not just the entries in that one
  // callback (which could easily be a single stale-looking card).
  const cardRatiosRef = useRef<number[]>([]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !deals || deals.length === 0) return;

    cardRatiosRef.current = deals.map(() => 0);

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverUntilRef.current) return;
        entries.forEach((entry) => {
          const index = cardRefs.current.findIndex((el) => el === entry.target);
          if (index !== -1) cardRatiosRef.current[index] = entry.intersectionRatio;
        });
        let bestIndex = 0;
        let bestRatio = -1;
        cardRatiosRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        setActiveIndex(bestIndex);
      },
      { root: scroller, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    // Observing right away means the very first (still-settling) layout
    // pass can report a spurious tie — e.g. cards 0 and 1 both "fully
    // visible" for a frame before web fonts swap in and reflow the strip
    // (a font-load reflow was reproducible and confirmed as one real cause
    // of this during testing). activeIndex already starts at 0, correct
    // for an unscrolled strip, so it's enough to wait for fonts to settle
    // before trusting the observer, rather than guessing a delay.
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) cardRefs.current.forEach((el) => el && observer.observe(el));
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [deals]);

  // Auto-advance, unless the user asked for reduced motion or recently
  // interacted with the strip themselves.
  // setInterval below closes over a stale activeIndex otherwise.
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!deals || deals.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      goTo((activeIndexRef.current + 1) % deals.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals]);

  function goTo(index: number) {
    const scroller = scrollerRef.current;
    const card = cardRefs.current[index];
    if (!scroller || !card) return;

    ignoreObserverUntilRef.current = Date.now() + PROGRAMMATIC_SCROLL_SETTLE_MS;
    setActiveIndex(index);

    // Deliberately not card.scrollIntoView() — it walks every scrollable
    // ancestor, including the page itself, so if the user had scrolled
    // elsewhere on the page, auto-advance would yank the whole page back
    // to this section every few seconds. scrollBy on the strip's own
    // element only ever moves that element, never an ancestor.
    //
    // getBoundingClientRect gives physical (left-to-right) viewport
    // coordinates, and — verified empirically, not just assumed — the
    // rectLeft-to-scrollLeft relationship turns out to be the same
    // direction in RTL as in LTR; only the *valid range* of scrollLeft
    // differs (negative in RTL, clamped there automatically), which
    // doesn't affect this delta at all. No RTL sign flip needed — one was
    // tried here and confirmed wrong (it doubled the error instead of
    // centering the card).
    const scrollerRect = scroller.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = cardRect.left + cardRect.width / 2 - (scrollerRect.left + scrollerRect.width / 2);
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }

  function pauseAutoAdvance() {
    pausedUntilRef.current = Date.now() + RESUME_AFTER_MS;
  }

  if (!deals || deals.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-neutral-900">{t("deals.sectionTitle")}</h2>
        <Link to="/deals" className="font-label text-sm font-medium text-emerald-700 hover:underline">
          {t("deals.showMore")}
        </Link>
      </div>
      <div
        ref={scrollerRef}
        className="scrollbar-hide flex items-center gap-4 overflow-x-auto py-3"
        onPointerDown={pauseAutoAdvance}
        onWheel={pauseAutoAdvance}
        onTouchStart={pauseAutoAdvance}
      >
        {deals.map(({ product, discount }, index) => (
          <div
            key={product.id}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            className={`relative w-[58vw] max-w-[260px] shrink-0 transition-transform duration-300 ease-out ${
              index === activeIndex ? "z-10 scale-110" : "scale-100"
            }`}
          >
            <ProductCard product={product} limitedTimeDiscount={discount} />
          </div>
        ))}
      </div>
      {deals.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {deals.map((deal, index) => (
            <button
              key={deal.product.id}
              type="button"
              aria-label={t("deals.goToSlide", { count: index + 1 })}
              aria-current={index === activeIndex}
              onClick={() => {
                pauseAutoAdvance();
                goTo(index);
              }}
              className={`h-1.5 rounded-full transition-all ${
                index === activeIndex ? "w-5 bg-emerald-600" : "w-1.5 bg-neutral-300 hover:bg-neutral-400"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
