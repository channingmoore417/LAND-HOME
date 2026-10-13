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

GHL workflow: trigger **Inbound Webhook** → Create/Update Contact (match on email) → Add Tag `{{inboundWebhookRequest.tags}}`
(or branch on `signal`) → optional Update Custom Fields (last signal, listing URL) → notify agent / start nurture.
