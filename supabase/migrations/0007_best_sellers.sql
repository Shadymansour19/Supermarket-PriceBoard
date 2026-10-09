-- Logs each line item of an order once the customer confirms they actually
-- sent it via WhatsApp (see CartPage's handleOrderViaWhatsApp /
-- confirmAfterReturn) — this is the closest thing to a real "placed order"
-- this app has, deliberately distinct from an add-to-cart action, which
-- doesn't mean the customer followed through. Used only to rank best
-- sellers; no accounts, so nothing is tied to a customer.
create table public.order_line_items (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity   int not null check (quantity > 0),
  created_at timestamptz not null default now()
);
create index order_line_items_product_id_idx on public.order_line_items(product_id);
create index order_line_items_created_at_idx on public.order_line_items(created_at);

alter table public.order_line_items enable row level security;
-- Anyone can log their own confirmed order; nobody (anon included) can
-- read, update or delete rows directly — best sellers are served only
-- through the aggregated function below, never raw order contents.
create policy "order_line_items_public_insert" on public.order_line_items
  for insert to anon, authenticated with check (true);

-- Aggregates order_line_items into a product ranking without ever exposing
-- a raw row to the client. security definer lets it read the table despite
-- anon having no select policy on it; search_path is pinned per Postgres's
-- own guidance for security definer functions.
create or replace function public.best_selling_products(days_back int default 30, result_limit int default 8)
returns table(product_id uuid, total_quantity bigint)
language sql
security definer
set search_path = public
as $$
  select product_id, sum(quantity) as total_quantity
  from public.order_line_items
  where created_at >= now() - (days_back || ' days')::interval
  group by product_id
  order by total_quantity desc
  limit result_limit;
$$;

grant execute on function public.best_selling_products(int, int) to anon, authenticated;
