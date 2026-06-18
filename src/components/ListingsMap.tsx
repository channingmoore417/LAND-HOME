"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/listings";

const SWLA: [number, number] = [30.2272, -93.3336];

export interface MapBounds { s: number; n: number; w: number; e: number }

function priceLabel(n: number | null): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function pinIcon(label: string, active: boolean): L.DivIcon {
  return L.divIcon({
    className: "mappin-wrap",
    html: `<span class="mappin${active ? " is-active" : ""}">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Fit to the pins once, on first load only (don't fight the user's panning).
function FitOnce({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || pins.length === 0) return;
    done.current = true;
    const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [pins, map]);
  return null;
}

// Reports the visible bounds after the user pans/zooms (debounced upstream).
function MoveWatcher({ onMove }: { onMove?: (b: MapBounds) => void }) {
  const skip = useRef(true); // skip the initial programmatic fit
  useMapEvents({
    moveend(e) {
      if (!onMove) return;
      if (skip.current) { skip.current = false; return; }
      const b = e.target.getBounds();
      onMove({ s: b.getSouth(), n: b.getNorth(), w: b.getWest(), e: b.getEast() });
    },
  });
  return null;
}

export default function ListingsMap({
  pins,
  onBoundsChange,
  activeKey,
}: {
  pins: MapPin[];
  onBoundsChange?: (b: MapBounds) => void;
  activeKey?: string | null;
}) {
  return (
    <MapContainer center={SWLA} zoom={10} scrollWheelZoom className="lmap__canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitOnce pins={pins} />
      <MoveWatcher onMove={onBoundsChange} />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
        {pins.map((p) => {
          const showAddr = p.internet_address_yn !== false;
          const title = showAddr ? p.unparsed_address ?? p.city ?? "Home" : `${p.city ?? ""} Area`;
          return (
            <Marker
              key={p.listing_key}
              position={[p.latitude, p.longitude]}
              icon={pinIcon(priceLabel(p.list_price), activeKey === p.listing_key)}
            >
              <Popup>
                <div className="lmap__pop">
                  <div className="lmap__pop-price">{priceLabel(p.list_price)}</div>
                  <div className="lmap__pop-meta">
                    {p.bedrooms_total ?? "—"} bd · {p.bathrooms_total ?? "—"} ba ·{" "}
                    {p.living_area ? p.living_area.toLocaleString() : "—"} sqft
                  </div>
                  <div className="lmap__pop-addr">{title}</div>
                  <a className="lmap__pop-link" href={`/listings/${p.listing_key}`}>View home →</a>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
