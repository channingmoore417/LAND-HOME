import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Live address autocomplete via Photon (OpenStreetMap, no API key). Unlike the
// Census geocoder, Photon returns suggestions as you type. Biased toward
// Southwest Louisiana. Proxied server-side to avoid CORS.
const SWLA_LAT = 30.2272;
const SWLA_LON = -93.3336;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResult(f: any) {
  const p = f?.properties ?? {};
  if (p.countrycode && p.countrycode !== "US") return null;
  const city = p.city || p.town || p.village || p.locality || p.county || "";
  // IMPORTANT: never put a house number in the label. Photon often returns a
  // nearby/derived number that isn't the user's, which would override the one
  // they typed. We return just the street name + locality and let the client
  // prepend the user's own house number.
  const street = (p.street || p.name || "").replace(/^\s*\d+[A-Za-z-]*\s+/, "");
  const label = [street, city, p.state, p.postcode].filter(Boolean).join(", ");
  if (!label) return null;
  const coords = f?.geometry?.coordinates ?? [];
  return {
    address: label,
    street,
    lat: coords[1] ?? null,
    lng: coords[0] ?? null,
    city,
    state: p.state || "",
    zip: p.postcode || "",
  };
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 3) return NextResponse.json({ results: [] });

  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&limit=6&lang=en&lat=${SWLA_LAT}&lon=${SWLA_LON}`;

  try {
    const res = await fetch(url, { cache: "no-store", headers: { "User-Agent": "landhomegroup.com" } });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = ((data?.features as any[]) ?? [])
      .map(toResult)
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .slice(0, 6);
    return NextResponse.json({ results });
  } catch (e) {
    console.error("[geocode] failed:", (e as Error).message);
    return NextResponse.json({ results: [] });
  }
}
