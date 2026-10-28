import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Resets the scroll position on every route change. React Router doesn't do
 * this itself the way a full page navigation would — without it, clicking a
 * product card from partway down a scrolled catalog lands on the product
 * page still scrolled to that same spot, instead of at its top.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
