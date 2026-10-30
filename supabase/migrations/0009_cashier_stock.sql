-- Cashier role, stock tracking, invoices and finance reports.
-- See SPEC.md decision log (cashier / stock) for the rationale.

-- ---------------------------------------------------------------------------
-- Roles: profiles.role is free text; 'admin' and 'cashier' are the two used.
-- ---------------------------------------------------------------------------
alter table public.profiles add column display_name text;

create or replace function public.is_cashier()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'cashier'
  );
$$;

-- Admin or cashier — anyone allowed to ring up sales / receive stock.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'cashier')
  );
$$;

grant execute on function public.is_cashier() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Stock on products. numeric (not int) so fractional quantities work;
-- `allow_fraction` is the per-product admin switch (milk yes, eggs no).
-- ---------------------------------------------------------------------------
alter table public.products
  add column stock_quantity numeric(12,3) not null default 0 check (stock_quantity >= 0),
  add column allow_fraction boolean not null default false;

-- Sensible starting point for existing products; admin can change each one.
update public.products set allow_fraction = true where unit in ('kg', 'liter');

-- Whenever the stock number changes, keep the customer-facing in_stock flag
-- in sync with it. Only fires on an actual change, so existing products
-- (stock 0 until first counted) keep their manual in_stock until then.
create or replace function public.sync_in_stock()
returns trigger
language plpgsql
as $$
begin
  new.in_stock := new.stock_quantity > 0;
  return new;
end;
$$;

create trigger products_sync_in_stock
  before update of stock_quantity on public.products
  for each row
  when (old.stock_quantity is distinct from new.stock_quantity)
  execute function public.sync_in_stock();

-- Cost price lives in its own admin-only table: `products` is publicly
-- readable (RLS is per row, not per column), and a store's cost price
-- must not be visible to customers.
create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(10,2) not null check (cost_price >= 0),
  updated_at timestamptz not null default now()
);

alter table public.product_costs enable row level security;

create policy "product_costs_admin_all"
  on public.product_costs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Invoices: 'sale' (customer purchase, stock goes down, money in) and
-- 'purchase' (goods received from a supplier, stock goes up, money out).
-- Created only through record_invoice() below, never by direct insert.
-- ---------------------------------------------------------------------------
create table public.invoices (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null check (kind in ('sale', 'purchase')),
  total         numeric(12,2) not null default 0 check (total >= 0),
  note          text,
  created_by    uuid references public.profiles(id) on delete set null,
  -- Snapshot, so history still reads right if the profile is removed.
  cashier_name  text,
  created_at    timestamptz not null default now(),
  -- Set by void_invoice() (admin only). A voided invoice stays on record
  -- but no longer counts toward payments.
  voided_at     timestamptz,
  voided_by     uuid references public.profiles(id) on delete set null
);

create index invoices_created_at_idx on public.invoices(created_at);
create index invoices_created_by_idx on public.invoices(created_by);

create table public.invoice_lines (
  id            uuid primary key default gen_random_uuid(),
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  -- Nullable + name snapshot: deleting a product must not erase history.
  product_id    uuid references public.products(id) on delete set null,
  product_name  text not null,
  quantity      numeric(12,3) not null check (quantity > 0),
  -- Selling price for a sale, unit cost for a purchase.
  unit_price    numeric(10,2) not null check (unit_price >= 0)
);

