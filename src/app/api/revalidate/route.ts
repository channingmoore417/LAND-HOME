import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export const runtime = "nodejs";

// ============================================================
// On-demand revalidation. The trestle-sync calls this right after it writes
// to Supabase, so a new listing / price change / status change goes live in
// SECONDS instead of waiting out the ISR window. Unchanged pages are left
// cached. Auth via a shared secret (REVALIDATE_SECRET).
//
//   POST /api/revalidate?secret=...        { "listing_key": "1146589207" }
//   (or header x-revalidate-secret: ...)   { "paths": ["/listings/123"] }
// ============================================================

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  const url = new URL(req.url);
  const provided = url.searchParams.get("secret") || req.headers.get("x-revalidate-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { listing_key?: string; listing_keys?: string[]; paths?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    // empty body is fine — we still refresh the index/home below
  }

  const revalidated: string[] = [];
  const touch = (p: string) => {
    revalidatePath(p);
    revalidated.push(p);
  };

  // New/changed inventory affects the home + search listing counts.
  touch("/");
  touch("/listings");

  if (body.listing_key) touch(`/listings/${body.listing_key}`);
  for (const k of body.listing_keys ?? []) touch(`/listings/${k}`);
  for (const p of body.paths ?? []) touch(p);

  return NextResponse.json({ ok: true, revalidated, at: new Date().toISOString() });
}
