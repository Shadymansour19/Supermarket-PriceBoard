# Bakala — Spec

Working name: **Bakala** (Arabic for grocery/corner store). Open to renaming
once scope is clearer — no code or infra depends on the name yet.

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

- **2026-08-31 — Currency confirmed: EGP.** Was an unconfirmed assumption
  (see the "single currency, app-wide" entry below) — now set via
  `CURRENCY_CODE` in `src/config.ts`, and `formatPrice` uses
  `Intl.NumberFormat(locale, { style: "currency", currency: CURRENCY_CODE })`
  so the symbol/placement follow each locale's own convention instead of
  being hand-formatted.
- **2026-08-31 — `unit: 'each'` means the price is for the whole item;
  measured units (`kg`/`g`/`liter`/`ml`) mean it's actually priced per that
  measure.** Fixes a real bug caught by the user: bottled/packaged
  products (Mineral Water 1.5L, Whole Milk 1L, Orange Juice 1L) were
  seeded with `unit: 'liter'`, which read as "0.60 per liter" next to a
  1.5L size — ambiguous about what the shown price actually buys. They're
  priced as a whole bottle, not by volume, so they're `unit: 'each'` with
  `size` as pure packaging info. The "/ unit" suffix is now hidden for
  `each` (see `shouldShowUnit` in `src/lib/localize.ts`) since it added
  noise, not information, once the ambiguity was gone. Only genuinely
  bulk-priced goods (loose produce, by weight) should use a measured unit.
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
