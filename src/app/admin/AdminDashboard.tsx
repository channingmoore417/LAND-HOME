"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { usd } from "@/lib/format";
import ContactRecord from "./ContactRecord";

interface Lead {
  id: number;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  destination: string | null;
  listing_key: string | null;
  message: string | null;
  created_at: string;
}
interface ShowingRequest {
  id: number;
  listing_key: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_times: string | null;
  status: string | null;
  created_at: string;
}
interface SavedSearch {
  id: number;
  email: string | null;
  name: string | null;
  criteria: Record<string, unknown>;
  active: boolean;
  alert_frequency: string | null;
  created_at: string;
}
interface Favorite {
  id: number;
  email: string | null;
  listing_key: string;
  created_at: string;
  listing: { unparsed_address: string | null; list_price: number | null; city: string | null } | null;
}
interface Signup {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}
interface DashboardData {
  leads: Lead[];
  showingRequests: ShowingRequest[];
  savedSearches: SavedSearch[];
  favorites: Favorite[];
  signups: Signup[];
}

type Tab = "leads" | "contacts" | "showings" | "searches" | "favorites";

const TABS: { id: Tab; label: string }[] = [
  { id: "leads", label: "Leads" },
  { id: "contacts", label: "Contacts" },
  { id: "showings", label: "Showings" },
  { id: "searches", label: "Saved Searches" },
  { id: "favorites", label: "Saved Homes" },
];

const NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
function isNew(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < NEW_WINDOW_MS;
}

interface OpenContact { email: string; name?: string | null; phone?: string | null }

