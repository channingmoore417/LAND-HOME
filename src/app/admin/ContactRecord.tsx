"use client";

import { useCallback, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { usd } from "@/lib/format";

interface ListingLite { unparsed_address: string | null; list_price: number | null; city: string | null }
interface ViewRow { listing_key: string; views: number; last_viewed_at: string; listing: ListingLite | null }
interface OtherActivity { type: string; created_at: string; meta: Record<string, unknown> }
interface LeadRow { id: number; full_name: string | null; phone: string | null; source: string | null; listing_key: string | null; message: string | null; created_at: string }
interface ShowingRow { id: number; listing_key: string | null; preferred_times: string | null; status: string | null; created_at: string }
interface SearchRow { id: number; name: string | null; criteria: Record<string, unknown>; active: boolean; created_at: string }
interface FavoriteRow { id: number; listing_key: string; created_at: string; listing: ListingLite | null }
interface NoteRow { id: number; body: string; author_email: string | null; created_at: string }
interface ProfileRow { id: string; email: string | null; full_name: string | null; phone: string | null; created_at: string; is_admin: boolean | null }

interface ContactData {
  profile: ProfileRow | null;
  views: ViewRow[];
  otherActivity: OtherActivity[];
  leads: LeadRow[];
  showingRequests: ShowingRow[];
  savedSearches: SearchRow[];
  favorites: FavoriteRow[];
  notes: NoteRow[];
}

interface TimelineItem { key: string; kind: string; title: string; detail?: string; author?: string; created_at: string }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function telHref(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 10) return null;
  return `+${d.length === 10 ? "1" + d : d}`;
}

const ACTIVITY_LABELS: Record<string, string> = {
  search: "Searched listings",
  quiz: "Took the pre-approval quiz",
  guide: "Requested the buyer guide",
  valuation: "Requested a home valuation",
  save: "Saved a home",
  unsave: "Unsaved a home",
};

