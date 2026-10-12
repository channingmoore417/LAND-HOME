import { useSyncExternalStore } from "react";

// Everything a lead should carry about the home it came from. Published by the
// listing page (see ListingContext), read by every property form, the capture
// gate included, so GoHighLevel's activity feed and our own lead record both
// say which home, where, and what it costs.
export interface PropertyInfo {
  key: string;
  address: string; // full label, e.g. "123 Main St, Lake Charles, LA 70601"
  street: string | null; // "123 Main St" (null when the listing hides its address)
  city: string | null;
  state: string | null;
  zip: string | null;
  url: string; // clean absolute listing URL (no tracking parameters)
  price: string; // e.g. "$264,900"
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  mls: string | null;
}

/** The property as separate webhook / form fields (street, city, state, zip, clean URL, price, ...). */
export function propertyPayload(p: PropertyInfo): Record<string, string | number> {
  const f: Record<string, string | number | null> = {
    listing_key: p.key,
    property_address: p.address,
    property_street: p.street,
    property_city: p.city,
    property_state: p.state,
    property_zip: p.zip,
    property_url: p.url,
    property_price: p.price,
    property_bedrooms: p.beds,
    property_bathrooms: p.baths,
    property_sqft: p.sqft,
    property_mls: p.mls,
  };
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v != null && v !== "")) as Record<string, string | number>;
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
