const ANIMATION_MS = 650;

/** A plain, minimal rect — deliberately not `DOMRect` itself, so a caller
 * can hand over either a real element's `getBoundingClientRect()` or a
 * small synthetic square (e.g. centered on a click point) without needing
 * an element to measure. */
export type FlyRect = { left: number; top: number; width: number; height: number };

/** A small square centered on `(x, y)` — e.g. a click/tap point — sized to
 * roughly match a button's scale rather than the huge product photo, so
 * the flourish reads as a quick flick instead of shrinking a full image. */
export function squareRectAt(x: number, y: number, size = 40): FlyRect {
  return { left: x - size / 2, top: y - size / 2, width: size, height: size };
}

/**
 * A small purely-decorative flourish: clones the product image and
 * animates it flying from `sourceRect` to whichever cart icon is
 * currently visible (the notched bottom-bar button on mobile, the header
 * icon on desktop — both are marked with `data-cart-target`), then calls
 * `onLand`. Falls back to calling `onLand` immediately — never blocking
 * the actual add-to-cart — if the user prefers reduced motion or no cart
 * icon is currently in the DOM.
 */
export function flyToCart(sourceRect: FlyRect, imageUrl: string | null, onLand: () => void): void {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find(
    (el) => el.offsetParent !== null,
  );

  if (prefersReducedMotion || !target) {
    onLand();
    return;
  }

  const targetRect = target.getBoundingClientRect();

  const flyer = document.createElement(imageUrl ? "img" : "div");
  if (imageUrl && flyer instanceof HTMLImageElement) flyer.src = imageUrl;
  Object.assign(flyer.style, {
    position: "fixed",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    borderRadius: "9999px",
    objectFit: "cover",
    background: imageUrl ? "transparent" : "#059669",
    pointerEvents: "none",
    zIndex: "60",
    transition: `transform ${ANIMATION_MS}ms cubic-bezier(0.5, -0.2, 0.7, 1), opacity ${ANIMATION_MS}ms ease-in`,
  });
  document.body.appendChild(flyer);

  const deltaX = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
  const deltaY = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
  const scale = Math.max(targetRect.width / sourceRect.width, 0.12);

  requestAnimationFrame(() => {
    flyer.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scale})`;
    flyer.style.opacity = "0.3";
  });

  window.setTimeout(() => {
    flyer.remove();
    onLand();
  }, ANIMATION_MS);
}
