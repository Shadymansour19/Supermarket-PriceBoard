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
insert into public.products (category_id, name_en, name_ar, price, in_stock)
select id, 'Banana', 'موز', 1.25, true from sub_fruit
union all
select id, 'Apple', 'تفاح', 1.75, true from sub_fruit
union all
select id, 'Tomato', 'طماطم', 0.90, true from sub_veg
union all
select id, 'Cucumber', 'خيار', 0.75, true from sub_veg
union all
select id, 'Whole Milk 1L', 'حليب كامل الدسم ١ لتر', 1.50, true from sub_milk
union all
select id, 'Halloumi Cheese 250g', 'جبنة حلوم ٢٥٠ غ', 3.90, false from sub_cheese
union all
select id, 'Mineral Water 1.5L', 'مياه معدنية ١.٥ لتر', 0.60, true from sub_water
union all
select id, 'Orange Juice 1L', 'عصير برتقال ١ لتر', 2.10, true from sub_juice;
