// ============================================================
// Message content for alerts: the HTML listing cards for the email, the
// subject line, and the weekly text. Pure functions — no I/O.
//
// All links go through /m/<token>/… so every click is tied to the client
// (and skips the sign-up gate they've already been through).
// ============================================================

import { SITE_URL } from "@/lib/seoConfig";
import { site } from "@/config/site";
import { usd, titleCase } from "@/lib/format";
import type { MatchedListing } from "@/lib/alerts/types";

export const matchesUrl = (token: string) => `${SITE_URL}/m/${token}`;
export const adjustUrl = (token: string) => `${SITE_URL}/m/${token}/adjust`;
export const listingUrl = (token: string, key: string) => `${SITE_URL}/m/${token}/${encodeURIComponent(key)}`;

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Brand tokens — mirror :root in globals.css (coastal teal/aqua, Outfit).
const B = {
  teal: "#204860", tealDeep: "#163848", tealMid: "#3A6B7E", aqua: "#61C1CC", aquaSoft: "#D9F0F2",
  aquaLine: "#BFE4E8", sand: "#F6F3EC", off: "#F8FAFB", ink: "#1D2B33", muted: "#5E7079", line: "#E6EDF0",
  warn: "#B45309", warnSoft: "#FDF1DC",
};
const FONT = "Outfit,'Segoe UI',Helvetica,Arial,sans-serif";

const EVENT_LABEL = { new: "NEW", price_drop: "PRICE DROP", back_on_market: "BACK ON MARKET" } as const;
const EVENT_STYLE = {
  new: { bg: B.aquaSoft, fg: B.teal },
  price_drop: { bg: B.warnSoft, fg: B.warn },
  back_on_market: { bg: B.aquaSoft, fg: B.tealMid },
} as const;

export const EMAIL_CARD_LIMIT = 3;   // photo cards; the rest are plain text lines
const EMAIL_LINE_LIMIT = 6;

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

