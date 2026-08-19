import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getPublicClient, getAdminClient } from "@/lib/supabase";

// Shared guard for every /api/admin/* route: verifies the caller's Supabase
// access token, then requires profiles.is_admin. Returns the service-role
// client only after both checks pass — never let it out otherwise, the
// tables it reads hold visitor PII.
export async function requireAdmin(
  req: Request,
): Promise<{ admin: SupabaseClient; user: User } | { failure: NextResponse }> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) {
    return { failure: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const { data: userData, error: userErr } = await getPublicClient().auth.getUser(token);
  if (userErr || !userData.user) {
    return { failure: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }

  const admin = getAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!profile?.is_admin) {
    return { failure: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }

  return { admin, user: userData.user };
}
