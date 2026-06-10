# CLAUDE.md — The Land & Home Group Website

Read this first every session. It carries the full context for this build.

## What this is

A **standalone** real estate website for **The Land & Home Group** (SWLA),
powered by live MLS data from **Trestle / Cotality (RESO 2.0 Web API)**, feed =
**Southwest Louisiana Association of Realtors (SWLAR)**.

> This is its OWN project — NOT part of Bayou Mortgage. It deploys to its own
> GitHub repo (`channingmoore417/LAND-HOME`) and its own Vercel project, and
> reads its own Supabase project. Strategic purpose: it's the referral flywheel
> for Bayou Mortgage (buyer traffic → leads → mortgage pre-approval handoff).

Owner: Channing Moore (also owns Bayou Mortgage + Multiply Local).

## Architecture — non-negotiable

```
Trestle  →  sync (Supabase Edge Function)  →  Supabase  →  THIS Next.js site
```

- The site reads **Supabase only**. NEVER query Trestle on a visitor pageview
  (quota is 3,600/hr). The scheduled sync is the only thing that hits Trestle.
- Server components read Supabase via the anon key (public-read RLS); ISR keeps
  pages fresh (~5 min).

## Supabase (already built — separate project, NOT in any repo)

- **Project:** `landhome-trestle`  ·  **Org:** Amplify Marketing
- **Ref / URL:** `yqxxywdtdwlvsoofoird` → `https://yqxxywdtdwlvsoofoird.supabase.co`
- **Region:** us-east-1  ·  Free tier
- **Anon key (public, safe in browser):**
  `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxeHh5d2R0ZHdsdnNvb2ZvaXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwOTg1ODMsImV4cCI6MjA5NjY3NDU4M30.yO8ei55PPRSWRYXCOJDZj7h9uKUK3DLfBTDFkmD5xTE`
- **Service role key:** server-only secret — set in Vercel, never in the repo.

### What's already loaded
- 10 tables: `listings`, `listing_media`, `listing_history`, `agents`, `leads`,
  `saved_searches`, `favorites`, `showing_requests`, `seo_pages`, `sync_state`.
- **3,169 listings + 43,562 photos** (all 13 SWLA cities, Active/Pending).
- RLS enabled everywhere: public-read on listings/listing_media/agents/seo_pages;
  PII + state tables (leads, saved_searches, favorites, showing_requests,
  listing_history, sync_state) locked to service_role.
- **Edge Function `trestle-sync`** (resumable Deno port of the sync) +
  `pg_cron`/`pg_net` available for scheduling. Trestle creds live as function
  secrets (the bootstrap secret in chat history is BURNED — rotate before prod).

### Trestle/SWLAR gotcha (already solved)
Media uses `MediaClassification eq 'PHOTO'` (NOT `MediaCategory`, which is null).
Link field is `ResourceRecordKey`.

## The site (this repo)

Next.js (App Router) + plain CSS port of the LHG black/gold template
(Cinzel + Hanken Grotesk). Key files:

- `src/app/layout.tsx` — global shell. **Header + footer live here**, driven by
  `src/config/site.ts` (ONE place to edit nav, phone, logo, footer, MLS
  disclaimer, Bayou module). This was an explicit requirement.
- `src/app/listings/[listingKey]/page.tsx` — the single-property template; ONE
  template renders every MLS listing from Supabase (ISR, revalidate 300).
- `src/components/` — `Gallery` (grid + lightbox), `MortgageCalculator`
  (+ Bayou module), `PropertyInteractive` (lead card, message form, Tour & Ask
  modals, sticky mobile bar), `SiteHeader`, `SiteFooter`.
- `src/app/api/forms/route.ts` — **ONE webhook for every form** (explicit
  requirement). All forms POST here with a stable `form_id`; the route writes to
  Supabase (service role) and forwards the same payload to `FORMS_WEBHOOK_URL`.
- `src/app/page.tsx` — minimal featured-listings landing (placeholder).

### Unified form ids (stable)
`contact`, `listing_inquiry`, `showing_request`, `saved_search`,
`home_valuation`, `mortgage_preapproval`.

## Env vars (see .env.example)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public reads
  (defaults are baked into `src/lib/supabase.ts` so it renders with none set).
- `SUPABASE_SERVICE_ROLE_KEY` — server-only, for `/api/forms` writes.
- `FORMS_WEBHOOK_URL` — the single external webhook (add when available).

## Hard rules (brand + compliance)
- **IDX attribution:** show "Courtesy of {list_office_name}" on every card/detail
  where `is_lhg_listing = false`. MLS disclaimer in the global footer.
- Respect per-listing flags: `internet_display_yn`, `internet_address_yn`,
  `internet_avm_yn`, `internet_comment_yn`.
- **FLOOD CONTENT IS ALLOWED HERE.** The "no flood content" rule is a *Bayou
  Mortgage* mandate and does NOT apply to this real-estate site. Keep the Flood
  Zone detail row. (Note: the sync currently strips flood from remarks and there
  is no flood field yet — see TODO.)
- SEO copy rule (from Bayou playbook): city names only in H2/H3, never "SWLA" in
  headers; H1 = exact target keyword.

## SWLA canonical cities (13)
Lake Charles, Sulphur, Moss Bluff, Iowa, Vinton, Cameron, Ragley, DeQuincy,
DeRidder, Jennings, Welsh, Carlyss, Westlake.

## Build / run
```bash
npm install
npm run dev        # http://localhost:3000  → try /listings/1146589207
```

## TODO / next steps (in priority order)
1. **Real flood-zone data** (APPROVED): stop stripping flood in the sync, probe
   Trestle for a flood-zone field, add it to the schema, re-sync; render it in
   the Flood Zone row + remarks.
2. **Production sync schedule:** 15-min `pg_cron` calling `trestle-sync?mode=all`.
3. **Rotate the Trestle client secret** before production (current one burned).
4. **Seed `seo_pages`** from real feature counts (pool 587, acre+ 1012,
   single-story 1083, waterfront 136, remodeled 104, new-construction 198, …).
5. **Full IDX search** page (map + filters), MapLibre on the listing Location
   block using `latitude`/`longitude`.
6. **Cloudinary** proxy for photos (`media_url`s are Trestle-signed, may expire).
7. **Leads → GHL** dual-write (same pattern as Bayou OS).

## Note on session scope
The original build session was bound to the `bayoumortgage` repo and could not
push to `LAND-HOME`; the code was delivered as a zip. Future sessions should be
started bound to `channingmoore417/LAND-HOME` so Claude can push directly.