export default function AdminDashboard() {
  const { user, ready, openAuth, signOut } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("leads");
  const [contact, setContact] = useState<OpenContact | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) { setLoading(false); return; }
    let mounted = true;
    (async () => {
      const sb = getBrowserClient();
      const { data: sessionData } = await sb.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setLoading(false); return; }
      const res = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${token}` } });
      if (!mounted) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [ready, user]);

  // One inbox: every lead form + showing request, newest first.
  const inbox = useMemo(() => {
    if (!data) return [];
    return [
      ...data.leads.map((l) => ({
        key: `lead-${l.id}`, name: l.full_name, email: l.email, phone: l.phone,
        kind: l.source || "form", detail: l.message, created_at: l.created_at,
      })),
      ...data.showingRequests.map((s) => ({
        key: `showing-${s.id}`, name: s.full_name, email: s.email, phone: s.phone,
        kind: "showing request", detail: s.listing_key ? `Listing ${s.listing_key}` : null, created_at: s.created_at,
      })),
    ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [data]);

  // Contacts: every signup, plus form leads who never registered.
  const contacts = useMemo(() => {
    if (!data) return [];
    const byEmail = new Map<string, OpenContact & { kind: string; created_at: string }>();
    for (const s of data.signups) {
      if (!s.email) continue;
      byEmail.set(s.email.toLowerCase(), {
        email: s.email, name: s.full_name, phone: s.phone, kind: "Registered", created_at: s.created_at,
      });
    }
    for (const l of [...data.leads, ...data.showingRequests]) {
      if (!l.email) continue;
      const k = l.email.toLowerCase();
      if (!byEmail.has(k)) {
        byEmail.set(k, { email: l.email, name: l.full_name, phone: l.phone, kind: "Lead", created_at: l.created_at });
      }
    }
    return [...byEmail.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [data]);

  if (!ready || loading) {
    return <main className="admin"><div className="wrap"><p className="prose">Loading…</p></div></main>;
  }

  if (!user) {
    return (
      <main className="admin">
        <div className="wrap" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="section__title">Team Dashboard</h1>
          <p className="prose" style={{ color: "var(--ink-muted)" }}>Sign in with an admin account to continue.</p>
          <button className="btn btn--primary" style={{ maxWidth: 280, margin: "0 auto" }} onClick={() => openAuth()}>
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="admin">
        <div className="wrap" style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 className="section__title">Team Dashboard</h1>
          <p className="prose" style={{ color: "var(--ink-muted)" }}>{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const newLeadCount = inbox.filter((i) => isNew(i.created_at)).length;

  return (
    <main className="adm">
      <aside className="adm__side">
        <div className="adm__brand">Team Portal</div>
        <nav className="adm__nav">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`adm__navbtn${tab === t.id && !contact ? " is-active" : ""}`}
              onClick={() => { setTab(t.id); setContact(null); }}
            >
              {t.label}
              {t.id === "leads" && newLeadCount > 0 && <span className="adm-badge">{newLeadCount}</span>}
            </button>
          ))}
        </nav>
        <div className="adm__me">
          <span>{user.email}</span>
          <button onClick={signOut}>Sign out</button>
        </div>
      </aside>

      <section className="adm__main">
        {contact ? (
          <ContactRecord
            email={contact.email}
            fallbackName={contact.name}
            fallbackPhone={contact.phone}
            onBack={() => setContact(null)}
          />
        ) : (
          <>
            {tab === "leads" && (
              <>
                <h1 className="adm__title">Leads</h1>
                {inbox.length === 0 ? <p className="admin__empty">No leads yet — every form submission and showing request lands here.</p> : (
                  <ul className="adm-rows">
                    {inbox.map((i) => (
                      <li key={i.key}>
                        <button
                          className="adm-row"
                          disabled={!i.email}
                          onClick={() => i.email && setContact({ email: i.email, name: i.name, phone: i.phone })}
                        >
                          <div className="adm-row__who">
                            <strong>{i.name || i.email || "Unknown"}</strong>
                            <span>{i.email || "no email"}{i.phone ? ` · ${i.phone}` : ""}</span>
                          </div>
                          <div className="adm-row__what">
                            <span className="adm-chip adm-chip--teal">{i.kind}</span>
                            {i.detail && <span className="adm-row__detail">{i.detail}</span>}
                          </div>
                          <div className="adm-row__when">
                            {isNew(i.created_at) && <span className="adm-badge">NEW</span>}
                            {fmtDate(i.created_at)}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {tab === "contacts" && (
              <>
                <h1 className="adm__title">Contacts</h1>
                <ul className="adm-rows">
                  {contacts.map((c) => (
                    <li key={c.email}>
                      <button className="adm-row" onClick={() => setContact(c)}>
                        <div className="adm-row__who">
                          <strong>{c.name || c.email}</strong>
                          <span>{c.email}{c.phone ? ` · ${c.phone}` : ""}</span>
                        </div>
                        <div className="adm-row__what">
                          <span className={`adm-chip ${c.kind === "Registered" ? "adm-chip--teal" : "adm-chip--gold"}`}>{c.kind}</span>
                        </div>
                        <div className="adm-row__when">{fmtDate(c.created_at)}</div>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {tab === "showings" && (
              <>
                <h1 className="adm__title">Showing Requests</h1>
                {data.showingRequests.length === 0 ? <p className="admin__empty">No showing requests yet.</p> : (
                  <table className="admin__table">
                    <thead><tr><th>Name</th><th>Contact</th><th>Listing</th><th>Preferred Times</th><th>Status</th><th>Received</th></tr></thead>
                    <tbody>
                      {data.showingRequests.map((s) => (
                        <tr key={s.id} className="adm-clickrow" onClick={() => s.email && setContact({ email: s.email, name: s.full_name, phone: s.phone })}>
                          <td>{s.full_name || "—"}</td>
                          <td>{s.email || "—"}{s.phone ? ` · ${s.phone}` : ""}</td>
                          <td>{s.listing_key ? <a href={`/listings/${s.listing_key}`} onClick={(e) => e.stopPropagation()}>{s.listing_key}</a> : "—"}</td>
                          <td>{s.preferred_times || "—"}</td>
                          <td>{s.status || "new"}</td>
                          <td>{fmtDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {tab === "searches" && (
              <>
                <h1 className="adm__title">Saved Searches</h1>
                {data.savedSearches.length === 0 ? <p className="admin__empty">No saved searches yet.</p> : (
                  <table className="admin__table">
                    <thead><tr><th>Email</th><th>Name</th><th>Criteria</th><th>Alerts</th><th>Created</th></tr></thead>
                    <tbody>
                      {data.savedSearches.map((s) => (
                        <tr key={s.id} className="adm-clickrow" onClick={() => s.email && setContact({ email: s.email })}>
                          <td>{s.email || "—"}</td>
                          <td>{s.name || "—"}</td>
                          <td className="admin__msg">{JSON.stringify(s.criteria)}</td>
                          <td>{s.active ? s.alert_frequency ?? "on" : "off"}</td>
                          <td>{fmtDate(s.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}

            {tab === "favorites" && (
              <>
                <h1 className="adm__title">Saved Homes</h1>
                {data.favorites.length === 0 ? <p className="admin__empty">No saved homes yet.</p> : (
                  <table className="admin__table">
                    <thead><tr><th>Email</th><th>Listing</th><th>Price</th><th>Saved</th></tr></thead>
                    <tbody>
                      {data.favorites.map((f) => (
                        <tr key={f.id} className="adm-clickrow" onClick={() => f.email && setContact({ email: f.email })}>
                          <td>{f.email || "—"}</td>
                          <td>
                            <a href={`/listings/${f.listing_key}`} onClick={(e) => e.stopPropagation()}>
                              {f.listing?.unparsed_address || f.listing_key}
                            </a>
                          </td>
                          <td>{f.listing?.list_price ? usd(f.listing.list_price) : "—"}</td>
                          <td>{fmtDate(f.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
