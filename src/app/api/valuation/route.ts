import { NextResponse } from "next/server";
import { getLiveClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Home-value estimate. Calls the SECURITY DEFINER `home_value_estimate` RPC,
// which reads the locked sold_comps table and returns ONLY aggregates (a value
// range + comp count + $/sqft) — no raw sold data is ever exposed.
export async function POST(req: Request) {
  let body: { city?: string; zip?: string; livingArea?: number; beds?: number; baths?: number; lat?: number; lng?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.city) {
    return NextResponse.json({ error: "city is required" }, { status: 400 });
  }

  const supabase = getLiveClient();
  const { data, error } = await supabase.rpc("home_value_estimate", {
    p_city: body.city,
    p_zip: body.zip || null,
    p_living_area: body.livingArea && body.livingArea > 0 ? body.livingArea : null,
    p_beds: body.beds || null,
    p_baths: body.baths || null,
    p_lat: typeof body.lat === "number" ? body.lat : null,
    p_lng: typeof body.lng === "number" ? body.lng : null,
    p_property_type: "Residential",
  });

  if (error) {
    console.error("[valuation] rpc failed:", error.message);
    return NextResponse.json({ error: "Could not generate an estimate right now." }, { status: 500 });
  }
  return NextResponse.json(data);
}
