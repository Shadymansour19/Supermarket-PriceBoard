// Vercel Edge Function — serves per-product Open Graph/Twitter Card meta
// tags to link-preview crawlers (WhatsApp, Facebook, Twitter, ...) that
// request /product/:id directly. This app is a client-rendered SPA with a
// single static index.html, so without this, sharing any product link
// would only ever show the site's generic preview (index.html's own
// og:* tags) instead of that product's name/photo/price — the actual
// page a crawler fetches never runs the React code that would otherwise
// show the right thing.
//
// Only reached for known bot user agents — see the `has` matcher in
// vercel.json — so this never runs for an actual visitor; they get the
// normal SPA via the existing catch-all rewrite, completely unaffected.
export const config = { runtime: "edge" };

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const IMAGE_BUCKET = "product-images";

const FALLBACK_TITLE = "Super Market Hamada";
const FALLBACK_DESCRIPTION = "Groceries from Super Market Hamada — browse the catalog and order on WhatsApp.";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function metaPage(title: string, description: string, image: string, pageUrl: string): string {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(pageUrl);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${safeTitle}</title>
<meta property="og:type" content="product" />
<meta property="og:site_name" content="Super Market Hamada" />
<meta property="og:title" content="${safeTitle}" />
<meta property="og:description" content="${safeDescription}" />
<meta property="og:image" content="${safeImage}" />
<meta property="og:url" content="${safeUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${safeTitle}" />
<meta name="twitter:description" content="${safeDescription}" />
<meta name="twitter:image" content="${safeImage}" />
</head>
<body></body>
</html>`;
}

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const siteUrl = `${url.protocol}//${url.host}`;
  const fallbackImage = `${siteUrl}/logo.jpg`;
  // The canonical page URL, not this function's own rewritten request URL
  // (which carries the `?id=` query param vercel.json's rewrite added).
  const pageUrl = `${siteUrl}/product/${id ?? ""}`;

  if (!id || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return htmlResponse(metaPage(FALLBACK_TITLE, FALLBACK_DESCRIPTION, fallbackImage, pageUrl));
  }

  try {
    const apiUrl =
      `${SUPABASE_URL}/rest/v1/products` +
      `?id=eq.${encodeURIComponent(id)}&is_active=eq.true` +
      `&select=name_ar,name_en,description_ar,description_en,price,image_path`;
    const res = await fetch(apiUrl, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    });
    const rows = res.ok ? ((await res.json()) as Record<string, unknown>[]) : [];
    const product = rows[0];

    if (!product) {
      return htmlResponse(metaPage(FALLBACK_TITLE, FALLBACK_DESCRIPTION, fallbackImage, pageUrl));
    }

    const title = (product.name_ar as string) || (product.name_en as string) || FALLBACK_TITLE;
    const description =
      (product.description_ar as string) ||
      (product.description_en as string) ||
      `${product.price as number} ج.م`;
    const imagePath = product.image_path as string | null;
    const image = imagePath
      ? `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${imagePath}`
      : fallbackImage;

    return htmlResponse(metaPage(title, description, image, pageUrl));
  } catch {
    // A Supabase hiccup shouldn't break the preview entirely — the generic
    // site card is still a reasonable fallback.
    return htmlResponse(metaPage(FALLBACK_TITLE, FALLBACK_DESCRIPTION, fallbackImage, pageUrl));
  }
}

function htmlResponse(html: string): Response {
  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Short cache: a crawler re-fetching soon after a price/photo edit
      // should see the update reasonably quickly, but repeat bot hits in
      // the same few minutes don't each cost a Supabase round-trip.
      "cache-control": "public, max-age=300",
    },
  });
}
