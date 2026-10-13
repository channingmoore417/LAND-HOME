-- Client search alerts: agent-created searches, per-person digest settings,
-- change log for price drops / back-on-market, send log + dedupe.
-- ADDITIVE ONLY: no existing column is dropped or altered.

-- ---------------------------------------------------------------- listings
-- Reliable "new to us" timestamp (on_market_date is a date; synced_at changes
-- on every sync). Backfilled from on_market_date so old inventory is never
-- treated as new.
alter table public.listings add column if not exists first_seen_at timestamptz;
update public.listings
   set first_seen_at = coalesce(on_market_date::timestamptz, synced_at, now())
 where first_seen_at is null;
alter table public.listings alter column first_seen_at set default now();
create index if not exists listings_first_seen_idx on public.listings (first_seen_at desc);

-- ----------------------------------------------------------- listing_history
-- Logs every price / status change the sync applies, so price drops and
-- back-on-market events can be detected (history was empty before).
alter table public.listing_history add column if not exists old_price numeric;
alter table public.listing_history add column if not exists old_status text;
create index if not exists listing_history_key_idx on public.listing_history (listing_key, created_at desc);
create index if not exists listing_history_created_idx on public.listing_history (created_at desc);

create or replace function public.log_listing_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.list_price is distinct from old.list_price and old.list_price is not null and new.list_price is not null then
    insert into listing_history (listing_key, event_date, event_type, price, old_price, standard_status, old_status)
    values (new.listing_key, current_date,
            case when new.list_price < old.list_price then 'price_drop' else 'price_increase' end,
            new.list_price, old.list_price, new.standard_status, old.standard_status);
  end if;
  if new.standard_status is distinct from old.standard_status then
    insert into listing_history (listing_key, event_date, event_type, price, old_price, standard_status, old_status)
    values (new.listing_key, current_date,
            case when new.standard_status = 'Active' and old.standard_status in ('Pending','ActiveUnderContract','Hold','OffMarket','Withdrawn','Canceled','Expired')
                 then 'back_on_market' else 'status_change' end,
            new.list_price, old.list_price, new.standard_status, old.standard_status);
  end if;
  return new;
end $$;

drop trigger if exists listings_log_change on public.listings;
create trigger listings_log_change after update on public.listings
  for each row when (new.list_price is distinct from old.list_price or new.standard_status is distinct from old.standard_status)
  execute function public.log_listing_change();

-- ------------------------------------------------------------------- agents
alter table public.agents add column if not exists ghl_user_id text;

-- ------------------------------------------------------------------ clients
-- One row per PERSON who receives alerts. Agent-created clients and site
-- visitors (auto-created from their saved search) both live here, so every
-- person gets exactly one merged digest no matter how many searches they have.
create table if not exists public.clients (
  id               bigint generated always as identity primary key,
  agent_id         bigint references public.agents(id),
  full_name        text,
  email            text not null,
  phone            text,
  source           text not null default 'agent',          -- agent | visitor
  token            text not null unique default replace(gen_random_uuid()::text, '-', ''),
  user_id          uuid,                                    -- auth.users id once they have a site account
  ghl_contact_id   text,
  alerts_enabled   boolean not null default true,
  digest_frequency text not null default 'weekly',          -- instant | daily | weekly
  sms_weekly       boolean not null default false,
  sms_consent_at   timestamptz,
  sms_consent_note text,
  last_digest_at   timestamptz,
  last_sms_at      timestamptz,
  created_by       uuid,
  created_at       timestamptz not null default now()
);
create unique index if not exists clients_email_uidx on public.clients (lower(email));
create index if not exists clients_agent_idx on public.clients (agent_id);

-- junction-free link: saved_searches belong to a client
alter table public.saved_searches add column if not exists client_id bigint references public.clients(id);
alter table public.saved_searches add column if not exists agent_id bigint references public.agents(id);
alter table public.saved_searches add column if not exists source text not null default 'visitor'; -- agent | visitor | quiz | auto
alter table public.saved_searches add column if not exists baseline_at timestamptz not null default now(); -- only listings first seen after this count as "new"
create index if not exists saved_searches_client_idx on public.saved_searches (client_id);

