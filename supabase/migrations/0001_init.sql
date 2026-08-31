-- Bakala — initial schema
-- profiles / categories / products, RLS policies, storage bucket.
-- See SPEC.md for the data model rationale.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- profiles: one row per admin (auth.users mirror). No self-serve sign-up —
-- rows are inserted manually (dashboard/SQL) after creating the auth user.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- A logged-in admin can read their own row (used by the frontend to confirm
-- admin status after login). No insert/update/delete policy is defined, so
-- profiles can only be changed via the dashboard/service role — by design.
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- security definer so policies on other tables can check admin status
-- without depending on the caller being able to read the profiles row
-- (belt-and-suspenders; the select-own policy above would also allow it).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- categories: two levels via self-reference (parent_id null = top-level).
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid references public.categories(id) on delete set null,
  name_en    text not null,
  name_ar    text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index categories_parent_id_idx on public.categories(parent_id);

alter table public.categories enable row level security;

create policy "categories_public_read"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "categories_admin_write"
  on public.categories for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table public.products (
  id              uuid primary key default gen_random_uuid(),
  category_id     uuid not null references public.categories(id) on delete restrict,
  name_en         text not null,
  name_ar         text not null,
  description_en  text,
  description_ar  text,
  price           numeric(10,2) not null check (price >= 0),
  image_path      text,
  in_stock        boolean not null default true,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles(id) on delete set null
);

create index products_category_id_idx on public.products(category_id);
create index products_is_active_idx on public.products(is_active);

alter table public.products enable row level security;

create policy "products_public_read_active"
  on public.products for select
  to anon, authenticated
  using (is_active = true);

create policy "products_admin_full_access"
  on public.products for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- storage: public-read bucket for product images, admin-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "product_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

create policy "product_images_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

create policy "product_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
