-- Every lead becomes an alert client with a home search.
--
-- Before: only people who explicitly saved a search (or an agent set one up)
-- got a `clients` row, so 47 of 51 leads never received a digest or weekly text.
--
-- Now: any lead with an email gets (1) a `clients` row (created by the existing
-- saved_searches_link_client trigger) and (2) one starter saved search, built
-- from the best signal on the lead:
--   quiz / gate answers  -> cities, beds, baths, price band, features
--   viewed/asked listing -> that city, +/-25% price, beds-1 and up
--   pre-approval budget  -> price ceiling
--   valuation / offer    -> the city they entered
--   nothing              -> all homes for sale (they can narrow it from any email)
-- Searches are source='auto', so forward_saved_search_to_ghl() skips them and the
-- "New Buyer Lead" workflow is not re-run. SMS is NOT switched on (needs consent).
-- Leads that already have any search are left alone. Never blocks a lead insert.

create or replace function public.lead_default_criteria(l public.leads)
returns jsonb language plpgsql stable as $$
declare
  c jsonb := coalesce(l.criteria, '{}'::jsonb);
  lst record;
  price numeric;
  out jsonb;
begin
  -- 1) quiz / gate / search-shaped criteria
  if jsonb_typeof(c->'communities') = 'array' or nullif(c->>'city', '') is not null then
    out := jsonb_strip_nulls(jsonb_build_object(
      'communities', case when jsonb_typeof(c->'communities') = 'array' then c->'communities' end,
      'city',        nullif(c->>'city', ''),
      'beds',        nullif(c->>'beds', ''),
      'baths',       nullif(c->>'baths', ''),
      'price',       case when (c->>'price') ~ '^\$' then c->>'price' end,
      'features',    case when jsonb_typeof(c->'features') = 'array' then c->'features' end,
      'type',        nullif(c->>'type', '')
    ));
    return out;
  end if;

  -- 2) a listing they viewed / asked about
  if l.listing_key is not null then
    select city, list_price, bedrooms_total into lst from public.listings where listing_key = l.listing_key;
    if found and lst.city is not null then
      return jsonb_strip_nulls(jsonb_build_object(
        'cities', jsonb_build_array(initcap(lst.city)),
        'priceMin', case when lst.list_price > 0 then round(lst.list_price * 0.75, -3) end,
        'priceMax', case when lst.list_price > 0 then round(lst.list_price * 1.25, -3) end,
        'bedsMin', case when lst.bedrooms_total > 1 then lst.bedrooms_total - 1 end,
        'features', '[]'::jsonb
      ));
    end if;
  end if;

  -- 3) pre-approval budget
  if l.destination = 'mortgage_preapproval' and (c->>'price') ~ '^\d+$' then
    price := (c->>'price')::numeric;
    if price > 0 then
      return jsonb_build_object('priceMax', price, 'features', '[]'::jsonb);
    end if;
  end if;

  -- 4) nothing usable: all homes for sale
  return '{}'::jsonb;
end $$;

create or replace function public.ensure_lead_search(l public.leads)
returns void language plpgsql security definer set search_path = public as $$
declare
  em text := lower(trim(coalesce(l.email, '')));
  crit jsonb;
  cid bigint;
begin
  if em = '' or em !~ '^[^@\s]+@[^@\s]+$' then return; end if;
  if exists (select 1 from saved_searches where lower(trim(email)) = em) then return; end if;

  crit := public.lead_default_criteria(l);
  insert into saved_searches (email, name, criteria, alert_frequency, source, lead_id, active)
  values (em, 'Starter search from your ' || replace(coalesce(l.destination, 'inquiry'), '_', ' '),
          crit, 'weekly', 'auto', l.id, true);

  -- the BEFORE INSERT trigger created/linked the client; give it the lead's contact details
  select id into cid from clients where lower(email) = em;
  if cid is not null then
    update clients
       set full_name = coalesce(nullif(full_name, ''), nullif(trim(l.full_name), '')),
           phone     = coalesce(nullif(phone, ''), nullif(trim(l.phone), ''))
     where id = cid;
  end if;
end $$;

create or replace function public.lead_creates_search() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.ensure_lead_search(new);
  exception when others then
    raise warning 'lead_creates_search failed for lead %: %', new.id, sqlerrm;
  end;
  return new;
end $$;

drop trigger if exists leads_create_search on public.leads;
create trigger leads_create_search after insert on public.leads
  for each row execute function public.lead_creates_search();

-- ------------------------------------------------------------------ backfill
-- Best lead per email first (one with usable criteria, then newest); the
-- "already has a search" guard makes the first one win.
do $$
declare r public.leads;
begin
  for r in
    select * from public.leads
     where email is not null and trim(email) <> ''
     order by (jsonb_typeof(criteria->'communities') = 'array' or nullif(criteria->>'city','') is not null) desc,
              id desc
  loop
    perform public.ensure_lead_search(r);
  end loop;
end $$;

-- The owner's own test client was switched off, which made the runner skip it
-- entirely (ALERTS_MODE=test only delivers to this address).
update public.clients set alerts_enabled = true where lower(email) = 'channing@multiplylocal.com';
