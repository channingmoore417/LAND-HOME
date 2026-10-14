"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import ContactRecord, { cleanMessage } from "./ContactRecord";
import ClientSearches from "./ClientSearches";
import SetupClientSearch, { type SetupPrefill } from "./SetupClientSearch";
import BuyerActivity, { type BAShowing, type BASearch, type BAFavorite, type ListingCtx } from "./BuyerActivity";

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
  listing?: ListingCtx | null;
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

// The sidebar. Add a page = one line here (+ a render block below). A group
// with `children` becomes a collapsible section; the one holding the open page auto-expands.
type NavItem = { id: Tab; label: string } | { group: string; children: { id: Tab; label: string }[] };
const NAV: NavItem[] = [
  { group: "People", children: [
    { id: "leads", label: "Leads" },
    { id: "contacts", label: "Contacts" },
  ] },
  { group: "Buyer Activity", children: [
    { id: "showings", label: "Showings" },
    { id: "searches", label: "Saved Searches" },
    { id: "favorites", label: "Saved Homes" },
  ] },
  { group: "Client Alerts", children: [
    { id: "setup", label: "Set Up a Client Search" },
    { id: "clients", label: "Client Alerts" },
  ] },
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
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("leads");
  const [contact, setContact] = useState<OpenContact | null>(null);
  // A contact being turned into a client search: pre-fills the setup flow. `key` forces a fresh form each time.
  const [prefill, setPrefill] = useState<{ key: number; data?: SetupPrefill }>({ key: 0 });
  function startSetup(data?: SetupPrefill) {
    setPrefill((p) => ({ key: p.key + 1, data }));
    setContact(null);
    setTab("setup");
  }
  // Groups the user collapsed, remembered per browser (never required to render).
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => {
    try { setCollapsed(JSON.parse(localStorage.getItem("adm-collapsed") || "[]")); } catch { /* ignore */ }
  }, []);
  function toggleGroup(g: string) {
    setCollapsed((cur) => {
      const next = cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g];
      try { localStorage.setItem("adm-collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }
  // The ordered list the open contact came from, so the record can step
  // through it with previous / next arrows.
  const [navList, setNavList] = useState<OpenContact[]>([]);

  // Fetch dashboard data. `silent` refreshes in place (no spinner) so a lead that
  // arrives while the page is open shows up without a manual reload.
  const load = useCallback(async (silent = false) => {
    if (!user) { setLoading(false); return; }
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const sb = getBrowserClient();
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) { setLoading(false); setRefreshing(false); return; }
    const res = await fetch("/api/admin/data", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) {
      if (!silent) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Request failed (${res.status})`);
      }
    } else {
      setData(await res.json());
      setUpdatedAt(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    if (!ready) return;
    load();
  }, [ready, load]);

  // Keep it fresh: every 2 minutes, and whenever the tab/app comes back into view.
  useEffect(() => {
    if (!user) return;
    const t = setInterval(() => load(true), 120_000);
    const onVisible = () => { if (document.visibilityState === "visible") load(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVisible); };
  }, [user, load]);

  // One inbox: every lead form + showing request, newest first. Raw tracking
  // URLs and MLS filler stay out of it — a short form label, a clean page path
  // or message, and a "Google Ads" tag when the visit came from an ad.
  const inbox = useMemo(() => {
    if (!data) return [];
    const FORM_CHIP: Record<string, string> = {
      listing_inquiry: "Property inquiry", ad_capture: "Ads registration", buyer_quiz: "Buyer quiz", buyer_guide: "Buyer guide",
      mortgage_preapproval: "Pre-approval", home_valuation: "Home value", cash_offer: "Cash offer", contact: "Contact",
    };
    // A page address as plain words ("Lake Charles · Homes for sale"), never a URL.
    const pageOf = (src: string | null) => {
      if (!src) return null;
      try {
        const words = decodeURIComponent(new URL(src, "https://x.test").pathname).split("/").filter(Boolean)
          .filter((w) => !/^\d+$/.test(w))
          .map((w) => w.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase()));
        return words.length ? words.join(" · ") : null;
      } catch { return null; }
    };
    const addrOf = (l: { listing?: ListingCtx | null }) => l.listing?.unparsed_address ?? null;
    return [
      ...data.leads.map((l) => ({
        key: `lead-${l.id}`, name: l.full_name, email: l.email, phone: l.phone,
        kind: FORM_CHIP[l.destination ?? ""] ?? "Form",
        ad: /gclid|gbraid|wbraid|gad_source|utm_source=google/i.test(l.source ?? ""),
        detail: addrOf(l) ?? cleanMessage(l.message) ?? pageOf(l.source),
        href: l.listing_key && addrOf(l) ? `/listings/${l.listing_key}` : undefined,
        created_at: l.created_at,
      })),
      ...data.showingRequests.map((s) => ({
        key: `showing-${s.id}`, name: s.full_name, email: s.email, phone: s.phone,
        kind: "Showing request", ad: false,
        detail: addrOf(s), href: s.listing_key && addrOf(s) ? `/listings/${s.listing_key}` : undefined, created_at: s.created_at,
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
          {NAV.map((item) => {
            const btn = (t: { id: Tab; label: string }, sub = false) => (
              <button
                key={t.id}
                className={`adm__navbtn${sub ? " adm__navbtn--sub" : ""}${tab === t.id && !contact ? " is-active" : ""}`}
                onClick={() => { if (t.id === "setup") { startSetup(); return; } setTab(t.id); setContact(null); }}
              >
                {t.label}
                {t.id === "leads" && newLeadCount > 0 && <span className="adm-badge">{newLeadCount}</span>}
              </button>
            );
            if ("id" in item) return btn(item);
            // Always open while it holds the page being viewed.
            const holdsActive = item.children.some((c) => c.id === tab);
            const isOpen = holdsActive || !collapsed.includes(item.group);
            return (
              <div key={item.group} className="adm__group">
                <button
                  className="adm__grouphead"
                  aria-expanded={isOpen}
                  onClick={() => !holdsActive && toggleGroup(item.group)}
                >
                  {item.group}
                  <i aria-hidden="true">{isOpen ? "▾" : "▸"}</i>
                </button>
                {isOpen && <div className="adm__sub">{item.children.map((c) => btn(c, true))}</div>}
              </div>
            );
          })}
        </nav>
        <div className="adm__me">
          <span>{user.email}</span>
          <button onClick={() => load(true)} disabled={refreshing}>
            {refreshing ? "Refreshing…" : updatedAt ? `Refresh · updated ${updatedAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Refresh"}
          </button>
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
            onSetupSearch={startSetup}
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
                            {i.ad && <span className="adm-chip adm-chip--gold">Google Ads</span>}
                            {i.detail && (i.href
                              ? <span className="adm-row__detail adm-row__link" role="link" tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); window.open(i.href, "_blank", "noopener"); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); window.open(i.href, "_blank", "noopener"); } }}>{i.detail}</span>
                              : <span className="adm-row__detail">{i.detail}</span>)}
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

            {tab === "setup" && <SetupClientSearch key={prefill.key} prefill={prefill.data} onDone={() => { setPrefill((p) => ({ key: p.key + 1 })); setTab("clients"); }} />}
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
