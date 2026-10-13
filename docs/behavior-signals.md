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