-- Existing visitor searches become client rows, alerts OFF until they opt in again.
insert into public.clients (email, full_name, phone, source, user_id, alerts_enabled, digest_frequency)
select lower(trim(s.email)), p.full_name, p.phone, 'visitor', s.user_id, false, 'weekly'
  from (select distinct on (lower(trim(email))) * from public.saved_searches where email is not null and trim(email) <> '' order by lower(trim(email)), created_at) s
  left join public.profiles p on lower(p.email) = lower(trim(s.email))
on conflict do nothing;
update public.saved_searches s set client_id = c.id
  from public.clients c where s.client_id is null and lower(trim(s.email)) = lower(c.email);

-- Every NEW visitor search (gate / quiz / NotifyBand) gets a client row.
create or replace function public.link_saved_search_client() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid bigint; em text := lower(trim(coalesce(new.email, '')));
begin
  if new.client_id is null and em <> '' then
    select id into cid from clients where lower(email) = em;
    if cid is null then
      insert into clients (email, full_name, phone, source, user_id, digest_frequency)
      select em, p.full_name, p.phone, 'visitor', new.user_id,
             case when new.alert_frequency in ('instant','daily','weekly') then new.alert_frequency else 'weekly' end
        from (select 1) x left join profiles p on lower(p.email) = em
      on conflict do nothing;
      select id into cid from clients where lower(email) = em;
    end if;
    new.client_id := cid;
  end if;
  return new;
end $$;
drop trigger if exists saved_searches_link_client on public.saved_searches;
create trigger saved_searches_link_client before insert on public.saved_searches
  for each row execute function public.link_saved_search_client();

-- --------------------------------------------------------------- send logs
create table if not exists public.alert_sends (
  id            bigint generated always as identity primary key,
  client_id     bigint not null references public.clients(id) on delete cascade,
  channel       text not null,                         -- email | sms
  status        text not null,                         -- sent | failed | skipped
  match_count   int  not null default 0,
  listing_keys  text[] not null default '{}',
  events        jsonb,                                  -- {listing_key: new|price_drop|back_on_market}
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists alert_sends_client_idx on public.alert_sends (client_id, created_at desc);

-- Dedupe: a home is only sent once per person per event type.
create table if not exists public.alert_sent_listings (
  client_id   bigint not null references public.clients(id) on delete cascade,
  listing_key text   not null,
  event       text   not null default 'new',
  sent_at     timestamptz not null default now(),
  primary key (client_id, listing_key, event)
);

-- Clicks / page views from alert links, tied to the client.
create table if not exists public.alert_events (
  id          bigint generated always as identity primary key,
  client_id   bigint not null references public.clients(id) on delete cascade,
  type        text not null,                           -- page_view | listing_click
  listing_key text,
  created_at  timestamptz not null default now()
);

-- Service-role only (like leads / saved_searches): no policies.
alter table public.clients enable row level security;
alter table public.alert_sends enable row level security;
alter table public.alert_sent_listings enable row level security;
alter table public.alert_events enable row level security;

-- Kacy is an admin (Lauren already is).
update public.profiles set is_admin = true where lower(email) = 'kacysbroussard@gmail.com';

-- ----------------------------------------------------------------------------
-- Applied separately in production (kept here so the repo records the schema):
--
-- 1. The existing saved_searches → GHL trigger must NOT fire for searches the
--    team or system creates, or it re-runs the "New Buyer Lead Submission"
--    workflow (round-robin owner + buyer-activity alert) for agent clients.
--    forward_saved_search_to_ghl() now starts with:
--        if new.source in ('agent','auto') then return new; end if;
--    (rest of the function unchanged).
--
-- 2. agents.ghl_user_id: Lauren c9RArAPwZOCWT7abw5Wc, Karley YH2rcZMSIh373TXAOgFH,
--    Kacy cW8GX40CHtqcjHBW9Jq5. Add a teammate by setting their ghl_user_id and
--    adding a branch to the "Which agent?" step in the GHL alert workflow.
--
-- 3. Pending (run once the site is deployed and ALERTS_CRON_SECRET is set):
--    select cron.schedule('client-alerts-hourly', '5 * * * *', $cron$
--      select net.http_post(
--        url := 'https://www.landhomegroup.com/api/alerts/run',
--        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ALERTS_CRON_SECRET>'),
--        body := '{}'::jsonb) $cron$);
