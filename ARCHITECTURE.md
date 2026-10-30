# Architecture — Super Market Hamada

A map of how the app fits together. For *why* decisions were made, see the
decision log in [SPEC.md](./SPEC.md). For step-by-step edit recipes, see
[HOWTO.md](./HOWTO.md).

## The big picture

```
 Browser (React SPA, installable PWA)                Supabase
┌──────────────────────────────────────┐      ┌─────────────────────────────┐
│ pages/ → components/ → lib/ ─────────┼─────►│ Postgres (tables + RLS)     │
│ context/ (auth, cart, favorites)     │ HTTPS│ Auth (admin login only)     │
│ localStorage (cart, favorites, ...)  │      │ Storage (product-images)    │
│ sw.ts (service worker, push)         │◄─────┼─ Edge Function: push sender │
└──────────────────────────────────────┘      └─────────────────────────────┘
        hosted on Vercel (static files)
```

- **There is no custom server.** The browser talks straight to Supabase using
  the public "anon" key. Security is enforced by **Row Level Security (RLS)**
  policies in Postgres, not by the frontend. Hiding an admin button in the UI
  is only cosmetic — the database refuses admin writes from non-admins.
- **No customer accounts.** Customers are anonymous. Cart, favorites, recently
  viewed and order history live in each device's `localStorage`
  (keys `hamada_cart`, `hamada_favorites`, `hamada_recently_viewed`,
  `hamada_order_history`). Clearing browser data clears them.
- **Orders are not processed by the app.** "Order via WhatsApp" opens a
  pre-filled WhatsApp message to the store. The app only logs the line items
  afterwards (to rank best sellers).
- **Only staff have accounts** — admins and cashiers (Supabase Auth + a row in
  `profiles` whose `role` is `admin` or `cashier`).

## Stack

React 19, Vite, TypeScript, Tailwind CSS v4 (RTL-aware), react-router v7,
i18next (English/Arabic), Supabase (Postgres, Auth, Storage, Edge Functions),
`vite-plugin-pwa` (service worker + manifest), Vercel (hosting).

## Folder map

```
src/
  main.tsx            Entry point: i18n, router, service-worker registration
  App.tsx             ALL routes live here + the context providers
  config.ts           Currency, store phone/WhatsApp/Facebook/address
  index.css           Tailwind import, theme colors, global CSS variables
  sw.ts               Service worker: precache, push events, notification click
  i18n/index.ts       ALL UI text, English + Arabic, in one file
  types/database.ts   Hand-written TypeScript types mirroring the DB tables
  pages/
    public/           Storefront screens (Catalog, Deals, Cart, Product, ...)
    admin/            LoginPage (shared by both roles), AdminProductsPage,
                      AdminCategoriesPage, AdminFinancePage, AdminStaffPage
    cashier/          CashierSellPage, CashierReceivePage, CashierInvoicesPage
  components/         Reusable UI (ProductCard, HeroBanner, BottomNavBar, ...)
    admin/            Admin-only UI (forms, image crop, ad generator, layout,
                      PaymentsChart)
    cashier/          CashierLayout, InvoiceBuilder (sale + receive), InvoiceList
  context/            React contexts: Auth, Cart, Favorites, ConfirmDialog
  hooks/              usePushNotifications, usePwaInstall, useAdminManifest,
                      useDocumentDirection, useScrollDirection
  lib/                Non-UI logic. Every Supabase query lives here.
supabase/
  migrations/         0001…0010 SQL files = the database schema, in order
  seed.sql            Sample data for development only
  functions/notify-new-deal/   Edge Function that sends push notifications
  functions/manage-cashiers/   Edge Function: admin creates/removes cashier logins
public/               Static files: logo, PWA icons (pwa/), admin manifest
marketing/            Ad images/HTML for social media (not part of the app)
vite.config.ts        Build config + PWA manifest (name, colors, icons)
vercel.json           Rewrites every URL to index.html (SPA routing)
```

## Routes (defined in [src/App.tsx](./src/App.tsx))

