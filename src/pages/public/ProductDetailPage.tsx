import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AskWhatsAppButton } from "../../components/AskWhatsAppButton";
import { DiscountPrice } from "../../components/DiscountPrice";
import { FavoriteButton } from "../../components/FavoriteButton";
import { QuantityStepper } from "../../components/QuantityStepper";
import { ShareWhatsAppButton } from "../../components/ShareWhatsAppButton";
import { SimilarProductsSection } from "../../components/SimilarProductsSection";
import { useCart } from "../../context/CartContext";
import { flyToCart, squareRectAt } from "../../lib/cartFlyAnimation";
import {
  daysRemaining,
  fetchLimitedTimeDiscount,
  fetchQuantityDiscount,
  isLimitedTimeDiscountActive,
} from "../../lib/discounts";
import { formatPrice, localizedField, shouldShowUnit } from "../../lib/localize";
import { fetchProductImages } from "../../lib/productImages";
import { fetchProductById } from "../../lib/products";
import { recordProductView } from "../../lib/recentlyViewed";
import { productImageUrl } from "../../lib/supabase";
import type { LimitedTimeDiscount, Product, ProductImage, QuantityDiscount } from "../../types/database";

export function ProductDetailPage() {
  const { t, i18n } = useTranslation();
  const { productId } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [extraImages, setExtraImages] = useState<ProductImage[]>([]);
  const [limitedTimeDiscount, setLimitedTimeDiscount] = useState<LimitedTimeDiscount | null>(null);
  const [quantityDiscount, setQuantityDiscount] = useState<QuantityDiscount | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Cover photo plus whatever's in product_images — one path per carousel
  // slide/thumbnail, in display order.
  const images = useMemo(() => {
    if (!product) return [];
    return [product.image_path, ...extraImages.map((img) => img.image_path)].filter(
      (path): path is string => !!path,
    );
  }, [product, extraImages]);

  // Which slide is currently in view — same auto-advancing, RTL-safe
  // horizontal-scroll mechanics as DealsCarousel (IntersectionObserver
  // tracks manual swipes, a geometry-based scrollBy moves it
  // programmatically either way), just one full-size image per slide
  // instead of several partially-visible cards.
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const slideRatiosRef = useRef<number[]>([]);
  const pausedUntilRef = useRef(0);
  const ignoreObserverUntilRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!productId) return;
    setActiveIndex(0);
    fetchProductById(productId).then((fetchedProduct) => {
      setProduct(fetchedProduct);
      if (fetchedProduct) recordProductView(fetchedProduct.id);
    });
    fetchProductImages(productId)
      .then(setExtraImages)
      .catch(() => setExtraImages([]));
    fetchLimitedTimeDiscount(productId)
      .then((discount) => setLimitedTimeDiscount(discount && isLimitedTimeDiscountActive(discount) ? discount : null))
      .catch(() => setLimitedTimeDiscount(null));
    fetchQuantityDiscount(productId)
      .then(setQuantityDiscount)
      .catch(() => setQuantityDiscount(null));
  }, [productId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || images.length === 0) return;

    slideRatiosRef.current = images.map(() => 0);

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < ignoreObserverUntilRef.current) return;
        entries.forEach((entry) => {
          const index = slideRefs.current.findIndex((el) => el === entry.target);
          if (index !== -1) slideRatiosRef.current[index] = entry.intersectionRatio;
        });
        let bestIndex = 0;
        let bestRatio = -1;
        slideRatiosRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestIndex = index;
          }
        });
        setActiveIndex(bestIndex);
      },
      { root: scroller, threshold: [0, 0.5, 1] },
    );

    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) slideRefs.current.forEach((el) => el && observer.observe(el));
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [images]);

  // Auto-advance through the photos on a timer, unless the user asked for
  // reduced motion or recently swiped/clicked a thumbnail themselves.
  useEffect(() => {
    if (images.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      if (Date.now() < pausedUntilRef.current) return;
      goToSlide((activeIndexRef.current + 1) % images.length);
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  function goToSlide(index: number) {
    const scroller = scrollerRef.current;
    const slide = slideRefs.current[index];
    if (!scroller || !slide) return;

    ignoreObserverUntilRef.current = Date.now() + 600;
    setActiveIndex(index);

    // scrollBy on the strip's own element only ever moves that element,
    // never an ancestor — unlike scrollIntoView, which would also yank the
    // whole page if the user had scrolled past this section.
    const scrollerRect = scroller.getBoundingClientRect();
    const slideRect = slide.getBoundingClientRect();
    const delta = slideRect.left - scrollerRect.left;
    scroller.scrollBy({ left: delta, behavior: "smooth" });
  }

  function pauseAutoAdvance() {
    pausedUntilRef.current = Date.now() + 6000;
  }

  if (product === undefined) {
    return <p className="text-neutral-500">{t("common.loading")}</p>;
  }

  if (product === null) {
    return (
      <div className="space-y-4">
        <p className="text-neutral-500">{t("product.notFound")}</p>
        <Link to="/" className="text-emerald-700 underline">
          {t("product.backToCatalog")}
        </Link>
      </div>
    );
  }

  const imageUrl = productImageUrl(images[activeIndex] ?? null);
  const name = localizedField(product, "name", i18n.language);
  const description = localizedField(product, "description", i18n.language);

  function handleAddToCart(e: React.MouseEvent<HTMLButtonElement>) {
    // Safe: this handler is only ever wired up to a button below, which
    // only renders once the early returns above have ruled out null/undefined.
    const id = product!.id;
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
    // A small square centered on the actual tap/click point, not the
    // button's own (wide, short) rect — the button is a long pill, so
    // using its full bounds would fly a stretched banner shape instead of
    // a clean square, and starting exactly where the finger tapped reads
    // as more responsive than always starting from the button's center.
    flyToCart(squareRectAt(e.clientX, e.clientY), imageUrl, () => addToCart(id, quantity));
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/" className="font-label mb-4 inline-block text-sm text-emerald-700 underline">
        {t("product.backToCatalog")}
      </Link>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div className="space-y-3">
          {/* Square, matching the admin upload/capture crop exactly — the
           * add-to-cart row is sticky-clamped near the bottom independently
           * of this, so a taller image no longer risks landing it behind
           * the fixed bottom nav/cart button on shorter phones.
           *
           * One photo fills the whole box at a time — swiping/scrolling
           * snaps to the next whole slide (scroll-snap, not free scroll),
           * every slide the same fixed square size so nothing zooms in or
           * out as it changes. Auto-advances on a timer when left alone;
           * see the effect above for the RTL-safe scroll mechanics
           * (shared with DealsCarousel). */}
          {images.length > 0 ? (
            <div
              ref={scrollerRef}
              className="scrollbar-hide flex aspect-square w-full snap-x snap-mandatory overflow-x-auto rounded-xl bg-neutral-100"
              onPointerDown={pauseAutoAdvance}
              onWheel={pauseAutoAdvance}
              onTouchStart={pauseAutoAdvance}
            >
              {images.map((path, index) => (
                <div
                  key={path}
                  ref={(el) => {
                    slideRefs.current[index] = el;
                  }}
                  className="h-full w-full shrink-0 snap-start"
                >
                  <img
                    src={productImageUrl(path) ?? undefined}
                    alt={index === 0 ? name : ""}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-neutral-100 text-neutral-300">
              <span className="text-6xl">🛒</span>
            </div>
          )}
          {/* Only shown once there's actually more than one photo — the
           * cover plus whatever's in product_images (lib/productImages.ts). */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((path, index) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => {
                    pauseAutoAdvance();
                    goToSlide(index);
                  }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-neutral-100 ${
                    index === activeIndex ? "border-emerald-600" : "border-transparent"
                  }`}
                >
                  <img src={productImageUrl(path) ?? undefined} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-heading text-2xl font-bold text-neutral-900">{name}</h1>
            <FavoriteButton productId={product.id} className="h-9 w-9 shrink-0 border border-neutral-200" />
          </div>
          {product.size && (
            <p className="font-label text-sm text-neutral-500">
              {t("product.size")}: {product.size}
            </p>
          )}
          <div className="font-label flex flex-wrap items-baseline gap-2">
            {limitedTimeDiscount ? (
              <DiscountPrice
                originalPrice={product.price}
                newPrice={limitedTimeDiscount.new_price}
                lang={i18n.language}
                size="lg"
              />
            ) : (
              <p className="text-2xl font-semibold text-emerald-700">
                {formatPrice(product.price, i18n.language)}
              </p>
            )}
            {shouldShowUnit(product.unit) && (
              <span className="text-base font-normal text-neutral-500">/ {t(`unit.${product.unit}`)}</span>
            )}
          </div>
          {limitedTimeDiscount && (
            <p className="text-sm text-red-600">
              {t("deals.endsIn", { count: daysRemaining(limitedTimeDiscount.ends_at) })}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-label inline-block rounded-full px-3 py-1 text-sm ${
                product.in_stock ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {t(product.in_stock ? "product.inStock" : "product.outOfStock")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AskWhatsAppButton product={product} />
            <ShareWhatsAppButton product={product} />
          </div>
          {description && <p className="text-neutral-600">{description}</p>}

          {quantityDiscount && quantityDiscount.tiers.length > 0 && (
            <div className="rounded-xl border border-neutral-200 p-3">
              <h2 className="font-heading mb-2 text-sm font-semibold text-neutral-900">{t("deals.quantityDiscountTitle")}</h2>
              <ul className="space-y-1.5">
                {quantityDiscount.tiers.map((tier) => (
                  <li key={tier.id} className="font-label flex items-center justify-between gap-3 text-sm">
                    <span className="text-neutral-600">
                      {t("deals.tierLabel", { count: tier.min_quantity })}
                    </span>
                    <DiscountPrice
                      originalPrice={product.price}
                      newPrice={tier.price}
                      lang={i18n.language}
                      size="sm"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sticky (not fixed) on mobile, clamped just above the notched
           * cart button/bottom nav — a plain in-flow row here can land
           * exactly behind those on shorter phones, since a full-width
           * product image plus everything above it can easily exceed a
           * short viewport's height on its own. `sticky` still scrolls
           * normally the rest of the time, it just refuses to go further
           * than that safe distance from the bottom. Reverts to a normal
           * inline row from `sm:` up, where the two-column layout means
           * this never gets anywhere near the bottom of the viewport. */}
          <div className="sticky bottom-[var(--mobile-fab-safe)] z-20 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-sm sm:static sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.in_stock}
              className="font-label flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-none"
            >
              {justAdded ? t("cart.added") : t("cart.addToCart")}
            </button>
          </div>
        </div>
      </div>
      <div className="mt-8">
        <SimilarProductsSection product={product} />
      </div>
    </div>
  );
}
