# Behavioral intent signals (medium intent) → Supabase → GHL

Flow: browser `trackSignal()` → `POST /api/signals` → `behavior_events` / `intent_signals` (Supabase) → `GHL_SIGNALS_WEBHOOK_URL`.
Setup: apply `supabase/migrations/20261013_behavior_signals.sql`, set `GHL_SIGNALS_WEBHOOK_URL` in Vercel.

| Signal | Rule | GHL tags |
|---|---|---|
| `repeat_listing_view` | 3rd view of the same listing by the same visitor/user (views within 30 min count once) | `intent:medium`, `intent:repeat-listing-view` |
| `listing_saved` | Property favorited | `intent:medium`, `intent:saved-listing` |
| `saved_search_created` / `saved_search_narrowed` | Search saved; "narrowed" = keeps prior filters and adds/tightens one | `intent:medium`, `intent:saved-search` (+ `intent:search-narrowed`) |
| `return_visit` | First activity after ≥30 days idle; `band` = `30_60` or `60_plus` | `intent:medium`, `intent:returned-30-60d` / `intent:returned-60d-plus` |

Identity: anonymous visitors get a server-set `lhg_vid` cookie. Signals are stored immediately but only sent to GHL once the
visitor signs in (email comes from the verified Supabase JWT); the next authenticated request flushes the backlog.

Webhook payload fields: `signal, intent_level, tags[], occurred_at, email, name, phone, listing_key, listing_url,
listing_address, listing_city, listing_price`, plus per-signal extras (`view_count`, `criteria`, `previous_criteria`,
`days_inactive`, `band`).

GHL workflow: "Website Behavior Signal" (draft, id c8d640db-c2c7-47d5-b718-2b90c8a73f68) — Inbound Webhook trigger → create/update contact → note → SMS to contact owner. Copy its webhook URL into GHL_SIGNALS_WEBHOOK_URL, then publish. Tours, quizzes and other forms already use their own GHL workflows via /api/forms.

## Already handled by database triggers (do not duplicate)
`favorites`, `saved_searches`, `showing_requests` and `leads` inserts are forwarded to GHL by Postgres triggers
(`forward_*_to_ghl`), so saves, saved searches, tour requests and quizzes already notify the team. `/api/signals` only sends
the signals those triggers cannot see: `repeat_listing_view` and `return_visit`. Every property message uses the full address
(`listing_address`, from `public.listing_address()`) and a clickable `listing_url` — never the MLS number.

## Alerts: SMS only for high intent
- **SMS (high intent):** tour request, property inquiry (both → GHL "New Property Tour Request"), pre-approval, home valuation, contact form.
- **In-app notification only (low intent):** home saved, saved search, buyer quiz, buyer guide, registration gate, repeat views, returns.
  Every event still adds a note to the contact.

## Agent recap emails (`/api/digest`)
A GHL scheduled workflow calls `GET /api/digest` (header `Authorization: Bearer $CRON_SECRET`) at Mon–Fri 8 AM / 12 PM / 4 PM and
Sat & Sun 4 PM Lake Charles time. GHL owns timing + time zone; there is no hourly polling. For each GHL user the endpoint reads their
assigned contacts (GHL API), summarizes site activity since **that agent's last delivered recap** (`digest_runs`), and posts one
email per agent to `GHL_DIGEST_WEBHOOK_URL` ("Agent Recap Email" workflow sends it). A failed or missed run loses nothing: the next
window is simply longer. Agents with no activity get nothing.
Env: `GHL_API_KEY` (Private Integration: contacts.readonly + users.readonly), `GHL_DIGEST_WEBHOOK_URL`, `CRON_SECRET`.
Test without sending or recording: `GET /api/digest?preview=1` with the bearer secret.
