# Bakala

A single-store bilingual (EN/AR) product catalog. Admins manage products and
categories; the public browses read-only, with navigation by category/
subcategory and search. See [SPEC.md](./SPEC.md) for the data model and
decisions, [PLAN.md](./PLAN.md) for the phased build plan.

## Stack

React + Vite + TypeScript + Tailwind (RTL-aware) on the frontend, Supabase
(Postgres + Auth + Storage) on the backend.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev
```

Get the URL and anon key from your Supabase project's
**Settings → API**. `.env.local` is gitignored — never commit real keys.

## Database

Schema and RLS policies live in [supabase/migrations/0001_init.sql](./supabase/migrations/0001_init.sql).
Apply it to a fresh Supabase project with `psql` (or the Supabase CLI):

```bash
psql "<connection string from Settings → Database>" -f supabase/migrations/0001_init.sql
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

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run oxlint
