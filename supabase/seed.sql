-- Sample data for development — safe to run repeatedly (guarded by name
-- checks) but intended for a fresh/dev database, not production.

with top_produce as (
  insert into public.categories (name_en, name_ar, sort_order)
  values ('Produce', 'خضروات وفواكه', 1)
  returning id
),
top_dairy as (
  insert into public.categories (name_en, name_ar, sort_order)
  values ('Dairy', 'ألبان', 2)
  returning id
),
top_beverages as (
  insert into public.categories (name_en, name_ar, sort_order)
  values ('Beverages', 'مشروبات', 3)
  returning id
),
sub_fruit as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Fruit', 'فاكهة', 1 from top_produce
  returning id
),
sub_veg as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Vegetables', 'خضروات', 2 from top_produce
  returning id
),
sub_milk as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Milk', 'حليب', 1 from top_dairy
  returning id
),
sub_cheese as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Cheese', 'جبن', 2 from top_dairy
  returning id
),
sub_water as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Water', 'مياه', 1 from top_beverages
  returning id
),
sub_juice as (
  insert into public.categories (parent_id, name_en, name_ar, sort_order)
  select id, 'Juice', 'عصير', 2 from top_beverages
  returning id
)
-- unit is the pricing unit (e.g. "1.25 / kg"); size is package labeling for
-- products that come in a fixed size, kept separate so a product can be
-- priced per kg/liter while also showing its pack size.
insert into public.products (category_id, name_en, name_ar, price, unit, size, in_stock)
select id, 'Banana', 'موز', 1.25, 'kg', null, true from sub_fruit
union all
select id, 'Apple', 'تفاح', 1.75, 'kg', null, true from sub_fruit
union all
select id, 'Tomato', 'طماطم', 0.90, 'kg', null, true from sub_veg
union all
select id, 'Cucumber', 'خيار', 0.75, 'kg', null, true from sub_veg
union all
select id, 'Whole Milk', 'حليب كامل الدسم', 1.50, 'liter', '1L', true from sub_milk
union all
select id, 'Halloumi Cheese', 'جبنة حلوم', 3.90, 'each', '250g', false from sub_cheese
union all
select id, 'Mineral Water', 'مياه معدنية', 0.60, 'liter', '1.5L', true from sub_water
union all
select id, 'Orange Juice', 'عصير برتقال', 2.10, 'liter', '1L', true from sub_juice;