export default function ContactRecord({
  email,
  fallbackName,
  fallbackPhone,
  onBack,
}: {
  email: string;
  fallbackName?: string | null;
  fallbackPhone?: string | null;
  onBack: () => void;
}) {
  const [data, setData] = useState<ContactData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const authedFetch = useCallback(async (input: string, init?: RequestInit) => {
    const sb = getBrowserClient();
    const { data: s } = await sb.auth.getSession();
    const token = s.session?.access_token;
    return fetch(input, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await authedFetch(`/api/admin/contact?email=${encodeURIComponent(email)}`);
      if (!mounted) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Request failed (${res.status})`);
        return;
      }
      setData(await res.json());
    })();
    return () => { mounted = false; };
  }, [email, authedFetch]);

  async function addNote() {
    const body = note.trim();
    if (!body || savingNote) return;
    setSavingNote(true);
    const res = await authedFetch("/api/admin/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, note: body }),
    });
    setSavingNote(false);
    if (res.ok) {
      const { note: saved } = await res.json();
      setData((d) => (d ? { ...d, notes: [saved, ...d.notes] } : d));
      setNote("");
    }
  }

  if (error) {
    return (
      <div>
        <button className="adm-back" onClick={onBack}>← Back</button>
        <p className="prose" style={{ color: "var(--ink-muted)" }}>{error}</p>
      </div>
    );
  }

  const name = data?.profile?.full_name || fallbackName || data?.leads.find((l) => l.full_name)?.full_name || email;
  const phone = data?.profile?.phone || fallbackPhone || data?.leads.find((l) => l.phone)?.phone || null;
  const tel = telHref(phone);
  const isSignup = !!data?.profile;
  const initial = (name || email).trim().charAt(0).toUpperCase();

  const sources = [
    ...new Set([
      ...(data?.leads ?? []).map((l) => l.source).filter(Boolean),
      ...(isSignup ? ["website signup"] : []),
    ]),
  ] as string[];

  // One merged timeline, newest first: notes, forms, showings, searches,
  // favorites, and non-view activity (quiz/guide/valuation/searches).
  const timeline: TimelineItem[] = [
    ...(data?.notes ?? []).map((n) => ({
      key: `note-${n.id}`, kind: "Note", title: n.body, author: n.author_email ?? undefined, created_at: n.created_at,
    })),
    ...(data?.leads ?? []).map((l) => ({
      key: `lead-${l.id}`, kind: "Form", title: `Submitted ${l.source || "a form"}`,
      detail: l.message || (l.listing_key ? `Listing ${l.listing_key}` : undefined), created_at: l.created_at,
    })),
    ...(data?.showingRequests ?? []).map((s) => ({
      key: `showing-${s.id}`, kind: "Showing", title: "Requested a showing",
      detail: [s.listing_key ? `Listing ${s.listing_key}` : null, s.preferred_times].filter(Boolean).join(" · ") || undefined,
      created_at: s.created_at,
    })),
    ...(data?.savedSearches ?? []).map((s) => ({
      key: `search-${s.id}`, kind: "Search", title: `Saved a search${s.name ? `: ${s.name}` : ""}`,
      detail: JSON.stringify(s.criteria), created_at: s.created_at,
    })),
    ...(data?.favorites ?? []).map((f) => ({
      key: `fav-${f.id}`, kind: "Saved home", title: f.listing?.unparsed_address || f.listing_key,
      detail: f.listing?.list_price ? usd(f.listing.list_price) : undefined, created_at: f.created_at,
    })),
    ...(data?.otherActivity ?? []).map((a, i) => ({
      key: `act-${i}-${a.created_at}`, kind: "Activity", title: ACTIVITY_LABELS[a.type] || a.type, created_at: a.created_at,
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="adm-contact">
      <button className="adm-back" onClick={onBack}>← Back to list</button>

      <div className="adm-contact__grid">
        {/* Left: contact card */}
        <aside className="adm-card adm-contact__who">
          <div className="adm-avatar">{initial}</div>
          <h2 className="adm-contact__name">{name}</h2>
          <span className={`adm-chip ${isSignup ? "adm-chip--teal" : "adm-chip--gold"}`}>
            {isSignup ? "Registered user" : "Lead"}
          </span>
          <dl className="adm-kv">
            {tel && <><dt>Phone</dt><dd><a href={`tel:${tel}`}>{phone}</a></dd></>}
            {!tel && phone && <><dt>Phone</dt><dd>{phone}</dd></>}
            <dt>Email</dt><dd><a href={`mailto:${email}`}>{email}</a></dd>
            {sources.length > 0 && <><dt>Source</dt><dd>{sources.join(", ")}</dd></>}
            {data?.profile?.created_at && <><dt>Joined</dt><dd>{fmtDate(data.profile.created_at)}</dd></>}
          </dl>
        </aside>

        {/* Center: actions + note composer + timeline */}
        <section className="adm-contact__center">
          <div className="adm-card">
            <div className="adm-actions">
              {tel && <a className="adm-actbtn" href={`tel:${tel}`}>📞 Call</a>}
              {tel && <a className="adm-actbtn" href={`sms:${tel}`}>💬 Text</a>}
              <a className="adm-actbtn" href={`mailto:${email}`}>✉️ Email</a>
            </div>
            <textarea
              className="adm-notebox"
              placeholder="Add a note…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div style={{ textAlign: "right" }}>
              <button className="btn btn--primary adm-notesave" onClick={addNote} disabled={savingNote || !note.trim()}>
                {savingNote ? "Saving…" : "Create Note"}
              </button>
            </div>
          </div>

          <h3 className="adm-timeline__head">Timeline</h3>
          {!data ? (
            <p className="prose" style={{ color: "var(--ink-muted)" }}>Loading…</p>
          ) : timeline.length === 0 ? (
            <p className="prose" style={{ color: "var(--ink-muted)" }}>No activity yet.</p>
          ) : (
            <ul className="adm-timeline">
              {timeline.map((t) => (
                <li key={t.key} className="adm-timeline__item">
                  <span className={`adm-chip adm-chip--kind adm-chip--${t.kind === "Note" ? "gold" : "teal"}`}>{t.kind}</span>
                  <div>
                    <p className="adm-timeline__title">{t.title}</p>
                    {t.detail && <p className="adm-timeline__detail">{t.detail}</p>}
                    <p className="adm-timeline__meta">
                      {t.author ? `${t.author} · ` : ""}{fmtDate(t.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Right: website activity */}
        <aside className="adm-contact__activity">
          <div className="adm-card">
            <h3 className="adm-card__head">Website Activity</h3>
            <div className="adm-stats">
              <div className="adm-stat"><strong>{data?.views.length ?? 0}</strong><span>Viewed properties</span></div>
              <div className="adm-stat"><strong>{data?.favorites.length ?? 0}</strong><span>Saved homes</span></div>
              <div className="adm-stat"><strong>{data?.savedSearches.length ?? 0}</strong><span>Saved searches</span></div>
            </div>
            {!isSignup && (
              <p className="adm-card__note">Browsing history is only tracked for registered users.</p>
            )}
            {(data?.views.length ?? 0) > 0 && (
              <ul className="adm-viewlist">
                {data!.views.slice(0, 20).map((v) => (
                  <li key={v.listing_key}>
                    <a href={`/listings/${v.listing_key}`} target="_blank" rel="noreferrer">
                      {v.listing?.unparsed_address || v.listing_key}
                    </a>
                    <span>
                      {v.listing?.list_price ? `${usd(v.listing.list_price)} · ` : ""}
                      viewed {v.views}× · {fmtDate(v.last_viewed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
