-- Applied to production. listing_address() feeds every DB-trigger -> GHL webhook
-- (showing requests, home saves, leads). Now returns the FULL address
-- (street, city, state ZIP), a clickable listing_url and the price.
create or replace function public.listing_address(p_key text)
returns jsonb
language sql
stable
as $function$
  select coalesce((
    select jsonb_strip_nulls(jsonb_build_object(
      'listing_address',
      case when coalesce(internet_address_yn, true) and unparsed_address is not null
        then trim(both ' ,' from concat_ws(', ', unparsed_address, city,
             nullif(trim(concat_ws(' ', coalesce(state_or_province, 'LA'), postal_code)), '')))
      end,
      'listing_url', 'https://www.landhomegroup.com/listings/' || listing_key,
      'listing_price', list_price
    ))
    from public.listings
    where listing_key = p_key
    limit 1
  ), '{}'::jsonb)
$function$;
