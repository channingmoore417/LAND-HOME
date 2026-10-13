-- Applied to production. One row per recap email delivered to GHL; the next recap for that agent
-- covers everything since sent_at, so a missed/failed run never loses activity.
create table if not exists public.digest_runs (
  id bigint generated always as identity primary key,
  agent_email text not null,
  slot text,
  contacts integer not null default 0,
  sent_at timestamptz not null default now()
);
create index if not exists digest_runs_agent_idx on public.digest_runs (agent_email, sent_at desc);
alter table public.digest_runs enable row level security;
