-- Behavioral intent signals (medium intent) -> GoHighLevel.
-- Service-role only: written/read by /api/signals, never by the browser.

create table if not exists public.behavior_events (
  id          bigint generated always as identity primary key,
  visitor_id  text not null,                       -- first-party cookie (lhg_vid)
  user_id     uuid references auth.users(id) on delete set null,
  type        text not null,                       -- listing_view | listing_saved | saved_search | session_start
  listing_key text,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists behavior_events_visitor_idx on public.behavior_events (visitor_id, created_at desc);
create index if not exists behavior_events_user_idx    on public.behavior_events (user_id, created_at desc);
create index if not exists behavior_events_listing_idx on public.behavior_events (type, listing_key);

create table if not exists public.intent_signals (
  id           bigint generated always as identity primary key,
  signal       text not null,        -- repeat_listing_view | listing_saved | saved_search_created | saved_search_narrowed | return_visit
  visitor_id   text not null,
  user_id      uuid references auth.users(id) on delete set null,
  dedupe_key   text not null,        -- listing_key, search signature, or date
  listing_key  text,
  meta         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  forwarded_at timestamptz,          -- null until delivered to GHL (needs an identified email)
  unique (signal, visitor_id, dedupe_key)
);
create index if not exists intent_signals_pending_idx on public.intent_signals (visitor_id) where forwarded_at is null;

alter table public.behavior_events enable row level security;
alter table public.intent_signals  enable row level security;
-- No policies: only service_role (bypasses RLS) can read/write.
