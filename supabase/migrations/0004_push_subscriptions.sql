-- Per-device Web Push subscriptions for "new deal" notifications (see
-- SPEC.md decision log). No accounts in this app, so subscriptions are
-- keyed by the browser's own push `endpoint`, not a user id — anyone can
-- register/update/unregister their own device's row.
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

-- A SELECT policy was originally left out on purpose, to keep subscriber
-- endpoints unreadable by anon clients. That broke re-subscribing (upsert
-- on `endpoint`) and unsubscribing (delete by `endpoint`) silently —
-- confirmed directly in SQL (`UPDATE 0`, `DELETE 0`, no error) — because
-- Postgres RLS requires row *visibility* (a SELECT-capable policy) before
-- UPDATE/DELETE can locate a specific existing row at all, regardless of
-- what that command's own USING clause says. A public SELECT policy is
-- the fix. The privacy cost is a push `endpoint` (+ its non-secret
-- p256dh/auth encryption keys) becoming anon-readable — low-sensitivity
-- on its own, since sending an actual push still needs this project's
-- private VAPID key, which stays server-side only.
create policy "push_subscriptions_public_select"
  on public.push_subscriptions for select
  to anon, authenticated
  using (true);

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
