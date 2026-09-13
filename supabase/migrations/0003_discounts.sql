-- Two discount types (see SPEC.md decision log):
--   * limited_time_discounts — one row per product, a temporary lower price
--     that expires on its own after `duration_days`.
--   * quantity_discounts + quantity_discount_tiers — one row per product
--     plus a list of "buy N+ for this price" tiers.
-- Neither type keeps history (matches the "no price history" decision for
-- `products.price`) — disabling a discount deletes its row rather than
-- soft-hiding it, and re-enabling starts a fresh one.

-- ---------------------------------------------------------------------------
-- limited_time_discounts
-- ---------------------------------------------------------------------------
create table public.limited_time_discounts (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null unique references public.products(id) on delete cascade,
  new_price      numeric(10,2) not null check (new_price >= 0),
  starts_at      timestamptz not null default now(),
  duration_days  int not null check (duration_days > 0),
  -- Kept in sync by the trigger below rather than a generated column:
  -- timestamptz + interval isn't IMMUTABLE (it's timezone-sensitive), which
  -- Postgres requires for generated columns. Maintaining it in a BEFORE
  -- trigger instead means "is it still active" stays a simple
  -- `ends_at > now()` comparison everywhere else.
  ends_at        timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles(id) on delete set null
);

create index limited_time_discounts_ends_at_idx on public.limited_time_discounts(ends_at);

create or replace function public.set_limited_time_discount_ends_at()
returns trigger
language plpgsql
as $$
begin
  new.ends_at := new.starts_at + (new.duration_days || ' days')::interval;
  return new;
end;
$$;

create trigger limited_time_discounts_set_ends_at
  before insert or update on public.limited_time_discounts
  for each row
  execute function public.set_limited_time_discount_ends_at();

alter table public.limited_time_discounts enable row level security;

create policy "limited_time_discounts_public_read"
  on public.limited_time_discounts for select
  to anon, authenticated
  using (true);

create policy "limited_time_discounts_admin_write"
  on public.limited_time_discounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create trigger limited_time_discounts_set_updated_at
  before update on public.limited_time_discounts
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quantity_discounts + tiers
-- ---------------------------------------------------------------------------
create table public.quantity_discounts (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null unique references public.products(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.quantity_discounts enable row level security;

create policy "quantity_discounts_public_read"
  on public.quantity_discounts for select
  to anon, authenticated
  using (true);

create policy "quantity_discounts_admin_write"
  on public.quantity_discounts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create trigger quantity_discounts_set_updated_at
  before update on public.quantity_discounts
  for each row
  execute function public.set_updated_at();

create table public.quantity_discount_tiers (
  id                    uuid primary key default gen_random_uuid(),
  quantity_discount_id  uuid not null references public.quantity_discounts(id) on delete cascade,
  -- Tiers start at 2+: quantity 1 is just the product's regular price.
  min_quantity          int not null check (min_quantity >= 2),
  price                 numeric(10,2) not null check (price >= 0),
  unique (quantity_discount_id, min_quantity)
);

create index quantity_discount_tiers_discount_id_idx
  on public.quantity_discount_tiers(quantity_discount_id);

alter table public.quantity_discount_tiers enable row level security;

create policy "quantity_discount_tiers_public_read"
  on public.quantity_discount_tiers for select
  to anon, authenticated
  using (true);

create policy "quantity_discount_tiers_admin_write"
  on public.quantity_discount_tiers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
