import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Address autocomplete via the free U.S. Census geocoder (no API key).
// Proxied server-side to avoid CORS. Returns up to 5 matched addresses with
// coordinates + city/state/ZIP parsed out.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 5) return NextResponse.json({ results: [] });

  const url =
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress` +
    `?address=${encodeURIComponent(q)}&benchmark=Public_AR_Current&format=json`;

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ results: [] });
    const data = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matches = (data?.result?.addressMatches as any[]) ?? [];
    const results = matches.slice(0, 5).map((m) => ({
      address: m.matchedAddress as string,
      lat: m.coordinates?.y ?? null,
      lng: m.coordinates?.x ?? null,
      city: m.addressComponents?.city ?? "",
      state: m.addressComponents?.state ?? "",
      zip: m.addressComponents?.zip ?? "",
    }));
    return NextResponse.json({ results });
  } catch (e) {
    console.error("[geocode] failed:", (e as Error).message);
    return NextResponse.json({ results: [] });
  }
}