create index invoice_lines_invoice_id_idx on public.invoice_lines(invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

-- Admin sees everything; a cashier sees only their own invoices. No insert/
-- update/delete policies on purpose: writes go through record_invoice().
create policy "invoices_select"
  on public.invoices for select
  to authenticated
  using (public.is_admin() or created_by = auth.uid());

create policy "invoice_lines_select"
  on public.invoice_lines for select
  to authenticated
  using (exists (select 1 from public.invoices i where i.id = invoice_id));

-- ---------------------------------------------------------------------------
-- record_invoice: one atomic step that creates the invoice + lines and moves
-- stock. Row locks (for update) make concurrent cashiers safe.
--
-- The server owns the selling price: for a sale, each line's price is the
-- lowest currently valid one (regular price, active limited-time discount,
-- best quantity tier) computed here — any unit_price the client sends for a
-- sale is ignored, so a cashier can't ring up an arbitrary price. For a
-- purchase, unit_price is the supplier's unit cost and is required.
--
-- Returns {id, total}. Errors (message prefix is parsed by the frontend):
--   not_authorized, invalid_kind, empty_invoice, invalid_line,
--   product_not_found:<id>, fraction_not_allowed:<id>, insufficient_stock:<id>
-- ---------------------------------------------------------------------------
create or replace function public.record_invoice(p_kind text, p_lines jsonb, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice_id uuid;
  v_line       jsonb;
  v_product    public.products%rowtype;
  v_qty        numeric;
  v_price      numeric;
  v_total      numeric := 0;
  v_name       text;
begin
  if not public.is_staff() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_kind not in ('sale', 'purchase') then
    raise exception 'invalid_kind';
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'empty_invoice';
  end if;

  select coalesce(
    (select display_name from public.profiles where id = auth.uid()),
    (select email from auth.users where id = auth.uid())
  ) into v_name;

  insert into public.invoices (kind, note, created_by, cashier_name)
  values (p_kind, nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name)
  returning id into v_invoice_id;

  for v_line in select * from jsonb_array_elements(p_lines) loop
    v_qty := (v_line->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then
      raise exception 'invalid_line';
    end if;

    select * into v_product
    from public.products
    where id = (v_line->>'product_id')::uuid
    for update;
    if not found then
      raise exception 'product_not_found:%', v_line->>'product_id';
    end if;

    if not v_product.allow_fraction and v_qty <> trunc(v_qty) then
      raise exception 'fraction_not_allowed:%', v_product.id;
    end if;

    if p_kind = 'sale' then
      if v_product.stock_quantity < v_qty then
        raise exception 'insufficient_stock:%', v_product.id;
      end if;

      v_price := least(
        v_product.price,
        coalesce((select d.new_price from public.limited_time_discounts d
                  where d.product_id = v_product.id and d.ends_at > now()), v_product.price),
        coalesce((select min(t.price)
                  from public.quantity_discounts q
                  join public.quantity_discount_tiers t on t.quantity_discount_id = q.id
                  where q.product_id = v_product.id and t.min_quantity <= v_qty), v_product.price)
      );
      update public.products set stock_quantity = stock_quantity - v_qty where id = v_product.id;
    else
      v_price := (v_line->>'unit_price')::numeric;
      if v_price is null or v_price < 0 then
        raise exception 'invalid_line';
      end if;
      update public.products set stock_quantity = stock_quantity + v_qty where id = v_product.id;
      -- Latest purchase cost becomes the product's current cost price.
      insert into public.product_costs (product_id, cost_price)
      values (v_product.id, v_price)
      on conflict (product_id) do update set cost_price = excluded.cost_price, updated_at = now();
    end if;

    insert into public.invoice_lines (invoice_id, product_id, product_name, quantity, unit_price)
    values (v_invoice_id, v_product.id, v_product.name_en, v_qty, v_price);

    v_total := v_total + round(v_qty * v_price, 2);
  end loop;

  update public.invoices set total = v_total where id = v_invoice_id;
  return jsonb_build_object('id', v_invoice_id, 'total', v_total);
end;
$$;

grant execute on function public.record_invoice(text, jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- void_invoice: admin-only undo for a mistaken invoice (cashiers can't —
-- same "manager approval" split real POS systems use for voids/refunds).
-- Puts the stock back (sale) or takes it out again (purchase); a purchase
-- void fails with insufficient_stock:<id> if that stock was already sold.
-- A purchase's cost price is not rolled back.
-- ---------------------------------------------------------------------------
create or replace function public.void_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices%rowtype;
  v_line    public.invoice_lines%rowtype;
  v_stock   numeric;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_invoice from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v_invoice.voided_at is not null then
    raise exception 'already_voided';
  end if;

  for v_line in select * from public.invoice_lines where invoice_id = p_invoice_id loop
    -- Lines of since-deleted products have nothing left to restock.
    continue when v_line.product_id is null;

    select stock_quantity into v_stock from public.products where id = v_line.product_id for update;
    if v_invoice.kind = 'purchase' then
      if v_stock < v_line.quantity then
        raise exception 'insufficient_stock:%', v_line.product_id;
      end if;
      update public.products set stock_quantity = stock_quantity - v_line.quantity where id = v_line.product_id;
    else
      update public.products set stock_quantity = stock_quantity + v_line.quantity where id = v_line.product_id;
    end if;
  end loop;

  update public.invoices set voided_at = now(), voided_by = auth.uid() where id = p_invoice_id;
end;
$$;

grant execute on function public.void_invoice(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Finance reports (admin only). Buckets are in the store's own time zone.
-- ---------------------------------------------------------------------------

-- Money in (sales) / out (purchases) for the last `p_buckets` days, weeks
-- (Monday start) or months, oldest first, empty periods included as zeros.
create or replace function public.payments_by_period(p_granularity text, p_buckets int default 12)
returns table(bucket date, payments_in numeric, payments_out numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tz   constant text := 'Africa/Cairo';
  v_unit interval;
  v_now  timestamp := date_trunc(
    case p_granularity when 'day' then 'day' when 'week' then 'week' when 'month' then 'month' end,
    now() at time zone 'Africa/Cairo'
  );
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_granularity not in ('day', 'week', 'month') then
    raise exception 'invalid_granularity';
  end if;
  v_unit := ('1 ' || p_granularity)::interval;

  return query
  with series as (
    select generate_series(v_now - (greatest(p_buckets, 1) - 1) * v_unit, v_now, v_unit) as b
  ),
  sums as (
    select date_trunc(p_granularity, i.created_at at time zone v_tz) as b,
           sum(i.total) filter (where i.kind = 'sale') as s,
           sum(i.total) filter (where i.kind = 'purchase') as p
    from public.invoices i
    where i.voided_at is null
      and i.created_at at time zone v_tz >= (select min(b) from series)
    group by 1
  )
  select series.b::date, coalesce(sums.s, 0), coalesce(sums.p, 0)
  from series left join sums on sums.b = series.b
  order by series.b;
end;
$$;

grant execute on function public.payments_by_period(text, int) to authenticated;

-- Live value of what's on the shelves: at cost (where a cost is known) and
-- at current selling price.
create or replace function public.stock_valuation()
returns table(cost_value numeric, retail_value numeric, products_in_stock bigint, products_missing_cost bigint)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select coalesce(sum(p.stock_quantity * c.cost_price), 0),
         coalesce(sum(p.stock_quantity * p.price), 0),
         count(*) filter (where p.stock_quantity > 0),
         count(*) filter (where p.stock_quantity > 0 and c.product_id is null)
  from public.products p
  left join public.product_costs c on c.product_id = p.id;
end;
$$;

grant execute on function public.stock_valuation() to authenticated;

-- ---------------------------------------------------------------------------
-- Fractional order quantities (a customer can now order 0.5 kg). The
-- best-sellers function's return type changes with it, so it's recreated.
-- ---------------------------------------------------------------------------
alter table public.order_line_items alter column quantity type numeric(12,3);

drop function public.best_selling_products(int, int);

create function public.best_selling_products(days_back int default 30, result_limit int default 8)
returns table(product_id uuid, total_quantity numeric)
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
