import { useSyncExternalStore } from "react";

// Everything a lead should carry about the home it came from. Published by the
// listing page (see ListingContext), read by every property form, the capture
// gate included, so GoHighLevel's activity feed and our own lead record both
// say which home, where, and what it costs.
export interface PropertyInfo {
  key: string;
  address: string; // full label, e.g. "123 Main St, Lake Charles, LA 70601"
  url: string; // absolute listing URL
  price: string; // e.g. "$264,900"
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  mls: string | null;
}

/** One-line description used in lead messages: address · price · beds/baths · sqft · MLS# · url */
export function propertySummary(p: PropertyInfo): string {
  const parts = [
    p.address,
    p.price,
    p.beds != null || p.baths != null ? `${p.beds ?? "?"} bd / ${p.baths ?? "?"} ba` : null,
    p.sqft ? `${p.sqft.toLocaleString("en-US")} sqft` : null,
    p.mls ? `MLS# ${p.mls}` : null,
    p.url,
  ];
  return parts.filter(Boolean).join(" · ");
}

// Tiny external store: the layout-level capture gate sits outside the listing
// page, so the page publishes its property here and the gate subscribes.
let current: PropertyInfo | null = null;
const listeners = new Set<() => void>();

export function setCurrentProperty(p: PropertyInfo | null) {
  current = p;
  listeners.forEach((l) => l());
}
export const getCurrentProperty = () => current;

export function useCurrentProperty(): PropertyInfo | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => current,
    () => null,
  );
}
