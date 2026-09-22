-- Calls the notify-new-deal Edge Function whenever a new limited-time
-- discount is created, so subscribed devices get a push notification (see
-- SPEC.md decision log). Uses pg_net directly (async HTTP from Postgres)
-- rather than Supabase's Database Webhooks dashboard feature — same
-- underlying mechanism (Database Webhooks is a thin UI over exactly this),
-- just expressed here so it's reproducible/version-controlled like the
-- rest of the schema instead of a dashboard-only config.
--
-- The shared secret the function checks is read from Supabase Vault at
-- call time, not embedded in this file. `ALTER DATABASE ... SET` for a
-- custom parameter needs superuser, which the `postgres` role doesn't
-- have on a Supabase project (tried and confirmed 2026-09-22) — Vault is
-- the mechanism Supabase provides for exactly this. The secret itself is
-- set once, outside of any migration, so its real value never lands in
-- git history:
--   select vault.create_secret('<value>', 'notify_new_deal_function_secret',
--     'Shared secret the notify-new-deal Edge Function checks against, sent by the DB trigger.');
create extension if not exists pg_net;

create or replace function public.notify_new_deal()
returns trigger
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  function_secret text;
begin
  select decrypted_secret into function_secret
  from vault.decrypted_secrets
  where name = 'notify_new_deal_function_secret';

  -- NOTE: this must match whatever URL the Supabase dashboard actually
  -- assigns the deployed function — it does NOT necessarily match the
  -- function's display name. Ours was deployed via the dashboard and
  -- came back as /functions/v1/hyper-worker despite being named
  -- "notify-new-deal" in the dashboard's function list (confirmed
  -- 2026-09-22 — a real mismatch, not a typo here). Check the exact URL
  -- shown in the dashboard before assuming this value is still correct.
  perform net.http_post(
    url := 'https://tyktbinxffpqcbbhvggd.supabase.co/functions/v1/hyper-worker',
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'limited_time_discounts',
      'record', jsonb_build_object(
        'product_id', new.product_id,
        'new_price', new.new_price
      )
    ),
    params := '{}'::jsonb,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || function_secret
    ),
    timeout_milliseconds := 5000
  );
  return new;
end;
$$;

create trigger limited_time_discounts_notify_new_deal
  after insert on public.limited_time_discounts
  for each row
  execute function public.notify_new_deal();
