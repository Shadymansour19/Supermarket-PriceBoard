# Super Market Hamada — Spec

Renamed from the working name "Bakala" to **Super Market Hamada** (سوبر
ماركت حماده), matching the real store's Facebook page.

## Overview

A single-store product catalog with two sides:

- **Admin** (small fixed team, same permissions): add/edit/remove products —
  name, category, price, image, availability.
- **Public**: browse/view the catalog read-only, navigate by
  category → subcategory, search by name. No accounts required.

No cart, no checkout — this is a browsing/pricing reference, not a
storefront (see Non-goals for why, and what might change that later).

UI is bilingual (English + Arabic) with full RTL support, not just a
translated string table bolted onto an LTR layout.

## Decision log

Decisions are dated and kept even after superseded, so the reasoning stays
visible. Newest first.

- **2026-09-13 — Two discount types: limited-time and quantity-based, no
  history kept.** `limited_time_discounts` (one row per product, storing
  `new_price` and `duration_days`, with `ends_at` a DB-generated column so
  "still active" is just `ends_at > now()`) and `quantity_discounts` plus
  `quantity_discount_tiers` (one row per product, plus a list of "buy N+ for
  this price" tiers). Like `products.price`, neither type keeps a history —
  disabling a discount deletes its row, and re-enabling one restarts it from
  scratch, rather than soft-hiding/versioning it. Display is shared across
  both types: original price struck through in red, the new price beside
  it, and a savings percentage (`DiscountPrice` component). Only
  limited-time discounts appear on the product card and the new home-page
  "Limited-time deals" horizontally-scrolling section (with a "Show more"
  link to `/deals`, the full list) — quantity tiers don't fit a compact card
  and only show on the product detail page, as a small table. Admin manages
  both from a "Discounts" action per product row (`ProductDiscountsModal`),
  independent of the product create/edit form since a discount can only be
  attached to a product that already exists.
- **2026-09-13 — Contact Us moved from a `/contact` page to a floating
  button + dialog.** `ContactWidget` (rendered once in `PublicLayout`, so
  it floats over every public page) replaces the header nav link and the
  standalone `ContactPage`/`/contact` route: a fixed round button in the
  reading-direction-aware corner (chat-bubble icon) pops open a modal with
  the same WhatsApp/Facebook/phone/location content, closable via its ✕,
  Escape, or a backdrop click. Content and data source (`CONTACT` in
  `src/config.ts`) are unchanged.

- **2026-09-11 — Renamed to Super Market Hamada; added a Contact Us page.**
  Working name "Bakala" replaced everywhere user-facing (app name, page
  title, docs) with the real store's name and branding, taken from its
  Facebook page. Added contact info (WhatsApp click-to-chat, a Facebook
  link, both phone numbers as `tel:` links, the store's address, and a
  Google Maps directions link) sourced from `src/config.ts`'s new `CONTACT`
  object so they're one place to update — since superseded by the floating
  widget above, but the data model stands. The store's real logo
  (`public/logo.jpg`, from its signboard photo) replaces the placeholder
  favicon and appears in the header and the contact dialog.

- **2026-08-31 — Admin product images: crop, remove, and the admin category
  tree are collapsible too.** Added `react-easy-crop`: picking a file opens
  a square (1:1) crop/zoom modal before it's staged as the upload — every
  product image slot in the app is a square, so locking the aspect here
  avoids a surprise `object-cover` recrop at display time. "Remove image"
  clears an existing photo outright (not just a pending selection); both
  replacing and removing best-effort delete the old Storage file so
  swapped-out photos don't pile up. Deleting a product now also cleans up
  its image. The admin categories list reuses the same `Chevron` expand/
  collapse pattern as the public nav.
- **2026-08-31 — Currency confirmed: EGP.** Was an unconfirmed assumption
  (see the "single currency, app-wide" entry below) — now set via
  `CURRENCY_CODE` in `src/config.ts`, and `formatPrice` uses
  `Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY_CODE })`
  so the symbol/placement follow each locale's own convention instead of
  being hand-formatted.
- **2026-08-31 — Whole packaged goods use `unit: 'pack'`, not `'each'` or a
  measured unit.** Fixes a real bug caught by the user: bottled/packaged
  products (Mineral Water 1.5L, Whole Milk 1L, Orange Juice 1L, Halloumi
  Cheese 250g) were seeded with `unit: 'liter'`/`'g'`-style measured units,
  which read as "0.60 per liter" right next to a 1.5L size — ambiguous
  about what the shown price actually buys. They're priced as one whole
  bottle/carton/pack, not by volume or weight, so `unit: 'pack'` (shown as
  "pack" / "عبوة") with `size` as pure packaging info. Measured units
  (`kg`/`g`/`liter`/`ml`) are reserved for goods genuinely priced per that
  measure (loose produce, sold by weight). `unit: 'each'` still exists for
  single discrete items with no pack framing (e.g. a single loaf) and is
  the one case where the "/ unit" suffix is hidden entirely (see
  `shouldShowUnit` in `src/lib/localize.ts`) since "/ each" is noise, not
  information — every other unit, `pack` included, is always shown because
  it says something the price alone doesn't.
- **2026-08-31 — Collapse/expand chevrons are direction-aware.** A single
  glyph is rotated (`Chevron` in `src/components/Chevron.tsx`) rather than
  swapping characters: collapsed points toward reading direction (right in
  LTR, left in RTL), expanded always points down. Fixes the arrow pointing
  the same way regardless of language, caught by the user in the category
  nav and mobile sidebar toggle.
- **2026-08-31 — Products get `unit` and `size` fields.** `unit` is what
  the price is per (`each`, `kg`, `g`, `liter`, `ml`, `dozen`, `pack`,
  `box`, `bag` — enforced by a DB check constraint, chosen from a
  `<select>` in the admin form) so a price is never ambiguous ("1.25 / kg"
  vs. just "1.25"). `size` is a separate optional free-text field for
  package labeling (e.g. "500g", "1L", "6-pack") for products that need
  it — distinct from `unit` because a product can be priced per kg while
  sold in a fixed-size pack. Adding a new unit later needs a migration;
  that trade-off was made for data consistency over flexibility.
- **2026-08-31 — Category nav and mobile sidebar are collapsible.**
  Categories with subcategories expand/collapse in place (auto-expanding
  the branch containing the active selection); on mobile the whole sidebar
  starts collapsed behind a toggle button to save vertical space, and is
  always visible at `md+`.
- **2026-08-31 — No price history tracking.** Products store a single
  current `price`. No history table, no per-change audit log, in the DB or
  UI, for admin or public. Chosen for simplicity over the originally
  proposed "admin manages price history" — revisit only if there's a
  concrete need (e.g. "was this cheaper last week") later.
- **2026-08-31 — Categories are hierarchical, admin-manageable.** Two
  levels: category → subcategory, modeled as one self-referencing table
  (`parent_id`). Admin can add/rename/delete at either level. Products
  belong to one (typically leaf) category.
- **2026-08-31 — Admin auth: small fixed team, equal permissions.**
  Multiple Supabase Auth users, each with a `profiles` row and
  `role = 'admin'`. RLS checks membership in that table rather than
  hardcoding user IDs, and rather than building out per-role permissions
  (admin vs editor) that aren't needed yet.
- **2026-08-31 — Public browsing needs no account; optional accounts are
  backlog, not built now.** No `users`/auth requirement for browsing or
  search. If favorites/saved-lists are wanted later, that's the trigger to
  add Supabase Auth for normal users — not needed for the current scope.
- **2026-08-31 — Single currency, app-wide.** Price is a plain numeric
  column; no per-product currency code. Currency symbol/formatting is one
  app-level setting. Was an unconfirmed assumption — currency itself is now
  confirmed as EGP, see the entry above.
- **2026-08-31 — Default language: browser locale, fallback Arabic.**
  Manual EN/AR toggle, persisted in local storage, overrides the guess.
  Assumption, not explicitly confirmed — flag if wrong.
- **2026-08-31 — Stack confirmed**: Supabase (Postgres + Auth + Storage,
  free tier) for backend; React + Vite + TypeScript + Tailwind for
  frontend; Vercel/Netlify free tier for hosting, auto-deploy from GitHub.
  No pushback needed — this is a solid, boring-in-a-good-way fit for a
  small catalog app. Tailwind ≥3.3 logical properties (`ps-`, `pe-`,
  `ms-`, `me-`, etc.) are used instead of `pl-`/`pr-` so RTL doesn't
  require a parallel set of overrides.

## Data model (Postgres / Supabase)

```
profiles
  id            uuid PK, references auth.users(id)
  role          text  -- 'admin' (only value for now; kept as text, not
                       -- enum, so adding roles later is a data change)
  created_at    timestamptz default now()

categories
  id            uuid PK default gen_random_uuid()
  parent_id     uuid FK -> categories.id, nullable  -- null = top-level
  name_en       text not null
  name_ar       text not null
  sort_order    int default 0
  created_at    timestamptz default now()

products
  id            uuid PK default gen_random_uuid()
  category_id   uuid FK -> categories.id, not null
  name_en       text not null
  name_ar       text not null
  description_en text
  description_ar text
  price         numeric(10,2) not null
  unit          text not null default 'each'  -- check: each/kg/g/liter/ml/dozen/pack/box/bag
  size          text  -- optional package label, e.g. "500g", "1L", "6-pack"
  image_path    text  -- path within the Storage bucket, not a full URL
  in_stock      boolean not null default true
  is_active     boolean not null default true  -- soft hide, not delete
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  updated_by    uuid FK -> profiles.id, nullable

limited_time_discounts       -- at most one per product
  id            uuid PK default gen_random_uuid()
  product_id    uuid FK -> products.id, unique, not null
  new_price     numeric(10,2) not null
  starts_at     timestamptz default now()
  duration_days int not null
  ends_at       timestamptz generated always as (starts_at + duration_days days)
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  updated_by    uuid FK -> profiles.id, nullable

quantity_discounts            -- at most one per product
  id            uuid PK default gen_random_uuid()
  product_id    uuid FK -> products.id, unique, not null
  created_at    timestamptz default now()
  updated_at    timestamptz default now()
  updated_by    uuid FK -> profiles.id, nullable

quantity_discount_tiers        -- "buy min_quantity+ for price"
  id                    uuid PK default gen_random_uuid()
  quantity_discount_id  uuid FK -> quantity_discounts.id, not null
  min_quantity          int not null  -- >= 2
  price                 numeric(10,2) not null
```

Storage: one public-read bucket (`product-images`). Images are resized/
compressed client-side before upload (target: long edge ~1000px, JPEG/WebP)
to stay inside free-tier storage and bandwidth.

## Auth & RLS model

- **Public (anon + authenticated)**: `SELECT` on `categories` and
  `products` where `is_active = true`. No write access.
- **Admin** (`profiles.role = 'admin'` for `auth.uid()`): full
  `INSERT`/`UPDATE`/`DELETE` on `categories` and `products`, and can see
  inactive products too (for un-hiding them).
- **Storage bucket policies** mirror the same admin check for writes;
  reads are public.
- Admin accounts are provisioned manually (Supabase dashboard / SQL), not
  via public sign-up — there's no self-serve admin registration flow.

## Non-goals (for now)

Flagging these as natural next steps rather than building them:

- Cart / checkout / ordering — this is a pricing/catalog reference, not a
  transactional storefront. Worth reconsidering if the goal shifts from
  "see what's available and what it costs" to "let people actually order."
- Accounts for normal users (favorites, saved lists, notifications on
  price/stock changes) — deferred until there's a concrete reason.
- Price history / trend charts — explicitly dropped, see decision log.
- Multi-store / multi-location — single store only.
- Multi-currency — single app-wide currency.
