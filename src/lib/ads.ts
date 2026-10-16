// Google Ads web conversion: "Google Buyer Registration" (AW-11288252520).
// The Google tag (gtag.js) is loaded site-wide in the root layout; this fires the conversion
// once, right after an AD visitor completes the forced registration (listing gate form, buyer
// quiz, or one-tap sign-in + phone). Organic visitors never fire it.
const SEND_TO = "AW-11288252520/XZKHCNOSzp4dEOig1IYq";

export function trackBuyerRegistration(fromAd: boolean) {
  if (!fromAd) return; // only visitors who came in through the Homes For Sale ad
  try {
    (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag?.("event", "conversion", {
      send_to: SEND_TO,
      value: 1.0,
      currency: "USD",
    });
  } catch { /* analytics must never break registration */ }
}
