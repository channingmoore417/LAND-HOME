"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { usd } from "@/lib/format";

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const { user, ready, openAuth } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="admin">
      <div className="wrap">
        <h1 className="section__title">Team Dashboard</h1>
        <p className="prose" style={{ color: "var(--ink-muted)", marginBottom: 30 }}>
          Signed in as {user.email}. Visible only to accounts flagged as admin.
        </p>

        <section className="admin__section">
          <h2>Leads ({data.leads.length})</h2>
          {data.leads.length === 0 ? <p className="admin__empty">No leads yet.</p> : (
            <table className="admin__table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Source</th><th>Message</th><th>Received</th></tr></thead>
              <tbody>
                {data.leads.map((l) => (
                  <tr key={l.id}>
                    <td>{l.full_name || "—"}</td>
                    <td>{l.email || "—"}</td>
                    <td>{l.phone || "—"}</td>
                    <td>{l.source || "—"}</td>
                    <td className="admin__msg">{l.message || "—"}</td>
                    <td>{fmtDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin__section">
          <h2>Showing Requests ({data.showingRequests.length})</h2>
          {data.showingRequests.length === 0 ? <p className="admin__empty">No showing requests yet.</p> : (
            <table className="admin__table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Listing</th><th>Preferred Times</th><th>Status</th><th>Received</th></tr></thead>
              <tbody>
                {data.showingRequests.map((s) => (
                  <tr key={s.id}>
                    <td>{s.full_name || "—"}</td>
                    <td>{s.email || "—"}</td>
                    <td>{s.phone || "—"}</td>
                    <td>{s.listing_key ? <a href={`/listings/${s.listing_key}`}>{s.listing_key}</a> : "—"}</td>
                    <td>{s.preferred_times || "—"}</td>
                    <td>{s.status || "new"}</td>
                    <td>{fmtDate(s.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="admin__section">
          <h2>Saved Searches ({data.savedSearches.length})</h2>
          {data.savedSearches.length === 0 ? <p className="admin__empty">No saved searches yet.</p> : (
            <table className="admin__table">
              <thead><tr><th>Email</th><th>Name</th><th>Criteria</th><th>Alerts</th><th>Created</th></tr></thead>
              <tbody>
                {data.savedSearches.map((s) => (
                  <tr key={s.id}>
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
        </section>

        <section className="admin__section">
          <h2>Favorites ({data.favorites.length})</h2>
          {data.favorites.length === 0 ? <p className="admin__empty">No saved homes yet.</p> : (
            <table className="admin__table">
              <thead><tr><th>Email</th><th>Listing</th><th>Price</th><th>Saved</th></tr></thead>
              <tbody>
                {data.favorites.map((f) => (
                  <tr key={f.id}>
                    <td>{f.email || "—"}</td>
                    <td>
                      <a href={`/listings/${f.listing_key}`}>
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
        </section>

        <section className="admin__section">
          <h2>Recent Signups ({data.signups.length})</h2>
          <table className="admin__table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead>
            <tbody>
              {data.signups.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name || "—"}</td>
                  <td>{s.email || "—"}</td>
                  <td>{s.phone || "—"}</td>
                  <td>{fmtDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}
