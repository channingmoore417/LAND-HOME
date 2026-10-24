// Google Ads web conversion: "Google Buyer Registration" (account AW-18503605520).
// The Google tag (gtag.js) is loaded site-wide in the root layout; this fires the conversion
// once, right after an AD visitor completes the forced registration (listing gate form, buyer
// quiz, or one-tap sign-in + phone). Organic visitors never fire it.
// The conversion label comes from the new account's conversion action (Goals > Conversions >
// the action's "Tag setup" > event snippet: send_to 'AW-18503605520/<label>'). Set only the
// <label> part in NEXT_PUBLIC_GADS_CONVERSION_LABEL; until it is set nothing is sent.
const LABEL = process.env.NEXT_PUBLIC_GADS_CONVERSION_LABEL;
const SEND_TO = LABEL ? `AW-18503605520/${LABEL}` : "";

export function trackBuyerRegistration(fromAd: boolean) {
  if (!fromAd || !SEND_TO) return; // only visitors who came in through the Homes For Sale ad
  try {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "conversion", {
      send_to: SEND_TO,
      value: 1.0,
      currency: "USD",
    });
  } catch { /* analytics must never break registration */ }
}
