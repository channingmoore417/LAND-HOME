-- Private log of what the listing capture gate did for each property-page view
-- (shown / skipped and why / step reached / completed / error). Service role only.
create table if not exists public.gate_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  outcome text not null,
  traffic text,
  path text,
  user_agent text,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists gate_events_created_idx on public.gate_events (created_at desc);
alter table public.gate_events enable row level security;
