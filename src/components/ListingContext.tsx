"use client";

import { useEffect } from "react";
import { setCurrentProperty, type PropertyInfo } from "@/lib/propertyInfo";

// Rendered by the listing page: tells the layout-level capture gate which home
// the visitor is looking at.
export default function ListingContext({ property }: { property: PropertyInfo }) {
  const { key, address, url, price, beds, baths, sqft, mls } = property;
  useEffect(() => {
    setCurrentProperty({ key, address, url, price, beds, baths, sqft, mls });
    return () => setCurrentProperty(null);
  }, [key, address, url, price, beds, baths, sqft, mls]);
  return null;
}
