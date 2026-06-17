import { site } from "@/config/site";

// Per-property location map. Uses a Google Maps embed (no API key required),
// centered on the listing's coordinates. Respects the MLS internet-display
// flag: when the exact address may not be shown, we fall back to an
// approximate, city-level view with no precise pin.
export default function PropertyMap({
  latitude,
  longitude,
  label,
  city,
  state = "LA",
  precise = true,
}: {
  latitude: number | null;
  longitude: number | null;
  label: string;
  city: string;
  state?: string;
  precise?: boolean;
}) {
  const hasCoords = typeof latitude === "number" && typeof longitude === "number";

  // Precise: drop a pin on the rooftop. Approximate: center on the city.
  const q = precise && hasCoords
    ? `${latitude},${longitude}`
    : encodeURIComponent(`${city}, ${state}`);
  const z = precise && hasCoords ? 15 : 12;
  const src = `https://www.google.com/maps?q=${q}&z=${z}&hl=en&output=embed`;

  return (
    <div className="pmap">
      <iframe
        title={`Map of ${label}`}
        className="pmap__frame"
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="pmap__bar">
        <span className="pmap__pin">&#9679; {precise ? label : `${city}, ${state} area`}</span>
        {hasCoords && (
          <a
            className="pmap__link"
            href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            Open in Google Maps
          </a>
        )}
      </div>
      <p className="pmap__credit">Location shown is approximate. {site.name}.</p>
    </div>
  );
}
