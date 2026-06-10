# Land & Home Group — Website

Next.js (App Router) front-end for The Land & Home Group, reading the
Supabase data layer populated by the Trestle sync. Deploys on Vercel.

## Architecture

```
Trestle → sync → Supabase → THIS Next.js site (reads Supabase only)
```

The site never queries Trestle directly. Server components read Supabase
(public-read RLS via the anon key); ISR keeps pages fresh (~5 min).

## Key pieces

- `src/app/layout.tsx` — global shell. **Header + footer live here** and are
  driven by `src/config/site.ts` (one place to edit nav, phone, logo, footer,
  MLS disclaimer, Bayou module).
- `src/app/listings/[listingKey]/page.tsx` — the single-property template.
  One template renders every MLS listing.
- `src/app/api/forms/route.ts` — **one webhook for every form.** All forms post
  here with a stable `form_id`; the route writes to Supabase and forwards the
  same payload to `FORMS_WEBHOOK_URL`.

### Stable form ids
`contact`, `listing_inquiry`, `showing_request`, `saved_search`,
`home_valuation`, `mortgage_preapproval`.

## Env vars

See `.env.example`. Public values (`NEXT_PUBLIC_*`) are safe in the browser.
`SUPABASE_SERVICE_ROLE_KEY` and `FORMS_WEBHOOK_URL` are server-only — set them
as encrypted env vars in Vercel.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

Try a real listing at `/listings/1146589207`.

## Compliance baked in

- "Courtesy of {office}" shown when `is_lhg_listing = false`
- Honors `internet_address_yn` / `internet_comment_yn` per listing
- MLS disclaimer in the global footer

## Notes / follow-ups

- **Photos:** `media_url`s are Trestle-signed and may expire — proxy through
  Cloudinary (`f_auto,q_auto`) before heavy production traffic.
- **Map:** the Location block is a styled placeholder; wire MapLibre with
  `latitude`/`longitude` next.
- **Flood Zone:** the detail row is present but there's no flood field in the
  DB yet (sync currently strips flood text). Decide on a data source to fill it.
