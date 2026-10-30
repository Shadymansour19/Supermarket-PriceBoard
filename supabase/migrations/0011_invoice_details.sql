-- Optional customer / supplier details on invoices (name, phone, address, a
-- reference such as the supplier's invoice number, and how it was paid).
-- For a sale these describe the customer; for a purchase, the supplier.
-- All optional — a cashier ringing up a walk-in customer fills in nothing.
alter table public.invoices
  add column party_name     text,
  add column party_phone    text,
  add column party_address  text,
  add column reference      text,
  add column payment_method text check (payment_method in ('cash', 'card', 'wallet', 'credit'));

-- record_invoice gains a 4th argument. Postgres treats a different argument
-- list as a different function, and keeping both would make named-argument
-- calls ambiguous, so the old one goes first.
drop function public.record_invoice(text, jsonb, text);

create function public.record_invoice(p_kind text, p_lines jsonb, p_note text default null, p_details jsonb default null)
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
  v_method     text := nullif(trim(coalesce(p_details->>'payment_method', '')), '');
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

  if v_method is not null and v_method not in ('cash', 'card', 'wallet', 'credit') then
    raise exception 'invalid_details';
  end if;

  -- Optional customer / supplier details: trimmed, blank means "not given",
  -- and length-capped so a stray paste can't bloat a row.
  insert into public.invoices (kind, note, created_by, cashier_name,
                               party_name, party_phone, party_address, reference, payment_method)
  values (p_kind, nullif(trim(coalesce(p_note, '')), ''), auth.uid(), v_name,
          left(nullif(trim(coalesce(p_details->>'party_name', '')), ''), 120),
          left(nullif(trim(coalesce(p_details->>'party_phone', '')), ''), 40),
          left(nullif(trim(coalesce(p_details->>'party_address', '')), ''), 250),
          left(nullif(trim(coalesce(p_details->>'reference', '')), ''), 80),
          v_method)
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

grant execute on function public.record_invoice(text, jsonb, text, jsonb) to authenticated;
