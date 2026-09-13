# Super Market Hamada

A single-store bilingual (EN/AR) product catalog. Admins manage products and
categories; the public browses read-only, with navigation by category/
subcategory and search. See [SPEC.md](./SPEC.md) for the data model and
decisions, [PLAN.md](./PLAN.md) for the phased build plan.

## Stack

React + Vite + TypeScript + Tailwind (RTL-aware) on the frontend, Supabase
(Postgres + Auth + Storage) on the backend. Installable as a PWA
(`vite-plugin-pwa`) — icons live in [public/pwa/](./public/pwa/), generated
from [public/logo.jpg](./public/logo.jpg); manifest and service worker config
is in [vite.config.ts](./vite.config.ts).

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Get the URL and anon key from your Supabase project's
**Settings → API**. `.env.local` is gitignored — never commit real keys.

## Database

Schema and RLS policies live in [supabase/migrations/](./supabase/migrations/),
applied in order. Apply them to a fresh Supabase project with `psql` (or the
Supabase CLI):

```bash
for f in supabase/migrations/*.sql; do
  psql "<connection string from Settings → Database>" -f "$f"
done
```

[supabase/seed.sql](./supabase/seed.sql) adds sample bilingual categories and
products — handy for local development, not meant for production data.

## Provisioning an admin

There's no self-serve admin sign-up. After creating a user (Supabase
dashboard → Authentication, or `supabase.auth.admin.createUser`), give them
admin access:

```sql
insert into public.profiles (id, role) values ('<auth-user-uuid>', 'admin');
```

They can then sign in at `/admin/login`.

## Deploying (Vercel)

1. Import the repo into Vercel (framework preset auto-detects as Vite —
   build command `npm run build`, output directory `dist`).
2. In the project's **Settings → Environment Variables**, add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as your
   `.env.local`) for the Production environment — and Preview too, if you
   want PR/branch deploys to work against the same database.
3. [vercel.json](./vercel.json) rewrites every path to `index.html` so
   client-side routes (e.g. `/admin/login`, `/product/:id`) don't 404 on a
   direct load or refresh — already committed, nothing to configure.
4. Push to the branch Vercel is watching; it builds and deploys
   automatically from there on.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run oxlint