| URL | Page | Notes |
|---|---|---|
| `/` | CatalogPage | Home: banner, deals, best sellers, categories, search |
| `/category/:categoryId` | CatalogPage | Same page, filtered |
| `/categories` | CategoriesPage | All categories |
| `/deals` | DealsPage | Limited-time deals |
| `/wholesale-deals` | WholesaleDealsPage | Quantity-tier deals |
| `/product/:productId` | ProductDetailPage | |
| `/cart`, `/orders` | CartPage, OrderHistoryPage | |
| `/favorites`, `/notifications` | FavoritesPage, NotificationsPage | |
| `/admin/login` | LoginPage | |
| `/admin/products`, `/admin/categories`, `/admin/finance`, `/admin/staff` | Admin pages | `ProtectedRoute` (admin only) |
| `/cashier/sell`, `/cashier/receive`, `/cashier/invoices` | Cashier desk | `ProtectedRoute` (admin or cashier) |

Public pages share `PublicLayout` (header, footer, bottom nav, contact widget).
Admin pages share `AdminLayout`.

## Data model

Full column listing is in [SPEC.md](./SPEC.md#data-model-postgres--supabase).
Summary of tables (all created by [supabase/migrations/](./supabase/migrations/)):

| Table | Purpose | Who can write |
|---|---|---|
| `profiles` | Marks which auth users are staff (`role='admin'` or `'cashier'`) | nobody via the app |
| `categories` | Two-level tree via `parent_id`; has `image_path` | admin |
| `products` | Bilingual name/description, price, unit, size, `in_stock`, `stock_quantity`, `allow_fraction`, `is_active` (soft hide) | admin directly; stock also via invoices |
| `product_costs` | Cost price per product (admin-only read — `products` is public) | admin; purchases update it |
| `invoices` + `invoice_lines` | Sales and goods-received documents; every stock change goes through them | only via `record_invoice()` / `void_invoice()` |
| `limited_time_discounts` | One per product: `new_price`, start, `duration_days`, generated `ends_at` | admin |
| `quantity_discounts` + `quantity_discount_tiers` | "Buy N+ for price X" wholesale tiers | admin |
| `push_subscriptions` | One row per device that enabled deal notifications | anyone (anonymous) |
| `order_line_items` | What was ordered via WhatsApp; used only for best sellers | anyone can insert, nobody can read raw rows |

Public can read active products/categories/discounts. Admin check in SQL is the
`is_admin()` function (see `0001_init.sql`).

The function `best_selling_products(days_back, result_limit)` (migration 0007)
aggregates orders server-side so raw orders are never exposed.

**Keep in sync:** `src/types/database.ts` is written by hand. When you change a
migration/table, update that file too.

## Key flows

**Browsing:** page → function in `src/lib/products.ts` / `categories.ts` /
`discounts.ts` → `supabase.from(...).select(...)` → RLS returns only public rows.

**Language / RTL:** `i18n/index.ts` holds all strings; `useDocumentDirection`
sets `<html lang dir>`; Tailwind logical classes (`ms-`, `pe-`, `start-`) flip
automatically. Product/category text comes from `name_en` / `name_ar` columns,
picked by `localizedField()` in `lib/localize.ts`. Prices go through
`formatPrice()` using `CURRENCY_CODE` from `config.ts`.

**Staff login:** `LoginPage` → Supabase Auth → `AuthContext` calls
`getCurrentUserRole()` (`lib/auth.ts`) → `ProtectedRoute` allows `/admin/*`
for admins and `/cashier/*` for cashiers and admins; login redirects each
role to its own area. `StaffSessionPrompt` (public layout) asks a signed-in
staff member whether to go to their area — same dialog for both roles.

**Several accounts per device:** `lib/accounts.ts` keeps the signed-in staff
accounts' session tokens in `localStorage` (`hamada_accounts`) and swaps the
Supabase session on switch; `AdminMenu` is the UI (switch / add / remove /
sign out / sign out of all). `AuthContext` re-derives the role from every
auth event (newest lookup wins), so other tabs follow a switch on their own.

**Printing:** `lib/receipt.ts` builds a standalone receipt HTML page and
prints it from a hidden iframe (`PrintInvoiceButton`); paper size is 80/58 mm
or A4.

**Cashier accounts:** `AdminStaffPage` → `lib/staff.ts` →
`supabase.functions.invoke("manage-cashiers")`. The function is the one place
that uses the service-role key: it checks the caller with `is_admin()`,
creates/updates/deletes the auth user and its `profiles` row, and refuses to
touch any account that isn't a cashier.

**Selling / receiving stock:** `InvoiceBuilder` → `recordInvoice()`
(`lib/invoices.ts`) → Postgres function `record_invoice` locks the product
rows, checks stock and the fraction rule, sets the sale price itself, moves
`stock_quantity`, writes the invoice. A trigger keeps `in_stock` in sync
with the quantity. Admin reports: `lib/finance.ts` → `payments_by_period`
and `stock_valuation` (admin-only RPCs); `AdminFinancePage` polls them.

**Product images:** admin picks/captures photo → `ImageCropModal` →
`lib/imageUpload.ts` resizes to ~1000px → uploaded to the public
`product-images` bucket → only the *path* is stored in `image_path` →
`productImageUrl()` in `lib/supabase.ts` builds the public URL.

**Ordering via WhatsApp:** `CartPage` builds a message → opens `wa.me` link with
the number from `config.ts` → `confirmAfterReturn.ts` waits for the user to come
back to the tab and asks "did you send it?" → if yes, `lib/bestSellers.ts`
inserts `order_line_items` and `orderHistory.ts` saves it locally.

**Social ads:** `lib/adImage.ts` draws Arabic ad images on a `<canvas>` in the
browser (opened from admin via `ProductAdModal`). No server involved.

**PWA:** `vite.config.ts` defines the manifest; `src/sw.ts` is our own service
worker (precache + push). `main.tsx` registers it and auto-updates. The admin
area installs as a *separate* app via `hooks/useAdminManifest.ts` +
`public/admin-manifest.webmanifest`.

**Push notifications (new deal alerts):**

```
Admin creates a limited_time_discounts row
  → Postgres trigger notify_new_deal() (migration 0005)
  → net.http_post to the Edge Function (secret read from Supabase Vault)
  → function loads all push_subscriptions, sends a Web Push to each
    (text in each subscriber's saved language), deletes dead subscriptions
  → device's sw.ts 'push' handler shows the notification + logs it in
    IndexedDB (lib/notificationLog.ts) for the Notifications page
```

Device side: `hooks/usePushNotifications.ts` asks permission, subscribes using
`VITE_VAPID_PUBLIC_KEY`, saves via `lib/pushSubscriptions.ts`.

Current limitation: it **broadcasts to every subscriber**. Per-favorite
filtering is not built (favorites exist only in each device's localStorage).

## Environment variables

| Variable | Where | Meaning |
|---|---|---|
| `VITE_SUPABASE_URL` | `.env.local` + Vercel | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | `.env.local` + Vercel | Public anon key (safe in browser) |
| `VITE_VAPID_PUBLIC_KEY` | `.env.local` + Vercel | Web-push public key |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Edge Function secrets | Push signing keys (private key never in the repo/browser). `VAPID_SUBJECT` is a `mailto:` address |
| `FUNCTION_SECRET` | Edge Function secrets **and** Supabase Vault (`notify_new_deal_function_secret`) | Must be identical in both |

`VITE_*` values are baked in at build time — after changing them in Vercel you
must redeploy.

## Things that surprise people

- The Edge Function is shown as `notify-new-deal` in the Supabase dashboard but
  its real URL slug is `hyper-worker`; migration 0005 hardcodes that URL. If the
  function is ever recreated, copy its real URL and update the trigger.
- Supabase project ref is hardcoded in migration 0005 (`tyktbinxffpqcbbhvggd`).
- RLS on `push_subscriptions` deliberately has a public SELECT policy —
  without it, subscribe/unsubscribe silently do nothing (Postgres needs row
  visibility to update/delete). See the comment in `0004`.
- Migrations are plain SQL run in filename order. There's no migration tool
  tracking what has been applied — you apply new files by hand (see HOWTO).
- The mobile bottom nav's cart notch is a carefully tuned `clip-path`
  ([BottomNavBar.tsx](./src/components/BottomNavBar.tsx)). Don't tweak casually;
  git history has a known-good commit (`4753462`).
