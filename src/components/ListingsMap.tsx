"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPin } from "@/lib/listings";

const SWLA: [number, number] = [30.2272, -93.3336];

function priceLabel(n: number | null): string {
  if (!n || n <= 0) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  return `$${Math.round(n / 1000)}K`;
}

function pinIcon(label: string): L.DivIcon {
  return L.divIcon({
    className: "mappin-wrap",
    html: `<span class="mappin">${label}</span>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

// Fit the map to the visible pins whenever the set changes.
function FitBounds({ pins }: { pins: MapPin[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [pins, map]);
  return null;
}

export default function ListingsMap({ pins }: { pins: MapPin[] }) {
  return (
    <MapContainer center={SWLA} zoom={10} scrollWheelZoom className="lmap__canvas">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds pins={pins} />
      <MarkerClusterGroup chunkedLoading showCoverageOnHover={false} maxClusterRadius={50}>
        {pins.map((p) => {
          const showAddr = p.internet_address_yn !== false;
          const title = showAddr ? p.unparsed_address ?? p.city ?? "Home" : `${p.city ?? ""} Area`;
          return (
            <Marker key={p.listing_key} position={[p.latitude, p.longitude]} icon={pinIcon(priceLabel(p.list_price))}>
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
