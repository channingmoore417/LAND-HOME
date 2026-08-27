# CRM Custom Fields — Land & Home Group Lead Forms

Setup checklist for the CRM (GHL). Every form on landandhomegroup site POSTs one JSON
payload to `/api/forms`, which forwards the **same payload** to `FORMS_WEBHOOK_URL`.
This doc lists every field the webhook delivers and the custom fields the CRM
needs so nothing is dropped in mapping.

**Route all workflows off `form_id`** — it is the one guaranteed discriminator
on every payload.

`form_id` values: `contact` · `listing_inquiry` · `showing_request` ·
`home_valuation` · `mortgage_preapproval` · `buyer_guide` · `buyer_quiz` ·
`review` (`saved_search` is defined in the API but no form sends it yet).

---

## 1. Standard fields (no custom field needed)

Map these to the CRM's built-in contact fields:

| Webhook key | CRM standard field | Notes |
|---|---|---|
| `first_name` | First Name | Sent by: valuation, prequal, buyer guide, buyer quiz |
| `last_name` | Last Name | Sent by: valuation, prequal, buyer guide, buyer quiz |
| `name` | Full Name (fallback) | **Only** name field on: contact, listing inquiry, tour request |
| `email` | Email | All forms |
| `phone` | Phone | All forms |
| `message` | Notes / first message | All forms — human-readable summary line |
| `source_url` | Lead Source (or custom, see below) | Page path, e.g. `/home-value` |

---

## 2. Custom fields — ALL forms

Create once, used by every submission:

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Form ID | `form_id` | Text | `form_id` |
| Submission ID | `submission_id` | Text | `submission_id` |
| Submitted At | `submitted_at` | Text (ISO datetime) | `submitted_at` |
| Source Page | `source_page` | Text | `source_url` |

---

## 3. Custom fields — Listing forms

Used by `listing_inquiry` and `showing_request` (property pages):

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| MLS Listing Key | `listing_key` | Text | `listing_key` |
| Preferred Tour Times | `tour_preferred_times` | Text | `preferred_times` (tour only, e.g. "In person · Thu, Aug 28") |

The property address is embedded in `message`
("Tour request (In person) for 123 Main St, Lake Charles, LA 70601").

---

## 4. Custom fields — Home Valuation (`home_valuation`)

All nested under `criteria.*` in the payload:

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Property Address | `val_address` | Text | `criteria.address` |
| Property City | `val_city` | Text | `criteria.city` |
| Property Zip | `val_zip` | Text | `criteria.zip` |
| Beds | `val_beds` | Number | `criteria.beds` |
| Baths | `val_baths` | Number | `criteria.baths` |
| Square Footage | `val_sqft` | Text | `criteria.sqft` |
| Year Built | `val_year` | Text | `criteria.year` |
| Property Condition | `val_condition` | Text | `criteria.condition` |
| Selling Timeframe | `val_timeframe` | Text | `criteria.timeframe` |
| Seller Notes | `val_notes` | Text (long) | `criteria.notes` |
| Estimate Low | `val_est_low` | Number ($) | `criteria.estimate.low` |
| Estimate Median | `val_est_median` | Number ($) | `criteria.estimate.median` |
| Estimate High | `val_est_high` | Number ($) | `criteria.estimate.high` |
| Comp Count | `val_est_comps` | Number | `criteria.estimate.comps` |

> `criteria.estimate` is `null` when no comps were found — mapping must
> tolerate missing estimate keys.

---

## 5. Custom fields — Pre-Approval / Prequal (`mortgage_preapproval`)

All nested under `criteria.*`:

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Buying Timeframe | `pa_timeframe` | Text | `criteria.timeframe` |
| Current Housing | `pa_housing` | Text | `criteria.housing` |
| First-Time Buyer | `pa_first_time` | Text (Yes/No) | `criteria.firstTime` |
| Military / Veteran | `pa_military` | Text (Yes/No) | `criteria.military` |
| Property Type | `pa_property_type` | Text | `criteria.property` |
| Target Zip | `pa_zip` | Text | `criteria.zip` |
| Target Price | `pa_price` | Number ($) | `criteria.price` |
| Down Payment | `pa_down` | Number ($) | `criteria.down` |
| Credit Range | `pa_credit` | Text | `criteria.credit` |
| Annual Income | `pa_income` | Number ($) | `criteria.income` |
| Monthly Debts | `pa_monthly_debts` | Number ($) | `criteria.monthlyDebts` |
| Employment Type | `pa_employment` | Text | `criteria.employment` |
| Estimated DTI % | `pa_est_dti` | Number | `criteria.estDTI` |
| Estimated Payment | `pa_est_payment` | Number ($/mo) | `criteria.estPayment` |
| Eligible Programs | `pa_eligible_programs` | Text | `criteria.eligible` (array, e.g. FHA, VA — join with commas) |

This is the Bayou Mortgage handoff form — these fields feed the
pre-approval workflow / LO assignment.

---

## 6. Custom fields — Buyer's Guide (`buyer_guide`)

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Buying Timeline | `guide_timeline` | Text | `criteria.timeline` |

---

## 7. Custom fields — Buyer Match Quiz (`buyer_quiz`)

All nested under `criteria.*`:

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Preferred Communities | `quiz_communities` | Text | `criteria.communities` (array — join with commas) |
| Price Band | `quiz_price` | Text | `criteria.price` |
| Wanted Features | `quiz_features` | Text | `criteria.features` (array — join with commas) |
| Min Beds | `quiz_beds` | Text | `criteria.beds` |
| Min Baths | `quiz_baths` | Text | `criteria.baths` |
| Buying Timeline | `quiz_timeline` | Text | `criteria.timeline` |

---

## 8. Contact form (`contact`) — no custom fields needed

Only standard fields. The topic dropdown is prefixed into `message`
(e.g. `[Buying a home] …`) — if topic should be its own CRM field, the site
needs a small change to send it separately first.

---

## 9. Client Review (`review`) — /reviews

Post-closing feedback page. `email` is **optional** on this form; `name` is
sent as full name only (no first/last split).

| Custom field | Suggested key | Type | Webhook key |
|---|---|---|---|
| Review Rating | `review_rating` | Number (1–5) | `criteria.rating` |
| Review Feedback | `review_feedback` | Text (long) | `criteria.feedback` |

`message` carries the same info as one line ("4-star client review · …").
Workflow idea: rating ≤ 3 → task/notification for a personal follow-up call;
rating 4–5 → thank-you text. (The page itself shows the Google review link to
everyone — no star-gating.)

---

## 10. Saved Search (`saved_search`) — future

No UI sends this yet. When built, the payload will carry `email`, `name`,
`criteria` (search filters), `alert_frequency`. Hold off creating fields
until the form exists.

---

## Setup checklist

- [ ] Create the 4 all-form custom fields (§2)
- [ ] Create the 2 listing-form fields (§3)
- [ ] Create the 14 valuation fields (§4)
- [ ] Create the 15 prequal fields (§5)
- [ ] Create the 1 buyer-guide field (§6)
- [ ] Create the 6 buyer-quiz fields (§7)
- [ ] Create the 2 review fields (§9) + low-rating follow-up workflow
- [ ] Build one inbound-webhook trigger per `form_id` (or one trigger with a `form_id` branch)
- [ ] Map `name` → Full Name on contact / listing inquiry / tour (no first/last split there)
- [ ] Confirm array fields (`pa_eligible_programs`, `quiz_communities`, `quiz_features`) render readably
- [ ] Test one submission per form and verify every field lands
