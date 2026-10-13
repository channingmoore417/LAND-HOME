import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Click-through for listing links inside alert emails:
//   /m/<token>/<listingKey>  → log the click for that client, flag the browser
//   as a known contact (skips the sign-up gate), then redirect to the listing.
export async function GET(req: Request, { params }: { params: { token: string; listingKey: string } }) {
  const { token, listingKey } = params;
  const safeKey = encodeURIComponent(decodeURIComponent(listingKey));
  const dest = new URL(`/listings/${safeKey}`, req.url);

  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.redirect(dest);

  const admin = getAdminClient();
  const { data } = await admin.from("clients").select("id").eq("token", token).maybeSingle();
  if (data) {
    await admin.from("alert_events").insert({ client_id: data.id, type: "listing_click", listing_key: decodeURIComponent(listingKey) });
  }
  const res = NextResponse.redirect(dest);
  if (data) res.cookies.set("lhg_client", token, { path: "/", maxAge: 60 * 60 * 24 * 90, sameSite: "lax" });
  return res;
}
