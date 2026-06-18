import { getLiveClient } from "./supabase";
import type { Agent } from "./types";

// Team roster for the About page. Reads the public-read `agents` table
// (Supabase only — same architecture as listings). Edit the team by editing
// rows in the `agents` table; nothing here changes.
export async function getTeam(): Promise<Agent[]> {
  const supabase = getLiveClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, slug, full_name, mls_id, title, email, phone, photo_url, bio, specialties, active")
    .eq("active", true)
    .order("id", { ascending: true });

  if (error) return [];
  return (data ?? []) as Agent[];
}
