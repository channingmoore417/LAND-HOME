import { getLiveClient } from "./supabase";
import type { Agent } from "./types";

// Team roster for the About and all-listings pages. Reads the public-read `agents` table
// (Supabase only — same architecture as listings). Edit the team by editing
// rows in the `agents` table; nothing here changes.
const AGENT_COLS = "id, slug, full_name, mls_id, title, email, phone, photo_url, bio, specialties, active";

export async function getTeam(): Promise<Agent[]> {
  const supabase = getLiveClient();
  const { data, error } = await supabase
    .from("agents")
    .select(AGENT_COLS)
    .eq("active", true)
    // sort_order pins the lineup (Lauren, then Karley); everyone else follows by id.
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true });

  if (error) return [];
  return (data ?? []) as Agent[];
}

/** One active agent by slug, with the agent-page extras (reviews, why_me). */
export async function getAgent(slug: string): Promise<Agent | null> {
  const { data } = await getLiveClient()
    .from("agents")
    .select(`${AGENT_COLS}, reviews, why_me`)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as Agent | null) ?? null;
}

export function firstName(a: Pick<Agent, "full_name">): string {
  return a.full_name.split(/\s+/)[0];
}
