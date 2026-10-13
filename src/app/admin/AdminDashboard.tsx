"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import ContactRecord from "./ContactRecord";
import ClientSearches from "./ClientSearches";
import SetupClientSearch from "./SetupClientSearch";
import BuyerActivity, { type BAShowing, type BASearch, type BAFavorite } from "./BuyerActivity";

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
type ShowingRequest = BAShowing;
type SavedSearch = BASearch;
type Favorite = BAFavorite;
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

type Tab = "setup" | "leads" | "contacts" | "clients" | "showings" | "searches" | "favorites";

const TABS: { id: Tab; label: string }[] = [
  { id: "setup", label: "Set Up a Client Search" },
  { id: "leads", label: "Leads" },
  { id: "contacts", label: "Contacts" },
  { id: "clients", label: "Client Alerts" },
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
  // The ordered list the open contact came from, so the record can step
  // through it with previous / next arrows.
  const [navList, setNavList] = useState<OpenContact[]>([]);

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

  // Name + phone for every email we know, so activity tabs can show who it is.
  const identities = useMemo(() => {
    if (!data) return [];
    return [
      ...data.signups,
      ...data.leads,
      ...data.showingRequests,
    ].map((x) => ({ email: x.email, full_name: x.full_name, phone: x.phone }));
  }, [data]);

  // Open a contact; `list` is the visible list it was picked from (de-duped by email).
  function openContact(c: OpenContact, list: OpenContact[] = [c]) {
    const seen = new Set<string>();
    const uniq = list.filter((x) => {
      const k = x.email.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setNavList(uniq.some((x) => x.email.toLowerCase() === c.email.toLowerCase()) ? uniq : [c]);
    setContact(c);
  }

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

  const navIndex = contact ? navList.findIndex((x) => x.email.toLowerCase() === contact.email.toLowerCase()) : -1;
  const inboxContacts: OpenContact[] = inbox
    .filter((i) => i.email)
    .map((i) => ({ email: i.email as string, name: i.name, phone: i.phone }));
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
            position={navIndex >= 0 ? navIndex + 1 : undefined}
            total={navList.length}
            onPrev={navIndex > 0 ? () => setContact(navList[navIndex - 1]) : undefined}
            onNext={navIndex >= 0 && navIndex < navList.length - 1 ? () => setContact(navList[navIndex + 1]) : undefined}
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
                          onClick={() => i.email && openContact({ email: i.email, name: i.name, phone: i.phone }, inboxContacts)}
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
                      <button className="adm-row" onClick={() => openContact(c, contacts)}>
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

            {tab === "setup" && <SetupClientSearch onDone={() => setTab("clients")} />}
            {tab === "clients" && <ClientSearches onSetup={() => setTab("setup")} />}

            {(tab === "showings" || tab === "searches" || tab === "favorites") && (
              <>
                <h1 className="adm__title">{tab === "showings" ? "Showing Requests" : tab === "searches" ? "Saved Searches" : "Saved Homes"}</h1>
                <BuyerActivity
                  mode={tab}
                  showings={data.showingRequests}
                  searches={data.savedSearches}
                  favorites={data.favorites}
                  identities={identities}
                  onOpen={openContact}
                />
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
