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
  back_on_market: { bg: B.teal, fg: "#FFFFFF" },
} as const;

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
  const st = EVENT_STYLE[m.event];
  const specs = [
    c.bedrooms_total != null ? `<b>${c.bedrooms_total}</b> bd` : null,
    c.bathrooms_total != null ? `<b>${c.bathrooms_total}</b> ba` : null,
    c.living_area ? `<b>${Math.round(c.living_area).toLocaleString("en-US")}</b> sqft` : null,
  ].filter(Boolean).join(` <span style="color:${B.aqua}">&bull;</span> `);
  const price =
    m.event === "price_drop" && m.oldPrice && c.list_price
      ? `${usd(c.list_price)} <span style="font-size:14px;font-weight:400;color:${B.muted};text-decoration:line-through">${usd(m.oldPrice)}</span>`
      : usd(c.list_price);
  const img = m.photo
    ? `<tr><td style="position:relative"><a href="${url}"><img src="${esc(m.photo)}" alt="" width="560" style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:16px 16px 0 0"></a></td></tr>`
    : "";
  const courtesy =
    !c.is_lhg_listing && c.list_office_name
      ? `<div style="font-size:11px;color:${B.muted};margin-top:12px">Listing provided courtesy of ${esc(c.list_office_name)}</div>`
      : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto 20px;border:1px solid ${B.line};border-radius:16px;background:#ffffff">
  ${img}
  <tr><td style="padding:18px 20px 20px;font-family:${FONT}">
    <span style="display:inline-block;background:${st.bg};color:${st.fg};font-size:11px;font-weight:700;letter-spacing:.08em;padding:4px 10px;border-radius:20px">${EVENT_LABEL[m.event]}</span>
    <div style="font-size:26px;font-weight:700;color:${B.teal};margin:10px 0 4px;letter-spacing:-.01em">${price}</div>
    <div style="font-size:15px;color:${B.ink}">${specs}</div>
    <div style="font-size:15px;color:${B.ink};margin-top:6px"><a href="${url}" style="color:${B.ink};text-decoration:none">${esc(address(m))}, ${esc(titleCase(c.city))}</a></div>
    ${m.why ? `<div style="font-size:12px;color:${B.muted};margin-top:8px">Why it matched: ${esc(m.why)}</div>` : ""}
    <div style="margin-top:16px"><a href="${url}" style="display:inline-block;background:${B.teal};color:#ffffff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:12px;text-decoration:none">View home &rarr;</a></div>
    ${courtesy}
  </td></tr>
</table>`;
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
  const shown = matches.slice(0, EMAIL_CARD_LIMIT);
  const more = matches.length - shown.length;
  const all = matchesUrl(token);
  const n = matches.length;
  const allNew = matches.every((m) => m.event === "new");
  const phone = opts.agentPhone || site.phone;
  const nap = site.nap;
  return `
<div style="background:${B.off};padding:0 0 28px;font-family:${FONT}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.teal}">
    <tr><td align="center" style="padding:22px 16px">
      <a href="${SITE_URL}"><img src="${esc(site.logoUrl)}" alt="${esc(site.name)}" height="46" style="display:block;height:46px;width:auto;border:0"></a>
    </td></tr>
  </table>

  <div style="max-width:560px;margin:0 auto;padding:30px 16px 8px">
    <div style="font-size:12px;font-weight:700;letter-spacing:.14em;color:${B.tealMid}">PICKED FOR YOU</div>
    <h1 style="margin:6px 0 10px;font-size:26px;line-height:1.25;font-weight:700;color:${B.teal};letter-spacing:-.01em">${esc(firstName ? `${firstName}, ` : "")}${allNew ? `${n} ${n === 1 ? "home just hit" : "homes just hit"} the market that ${n === 1 ? "fits" : "fit"} your search` : `${n} ${n === 1 ? "home" : "homes"} to see for your search`}</h1>
    ${searchSummary ? `<p style="margin:0 0 4px;font-size:14px;color:${B.muted}">Your search: ${esc(searchSummary)}</p>` : ""}
  </div>

  <div style="padding:14px 16px 0">
    ${shown.map((m) => card(m, token)).join("")}
  </div>

  <div style="max-width:560px;margin:4px auto 0;padding:0 16px;text-align:center">
    <a href="${all}" style="display:block;background:${B.aqua};color:${B.tealDeep};font-size:16px;font-weight:700;padding:16px 26px;border-radius:12px;text-decoration:none">${more > 0 ? `See all ${n} homes` : "Open all your matches"}</a>
  </div>

  <div style="max-width:560px;margin:26px auto 0;padding:0 16px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${B.sand};border-radius:16px">
      <tr><td style="padding:20px 22px;font-size:15px;line-height:1.55;color:${B.ink}">
        <strong style="color:${B.teal}">Want to see one in person?</strong><br>
        Just reply to this email${agentName ? ` and ${esc(agentName)}` : ""} will set it up, or call <a href="tel:${esc(phone.replace(/[^\d+]/g, ""))}" style="color:${B.teal};font-weight:700;text-decoration:none">${esc(phone)}</a>.
      </td></tr>
    </table>
  </div>

  <div style="max-width:560px;margin:26px auto 0;padding:0 16px;text-align:center;font-size:12px;line-height:1.7;color:${B.muted}">
    <strong style="color:${B.teal}">${esc(site.name)}</strong> &middot; ${esc(site.brokerage)}<br>
    ${esc(nap.street)}, ${esc(nap.city)}, ${esc(nap.region)} ${esc(nap.postalCode)}<br>
    <a href="${all}" style="color:${B.tealMid}">Change or pause your alerts</a><br>
    <span style="font-size:11px">Equal Housing Opportunity &middot; Information deemed reliable but not guaranteed.</span>
  </div>
</div>`;
}

export function smsText(opts: { count: number; token: string; firstName: string | null }): string {
  const { count, token, firstName } = opts;
  return `${firstName ? `Hi ${firstName}, ` : ""}${count} new ${count === 1 ? "home matches" : "homes match"} your search this week: ${matchesUrl(token)} Reply STOP to opt out.`;
}
