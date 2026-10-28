-- Additional photos for a product, beyond its existing `image_path` cover
-- image on `products` (left untouched — still the card/thumbnail photo
-- everywhere). This table only holds the *extra* images: product detail
-- page gallery, and the card hover/touch "second image" swap.
create table public.product_images (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index product_images_product_id_sort_idx on public.product_images(product_id, sort_order);

alter table public.product_images enable row level security;

create policy "product_images_public_read"
  on public.product_images for select
  to anon, authenticated
  using (true);

create policy "product_images_admin_write"
  on public.product_images for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
