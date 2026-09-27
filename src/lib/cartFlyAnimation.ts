const ANIMATION_MS = 650;

/**
 * A small purely-decorative flourish: clones the product image and
 * animates it flying from `sourceEl` to whichever cart icon is currently
 * visible (the notched bottom-bar button on mobile, the header icon on
 * desktop — both are marked with `data-cart-target`), then calls `onLand`.
 * Falls back to calling `onLand` immediately — never blocking the actual
 * add-to-cart — if the user prefers reduced motion or no cart icon is
 * currently in the DOM.
 */
export function flyToCart(sourceEl: HTMLElement, imageUrl: string | null, onLand: () => void): void {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = [...document.querySelectorAll<HTMLElement>("[data-cart-target]")].find(
    (el) => el.offsetParent !== null,
  );

  if (prefersReducedMotion || !target) {
    onLand();
    return;
  }

  const sourceRect = sourceEl.getBoundingClientRect();
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
