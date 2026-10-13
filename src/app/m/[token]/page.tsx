import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingCard from "@/components/ListingCard";
import { getAdminClient } from "@/lib/supabase";
import { findMatches, loadSearches } from "@/lib/alerts/engine";
import { splitName } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";
import AlertPrefs from "./AlertPrefs";
import ClientPass from "./ClientPass";
import { site } from "@/config/site";

// Personal "your new homes" page that the alert email + weekly text link to.
// Keyed by the client's private token (no login), so it is never indexed,
// never cached, and never puts a street address in the URL.
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your New Home Matches",
  robots: { index: false, follow: false, nocache: true },
};

export default async function MatchesPage({ params }: { params: { token: string } }) {
  if (!/^[a-f0-9]{32}$/.test(params.token)) notFound();
  const admin = getAdminClient();

  const { data } = await admin.from("clients").select("*").eq("token", params.token).maybeSingle();
  const client = data as Client | null;
  if (!client) notFound();

  const [{ searches, summary }, agentRes] = await Promise.all([
    loadSearches(admin, client.id),
    client.agent_id
      ? admin.from("agents").select("full_name, email, phone, photo_url").eq("id", client.agent_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const matches = await findMatches(admin, client, searches, { lookbackDays: 7 });
  const agent = agentRes.data as { full_name: string | null; email: string | null; phone: string | null } | null;

  await admin.from("alert_events").insert({ client_id: client.id, type: "page_view" });

  const { first } = splitName(client.full_name);
  const drops = matches.filter((m) => m.event === "price_drop").length;

  return (
    <main className="results">
      <ClientPass token={params.token} />
      <div className="wrap">
        <span className="script">picked for you</span>
        <h1 className="section__title">{first ? `${first}, here's what's new this week` : "Here's what's new this week"}</h1>
        {summary && <p className="prose" style={{ color: "var(--ink-muted)", marginTop: -8 }}>Your search: {summary}</p>}

        {matches.length === 0 ? (
          <p className="prose">
            Nothing new has matched in the last 7 days. We check every 15 minutes and will email you the moment something does.
          </p>
        ) : (
          <>
            <p className="prose">
              {matches.length} {matches.length === 1 ? "home" : "homes"}{drops ? ` (${drops} with a price drop)` : ""} from the last 7 days.
            </p>
            <div className="listings__grid">
              {matches.map((m) => <ListingCard key={m.card.listing_key} c={m.card} />)}
            </div>
          </>
        )}

        <div style={{ marginTop: 40, display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center", justifyContent: "space-between" }}>
          <div className="prose">
            <strong>{agent?.full_name ?? "Your agent"}</strong>
            <div style={{ color: "var(--ink-muted)" }}>
              {agent?.phone ?? site.phone}{(agent?.email ?? site.email) ? ` · ${agent?.email ?? site.email}` : ""}
            </div>
          </div>
        </div>

        <AlertPrefs token={params.token} enabled={client.alerts_enabled} sms={client.sms_weekly} />
      </div>
    </main>
  );
}
