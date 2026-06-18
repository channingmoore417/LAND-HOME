"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "@/lib/listings";

// Leaflet touches `window`, so the map is loaded client-side only.
const ListingsMap = dynamic(() => import("./ListingsMap"), {
  ssr: false,
  loading: () => <div className="lmap__loading">Loading map…</div>,
});

export default function ListingsMapClient({ pins }: { pins: MapPin[] }) {
  return <ListingsMap pins={pins} />;
}
