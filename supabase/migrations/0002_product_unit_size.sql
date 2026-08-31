-- Adds pricing unit + optional package size to products.
-- unit: what the price is per (e.g. "1.25 / kg") — every product has one.
-- size: package labeling for products that need it (e.g. "500g", "1L"),
-- separate from unit since a product can be priced per kg but sold in a
-- fixed-size pack.

alter table public.products
  add column unit text not null default 'each',
  add column size text;

alter table public.products
  add constraint products_unit_check
  check (unit in ('each', 'kg', 'g', 'liter', 'ml', 'dozen', 'pack', 'box', 'bag'));
