import { useEffect, useRef, useState } from "react";

/**
 * True while the page has just scrolled down past `threshold`, false while
 * scrolling up or sitting near the top — for tucking a floating button out
 * of the way while reading, and bringing it back the moment the user
 * scrolls up looking for it. Small jitters under `threshold` are ignored
 * so it doesn't flicker on trackpad/momentum scrolling.
 */
export function useScrollDirection(threshold = 10) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function onScroll() {
      const y = window.scrollY;
      const diff = y - lastY.current;
      if (Math.abs(diff) < threshold) return;
      // Never hide near the top — nothing gained by tucking it away before
      // there's much to scroll past.
      setHidden(diff > 0 && y > 80);
      lastY.current = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return hidden;
}
