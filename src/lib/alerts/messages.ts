// ============================================================
// Message content for alerts: the HTML listing cards for the email, the
// subject line, and the weekly text. Pure functions — no I/O.
//
// All links go through /m/<token>/… so every click is tied to the client
// (and skips the sign-up gate they've already been through).
// ============================================================

import { SITE_URL } from "@/lib/seoConfig";
import { usd, titleCase } from "@/lib/format";
import type { MatchedListing } from "@/lib/alerts/types";

export const matchesUrl = (token: string) => `${SITE_URL}/m/${token}`;
export const listingUrl = (token: string, key: string) => `${SITE_URL}/m/${token}/${encodeURIComponent(key)}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const EVENT_LABEL = { new: "NEW", price_drop: "PRICE DROP", back_on_market: "BACK ON MARKET" } as const;
const EVENT_COLOR = { new: "#2f7d57", price_drop: "#c2410c", back_on_market: "#1d4ed8" } as const;

export const EMAIL_CARD_LIMIT = 5;

function address(m: MatchedListing): string {
  const c = m.card;
  return c.internet_address_yn !== false && c.unparsed_address
    ? c.unparsed_address
    : `${titleCase(c.city)} area`;
}

export function emailSubject(matches: MatchedListing[], firstName: string | null): string {
  const n = matches.length;
  const drops = matches.filter((m) => m.event === "price_drop").length;
  const top = matches[0];
  const city = top ? titleCase(top.card.city) : "";
  const lead =
    n === 1 && top
      ? `${top.event === "price_drop" ? "Price drop" : top.event === "back_on_market" ? "Back on market" : "New home"}: ${usd(top.card.list_price)}${city ? ` in ${city}` : ""}`
      : `${n} homes match your search${drops ? ` (${drops} price drop${drops > 1 ? "s" : ""})` : ""}`;
  return firstName ? `${firstName}, ${lead.charAt(0).toLowerCase()}${lead.slice(1)}` : lead;
}

function card(m: MatchedListing, token: string): string {
  const c = m.card;
  const url = listingUrl(token, c.listing_key);
  const specs = [
    c.bedrooms_total != null ? `${c.bedrooms_total} bd` : null,
    c.bathrooms_total != null ? `${c.bathrooms_total} ba` : null,
    c.living_area ? `${Math.round(c.living_area).toLocaleString("en-US")} sqft` : null,
  ].filter(Boolean).join(" &nbsp;•&nbsp; ");
  const price =
    m.event === "price_drop" && m.oldPrice && c.list_price
      ? `<span style="color:#c2410c">${usd(c.list_price)}</span> <span style="font-size:13px;color:#888;text-decoration:line-through">${usd(m.oldPrice)}</span>`
      : usd(c.list_price);
  const img = m.photo
    ? `<a href="${url}"><img src="${esc(m.photo)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:10px 10px 0 0"></a>`
    : "";
  const courtesy =
    !c.is_lhg_listing && c.list_office_name
      ? `<div style="font-size:11px;color:#888;margin-top:8px">Listing courtesy of ${esc(c.list_office_name)}</div>`
      : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto 18px;border:1px solid #e5e5e5;border-radius:10px;background:#fff">
  <tr><td>${img}</td></tr>
  <tr><td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif">
    <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${EVENT_COLOR[m.event]}">${EVENT_LABEL[m.event]}</div>
    <div style="font-size:22px;font-weight:700;color:#111;margin:4px 0">${price}</div>
    <div style="font-size:14px;color:#333">${specs}</div>
    <div style="font-size:14px;color:#333;margin-top:4px"><a href="${url}" style="color:#111;text-decoration:none">${esc(address(m))}, ${esc(titleCase(c.city))}</a></div>
    ${m.why ? `<div style="font-size:12px;color:#777;margin-top:6px">Why it matched: ${esc(m.why)}</div>` : ""}
    <div style="margin-top:12px"><a href="${url}" style="display:inline-block;background:#111;color:#fff;font-size:14px;font-weight:700;padding:10px 18px;border-radius:6px;text-decoration:none">View home</a></div>
    ${courtesy}
  </td></tr>
</table>`;
}

export function emailHtml(opts: {
  matches: MatchedListing[];
  token: string;
  firstName: string | null;
  agentName: string | null;
  searchSummary: string;
}): string {
  const { matches, token, firstName, agentName, searchSummary } = opts;
  const shown = matches.slice(0, EMAIL_CARD_LIMIT);
  const more = matches.length - shown.length;
  const all = matchesUrl(token);
  return `
<div style="background:#f5f5f5;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:560px;margin:0 auto 16px;color:#222;font-size:15px;line-height:1.5">
    <p style="margin:0 0 6px">Hi ${esc(firstName || "there")},</p>
    <p style="margin:0">${matches.length} ${matches.length === 1 ? "home" : "homes"} just hit the market that match what you're looking for${searchSummary ? ` (<em>${esc(searchSummary)}</em>)` : ""}.</p>
  </div>
  ${shown.map((m) => card(m, token)).join("")}
  <div style="max-width:560px;margin:8px auto 0;text-align:center">
    <a href="${all}" style="display:inline-block;background:#b8923a;color:#fff;font-size:15px;font-weight:700;padding:13px 26px;border-radius:6px;text-decoration:none">${more > 0 ? `See all ${matches.length} homes` : "Open your matches"}</a>
  </div>
  <div style="max-width:560px;margin:18px auto 0;font-size:13px;color:#666;line-height:1.5;text-align:center">
    ${agentName ? `Questions or want to tour one? Reply to this email — ${esc(agentName)} will take care of you.<br>` : ""}
    <a href="${all}" style="color:#666">Change or pause your alerts</a>
  </div>
</div>`;
}

export function smsText(opts: { count: number; token: string; firstName: string | null }): string {
  const { count, token, firstName } = opts;
  return `${firstName ? `Hi ${firstName}, ` : ""}${count} new ${count === 1 ? "home matches" : "homes match"} your search this week: ${matchesUrl(token)} Reply STOP to opt out.`;
}