// Deliberately plain: a personal-looking note from the agent, system fonts, one
// restrained card style, text links instead of big buttons, brand details in
// the footer. Heavy "marketing" styling (banner headers, big CTA buttons, many
// images) is what pushes mail into Promotions/spam.
function card(m: MatchedListing, token: string): string {
  const c = m.card;
  const url = listingUrl(token, c.listing_key);
  const st = EVENT_STYLE[m.event];
  const specs = [
    c.bedrooms_total != null ? `${c.bedrooms_total} bd` : null,
    c.bathrooms_total != null ? `${c.bathrooms_total} ba` : null,
    c.living_area ? `${Math.round(c.living_area).toLocaleString("en-US")} sqft` : null,
  ].filter(Boolean).join(" &nbsp;|&nbsp; ");
  const price =
    m.event === "price_drop" && m.oldPrice && c.list_price
      ? `${usd(c.list_price)} <span style="font-size:13px;font-weight:400;color:${B.muted};text-decoration:line-through">${usd(m.oldPrice)}</span>`
      : usd(c.list_price);
  const img = m.photo
    ? `<tr><td><a href="${url}"><img src="${esc(m.photo)}" alt="${esc(address(m))}" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:8px 8px 0 0"></a></td></tr>`
    : "";
  const courtesy =
    !c.is_lhg_listing && c.list_office_name
      ? `<div style="font-size:11px;color:${B.muted};margin-top:8px">Listing provided courtesy of ${esc(c.list_office_name)}</div>`
      : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 0 18px;border:1px solid ${B.line};border-radius:8px">
  ${img}
  <tr><td style="padding:14px 16px 16px;font-family:${FONT};font-size:15px;line-height:1.5;color:${B.ink}">
    <div style="font-size:11px;font-weight:700;letter-spacing:.06em;color:${st.fg}">${EVENT_LABEL[m.event]}</div>
    <div style="font-size:22px;font-weight:700;color:${B.teal};margin:2px 0 2px">${price}</div>
    <div>${specs}</div>
    <div style="margin-top:2px"><a href="${url}" style="color:${B.ink};text-decoration:none">${esc(address(m))}, ${esc(titleCase(c.city))}</a></div>
    ${m.why ? `<div style="font-size:12px;color:${B.muted};margin-top:6px">Why it matched: ${esc(m.why)}</div>` : ""}
    <div style="margin-top:10px"><a href="${url}" style="color:${B.teal};font-weight:700">View this home &rarr;</a></div>
    ${courtesy}
  </td></tr>
</table>`;
}

function line(m: MatchedListing, token: string): string {
  const c = m.card;
  const label = m.event === "new" ? "" : `${EVENT_LABEL[m.event].toLowerCase()}: `;
  const bits = [usd(c.list_price), c.bedrooms_total != null ? `${c.bedrooms_total} bd` : null, c.bathrooms_total != null ? `${c.bathrooms_total} ba` : null].filter(Boolean).join(", ");
  return `<li style="margin:0 0 6px"><a href="${listingUrl(token, c.listing_key)}" style="color:${B.teal}">${esc(label)}${esc(bits)} &ndash; ${esc(address(m))}, ${esc(titleCase(c.city))}</a></li>`;
}

export function emailHtml(opts: {
  matches: MatchedListing[];
  token: string;
  firstName: string | null;
  agentName: string | null;
  agentPhone?: string | null;
  agentEmail?: string | null;
  searchSummary: string;
}): string {
  const { matches, token, firstName, agentName, searchSummary } = opts;
  const cards = matches.slice(0, EMAIL_CARD_LIMIT);
  const rest = matches.slice(EMAIL_CARD_LIMIT, EMAIL_CARD_LIMIT + EMAIL_LINE_LIMIT);
  const all = matchesUrl(token);
  const n = matches.length;
  const allNew = matches.every((m) => m.event === "new");
  const hasDrop = matches.some((m) => m.event === "price_drop");
  const hasBack = matches.some((m) => m.event === "back_on_market");
  const phone = opts.agentPhone || site.phone;
  const agentFirst = (agentName ?? "").split(/\s+/)[0];
  const nap = site.nap;
  const p = `margin:0 0 14px;font-family:${FONT};font-size:15px;line-height:1.6;color:${B.ink}`;
  return `
<div style="max-width:600px;margin:0;padding:8px 4px;font-family:${FONT};color:${B.ink}">
  <p style="${p}">Hi ${esc(firstName || "there")},</p>
  <p style="${p}">${allNew
    ? `${n === 1 ? "A home just" : `${n} homes just`} hit the market that ${n === 1 ? "fits" : "fit"} your search.`
    : `Here ${n === 1 ? "is one update on a home that fits" : `are ${n} updates on homes that fit`} your search.`}</p>
  <p style="${p}">We check the market for you around the clock, so you're seeing ${n === 1 ? "this one" : "these"} about as soon as ${n === 1 ? "it's" : "they're"} listed. ${hasDrop ? "One of these just came down in price, which is often a good time to take a closer look. " : ""}${hasBack ? "One is back on the market again. " : ""}Take a look at ${n === 1 ? "it" : "them"} below and see what stands out.</p>

  ${cards.map((m) => card(m, token)).join("")}

  ${rest.length ? `<p style="${p}">Also on your list:</p>
  <ul style="margin:0 0 14px;padding-left:20px;font-family:${FONT};font-size:14px;line-height:1.5">${rest.map((m) => line(m, token)).join("")}</ul>` : ""}

  <p style="${p}"><a href="${all}" style="color:${B.teal};font-weight:700">${n > cards.length ? `See all ${n} homes in one place` : "Open your matches in one place"} &rarr;</a></p>

  <p style="${p}">Not quite right? <a href="${adjustUrl(token)}" style="color:${B.teal};font-weight:700">Adjust the homes you're getting &rarr;</a>${searchSummary ? `<br><span style="font-size:12px;color:${B.muted}">Right now we're matching: ${esc(searchSummary)}</span>` : ""}</p>

  <p style="${p}">If one catches your eye, just reply to this email with the address and we'll set up a time for you to see it, or call or text me at <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}" style="color:${B.teal};text-decoration:none">${esc(phone)}</a>. Not sure yet? No pressure at all. We'll keep sending new homes as they come up, and you can change what you're looking for any time.</p>

  <p style="${p}">${esc(agentFirst || "The Land & Home Group")}<br>
  <span style="color:${B.muted};font-size:13px">${esc(site.name)} &middot; ${esc(site.brokerage)}</span></p>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;background:${B.teal};border-radius:10px">
    <tr><td style="padding:22px 24px;font-family:${FONT};font-size:12px;line-height:1.7;color:#CFE3E8">
      <a href="${SITE_URL}"><img src="${esc(site.logoUrl)}" alt="${esc(site.name)}" height="40" style="display:block;height:40px;width:auto;border:0;margin-bottom:12px"></a>
      <strong style="color:#ffffff;font-size:13px">${esc(site.name)}</strong> <span style="color:${B.aqua}">&middot;</span> ${esc(site.brokerage)}<br>
      ${esc(nap.street)}, ${esc(nap.city)}, ${esc(nap.region)} ${esc(nap.postalCode)}<br>
      <a href="tel:${esc(site.phone.replace(/[^\d+]/g, ""))}" style="color:${B.aqua};text-decoration:none">${esc(site.phone)}</a> <span style="color:${B.aqua}">&middot;</span> <a href="${esc(nap.website)}" style="color:${B.aqua};text-decoration:none">landhomegroup.com</a><br>
      <span style="display:block;margin-top:10px;font-size:11px;color:#9FC0C9">Equal Housing Opportunity &middot; Information deemed reliable but not guaranteed.</span>
      <a href="${all}#preferences" style="display:inline-block;margin-top:6px;font-size:10px;color:#8FB4C0;text-decoration:underline">Unsubscribe</a>
    </td></tr>
  </table>
</div>`;
}

export function smsText(opts: { count: number; token: string; firstName: string | null }): string {
  const { count, token, firstName } = opts;
  return `${firstName ? `Hi ${firstName}, ` : ""}${count} new ${count === 1 ? "home matches" : "homes match"} your search this week: ${matchesUrl(token)} Reply STOP to opt out.`;
}
