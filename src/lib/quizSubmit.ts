// Shared by the listing-gate quiz: answer options, the saved-search criteria,
// and the submit pipeline (lead -> /api/forms, account -> Supabase auth).
// Supabase is imported lazily so it never weighs on first paint.

export const COMMUNITIES = [
  "Lake Charles", "Sulphur", "Moss Bluff", "Iowa", "Vinton", "Cameron",
  "Ragley", "DeQuincy", "DeRidder", "Jennings", "Welsh", "Carlyss", "Westlake",
];
export const PRICE_BANDS: { label: string; min?: number; max?: number }[] = [
  { label: "Under $150k", max: 150000 },
  { label: "$150k–$250k", min: 150000, max: 250000 },
  { label: "$250k–$350k", min: 250000, max: 350000 },
  { label: "$350k–$500k", min: 350000, max: 500000 },
  { label: "$500k–$750k", min: 500000, max: 750000 },
  { label: "$750k+", min: 750000 },
];
export const BEDS = ["1+", "2+", "3+", "4+", "5+"];
export const BATHS = ["1+", "2+", "3+", "4+"];
export const STYLES = [
  { key: "single_story", label: "Single story" },
  { key: "pool", label: "Pool" },
  { key: "acre_plus", label: "Acreage" },
  { key: "waterfront", label: "Waterfront" },
  { key: "new_construction", label: "New construction" },
  { key: "shop", label: "Shop / workshop" },
];
export const OWNERSHIP = [
  { key: "rent", label: "No, I don't own a home" },
  { key: "own", label: "Yes, I own a home" },
  { key: "own_selling", label: "Yes, and I may sell it" },
];

import { adParams } from "@/lib/adVisit";

export const digits = (v: string) => v.replace(/\D/g, "");

export interface QuizAnswers {
  communities: string[]; price: string; beds: string; baths: string; styles: string[]; owns: string;
  firstName: string; lastName: string; email: string; phone: string;
}
export const EMPTY_ANSWERS: QuizAnswers = {
  communities: [], price: "", beds: "3+", baths: "2+", styles: [], owns: "",
  firstName: "", lastName: "", email: "", phone: "",
};

export function matchQuery(a: QuizAnswers): string {
  const p = new URLSearchParams();
  if (a.communities.length === 1) p.set("city", a.communities[0]);
  const b = parseInt(a.beds); if (b) p.set("beds", String(b));
  const ba = parseInt(a.baths); if (ba) p.set("baths", String(ba));
  const band = PRICE_BANDS.find((x) => x.label === a.price);
  if (band?.min) p.set("minPrice", String(band.min));
  if (band?.max) p.set("maxPrice", String(band.max));
  for (const f of a.styles) p.append("feature", f);
  return p.toString();
}

/** Posts the lead, then creates (or logs in) the account with phone as password. */
export async function submitQuiz(a: QuizAnswers, ctx: { listingKey?: string }): Promise<{ accountOk: boolean }> {
  const fullName = `${a.firstName.trim()} ${a.lastName.trim()}`.trim();
  const email = a.email.trim();
  const owns = OWNERSHIP.find((o) => o.key === a.owns)?.label ?? "—";
  const styles = a.styles.map((k) => STYLES.find((s) => s.key === k)?.label).filter(Boolean).join(", ") || "any";
  try {
    await fetch("/api/forms", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        form_id: "buyer_quiz",
        name: fullName, first_name: a.firstName.trim(), last_name: a.lastName.trim(), email, phone: a.phone,
        listing_key: ctx.listingKey,
        message: `Listing-gate quiz${adParams() ? " (paid ad)" : ""} · ${a.communities.join(", ")} · ${a.price || "any price"} · ${a.beds} bd / ${a.baths} ba · ${styles} · Owns home: ${owns}`,
        owns_home: a.owns,
        ad: adParams() ?? undefined, // gclid / utm_* for ad attribution
        criteria: { communities: a.communities, price: a.price, beds: a.beds, baths: a.baths, styles: a.styles, owns: a.owns },
        source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    });
  } catch { /* the lead is best-effort; never block the visitor */ }

  try {
    const { getBrowserClient } = await import("@/lib/supabaseBrowser");
    const sb = getBrowserClient();
    const pw = digits(a.phone);
    let { data, error } = await sb.auth.signUp({ email, password: pw, options: { data: { full_name: fullName, phone: a.phone } } });
    if (error || !data.session) {
      const r = await sb.auth.signInWithPassword({ email, password: pw });
      if (r.error) return { accountOk: false };
      data = { user: r.data.user, session: r.data.session };
    }
    const uid = data.user?.id;
    if (!uid) return { accountOk: false };
    await sb.from("profiles").update({ full_name: fullName, phone: a.phone }).eq("id", uid);
    await sb.from("saved_searches").insert({
      user_id: uid, email,
      name: `My search · ${a.communities.slice(0, 2).join(", ")}${a.communities.length > 2 ? " +" : ""}`,
      criteria: {
        city: a.communities.length === 1 ? a.communities[0] : undefined,
        communities: a.communities, price: a.price, beds: parseInt(a.beds) || undefined,
        baths: parseInt(a.baths) || undefined, features: a.styles, query: matchQuery(a),
      },
      alert_frequency: "instant", active: true,
    });
    return { accountOk: true };
  } catch { return { accountOk: false }; }
}
