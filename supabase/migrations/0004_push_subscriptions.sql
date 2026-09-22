-- Per-device Web Push subscriptions for "new deal" notifications (see
-- SPEC.md decision log). No accounts in this app, so subscriptions are
-- keyed by the browser's own push `endpoint`, not a user id — anyone can
-- register/update/unregister their own device's row, and there is no
-- public read policy at all, so subscriber endpoints are never exposed to
-- anon clients. Only the notify-new-deal Edge Function (service-role key,
-- bypasses RLS) can list them to fan out a push.
create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  -- The subscriber's app language at subscribe time, so the push text
  -- (sent by the Edge Function, not read from the DB by the client) can
  -- match whichever language they read the app in.
  lang       text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_public_insert"
  on public.push_subscriptions for insert
  to anon, authenticated
  with check (true);

-- Needed so re-subscribing the same device (upsert on `endpoint`) doesn't
-- fail once the row already exists.
create policy "push_subscriptions_public_update"
  on public.push_subscriptions for update
  to anon, authenticated
  using (true)
  with check (true);

create policy "push_subscriptions_public_delete"
  on public.push_subscriptions for delete
  to anon, authenticated
  using (true);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row
  execute function public.set_updated_at();
