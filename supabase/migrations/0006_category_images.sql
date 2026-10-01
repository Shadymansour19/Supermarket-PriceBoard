-- Categories can now have their own image, same storage bucket as products
-- (product-images is already public-read / admin-write for any path, so no
-- new bucket or policies are needed — category uploads just live under a
-- "categories/" prefix within it instead of a product id).
alter table public.categories add column image_path text;
