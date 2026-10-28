/**
 * Minimal external store bridging `main.tsx`'s service-worker registration
 * (outside React) to the `UpdateBanner` component. No state library needed
 * for one boolean + one callback — `useSyncExternalStore` is enough.
 */
type Listener = () => void;

let needsRefresh = false;
let applyFn: ((reload?: boolean) => Promise<void>) | null = null;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Called from main.tsx's `onNeedRefresh` once a new service worker is
 * installed and waiting — `updateSW` is the function `registerSW()` itself
 * returned (captured by the caller before this ever fires). */
export function setNeedsRefresh(updateSW: (reload?: boolean) => Promise<void>) {
  applyFn = updateSW;
  needsRefresh = true;
  notify();
}

export function getNeedsRefresh() {
  return needsRefresh;
}

export function subscribeNeedsRefresh(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Swaps in the waiting service worker and reloads. */
export function applyUpdate() {
  return applyFn?.(true);
}

/** Dismissing just hides the bar for this page view — it isn't a
 * "don't ask again": a fresh page load re-registers and would still be on
 * the old cached build until this actually runs. */
export function dismissUpdate() {
  needsRefresh = false;
  notify();
}
