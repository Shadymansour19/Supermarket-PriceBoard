# Bakala — Plan

See [SPEC.md](./SPEC.md) for the data model, decisions, and non-goals.
Phases are meant to each leave the app in a working, demoable state.

## Phase 0 — Project setup
- [x] Init git repo, `.gitignore`, README stub
- [x] Vite + React + TypeScript scaffold
- [x] Tailwind configured, RTL smoke-tested (`dir="rtl"` + logical
      properties render correctly)
- [x] Supabase project created; env vars wired (`.env.example` committed,
      `.env.local` gitignored) — anon key still a placeholder pending the
      real value from Settings → API
- [x] Base folder structure (routes, components, lib/supabase client)

## Phase 1 — Data layer
- [x] SQL migration: `profiles`, `categories`, `products` tables
- [x] RLS policies: public read (active rows), admin-only write
- [x] `product-images` storage bucket + matching policies
- [x] Seed script with sample categories/subcategories + a handful of
      products (bilingual names) for local dev — applied to the dev DB
- [ ] Manually provision first admin user + `profiles` row

## Phase 2 — Public browsing
- [x] Category/subcategory navigation
- [x] Product grid + detail view (name, price, image, availability)
- [x] Search by name (EN/AR)
- [x] Language toggle (EN/AR) with RTL layout switch, persisted locally
- [x] Loading/empty/error states

## Phase 3 — Admin
- [x] Admin login (Supabase Auth), route protection
- [x] Category CRUD (reparenting via the form; manual drag-drop reordering
      of `sort_order` not built — edit the value directly if needed for now)
- [x] Product CRUD: create/edit/delete, toggle in-stock and active
- [x] Image upload with client-side resize/compress before hitting Storage

## Phase 4 — Polish & ship
- [ ] Responsive pass (mobile-first, it's a shopping-adjacent app)
- [ ] Basic accessibility check (contrast, focus states, alt text on
      product images)
- [ ] Deploy to Vercel/Netlify, auto-deploy from GitHub on push
- [ ] README: setup, env vars, how to provision an admin

## Backlog (not scheduled)
- Accounts + favorites for normal users
- Price history / trend view
- Multi-currency, multi-store
- Cart / checkout
