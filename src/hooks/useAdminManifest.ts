import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const DEFAULT_MANIFEST = "/manifest.webmanifest";
const ADMIN_MANIFEST = "/admin-manifest.webmanifest";
const DEFAULT_APPLE_TITLE = "Hamada";
const ADMIN_APPLE_TITLE = "Hamada Admin";

/**
 * Lets the admin section install as its own separate home-screen app
 * (distinct name/icon/launch target) instead of sharing the storefront's,
 * even though both are served from one SPA under one origin. Swapping the
 * `<link rel="manifest">` (Chrome/Android) and the apple-mobile-web-app
 * meta tags (iOS, which mostly ignores the manifest) before an install
 * prompt is triggered is enough — both platforms read the current DOM
 * state at install time, not just what shipped in the initial HTML. The
 * two manifests' `scope` (`/` vs `/admin`) keeps the resulting installs
 * targeting the right start page even though they share one service
 * worker covering the whole origin.
 */
export function useAdminManifest() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isAdmin = pathname.startsWith("/admin");

    const manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (manifestLink) manifestLink.href = isAdmin ? ADMIN_MANIFEST : DEFAULT_MANIFEST;

    const appleTitleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
    if (appleTitleMeta) appleTitleMeta.content = isAdmin ? ADMIN_APPLE_TITLE : DEFAULT_APPLE_TITLE;
  }, [pathname]);
}
