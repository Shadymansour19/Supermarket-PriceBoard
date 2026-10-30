-- Search over ALL invoices (not just the latest few hundred): one text box
-- matching any field on an invoice or any item on it. Every word must match
-- (in any order). Runs as the caller (security invoker), so row level
-- security still applies: an admin searches everyone's invoices, a cashier
-- only their own.
--
-- Matched fields: number, kind, voided, customer/supplier name, phone (also
-- digits-only, so "0100123" finds "0100 123 4567"), address, reference,
-- payment method, note, cashier, total, date (store time zone) and every
-- item name. Words for the fixed labels are matched in English and Arabic.
-- Arabic-Indic digits are treated as ordinary digits.
create function public.search_invoices(p_query text, p_limit int default 100)
returns setof public.invoices
language sql
stable
set search_path = public
as $$
  with terms as (
    select t
    from regexp_split_to_table(
      translate(lower(coalesce(p_query, '')), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
      '\s+'
    ) as t
    where t <> ''
  )
  select i.*
  from public.invoices i
  where exists (select 1 from terms)
    and not exists (
      select 1
      from terms
      where strpos(
        translate(lower(concat_ws(' ',
          i.number,
          case i.kind when 'sale' then 'sale بيع' else 'purchase stock in وارد مخزون' end,
          case when i.voided_at is not null then 'voided ملغاة' end,
          i.party_name,
          i.party_phone,
          regexp_replace(coalesce(i.party_phone, ''), '\D', '', 'g'),
          i.party_address,
          i.reference,
          case i.payment_method
            when 'cash' then 'cash نقدا'
            when 'card' then 'card بطاقة'
            when 'wallet' then 'mobile wallet محفظة'
            when 'credit' then 'credit on credit آجل'
          end,
          i.note,
          i.cashier_name,
          i.total,
          to_char(i.created_at at time zone 'Africa/Cairo', 'YYYY-MM-DD'),
          (select string_agg(l.product_name, ' ') from public.invoice_lines l where l.invoice_id = i.id)
        )), '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
        terms.t
      ) > 0 is not true
    )
  order by i.created_at desc
  limit least(greatest(p_limit, 1), 200);
$$;

grant execute on function public.search_invoices(text, int) to authenticated;
