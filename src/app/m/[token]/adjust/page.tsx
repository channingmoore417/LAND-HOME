import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabase";
import { loadSearches } from "@/lib/alerts/engine";
import { normalizeCriteria } from "@/lib/alerts/criteria";
import { splitName } from "@/lib/alerts/ghl";
import type { Client } from "@/lib/alerts/types";
import AdjustForm, { type AdjustInitial } from "./AdjustForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Adjust Your Home Search",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdjustPage({ params }: { params: { token: string } }) {
  if (!/^[a-f0-9]{32}$/.test(params.token)) notFound();
  const admin = getAdminClient();
  const { data } = await admin.from("clients").select("*").eq("token", params.token).maybeSingle();
  const client = data as Client | null;
  if (!client) notFound();

  const { searches } = await loadSearches(admin, client.id);
  const main = searches.find((s) => s.source === "agent") ?? searches[0];
  const c = normalizeCriteria(main?.criteria);
  const initial: AdjustInitial = {
    cities: c.cities ?? [],
    priceMin: c.priceMin ? String(c.priceMin) : "",
    priceMax: c.priceMax ? String(c.priceMax) : "",
    bedsMin: c.bedsMin ? String(c.bedsMin) : "",
    bathsMin: c.bathsMin ? String(c.bathsMin) : "",
    type: c.type ?? "",
    features: c.features ?? [],
    freq: (["instant", "daily", "weekly"].includes(client.digest_frequency) ? client.digest_frequency : "weekly") as AdjustInitial["freq"],
  };

  return (
    <main className="results">
      <div className="wrap" style={{ maxWidth: 760 }}>
        <AdjustForm token={params.token} firstName={splitName(client.full_name).first} initial={initial} />
      </div>
    </main>
  );
}
