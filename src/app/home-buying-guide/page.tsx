"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

// TODO: point this at the real guide file (PDF). Drop the URL here and the
// page captures the lead, then downloads/opens this guide.
const GUIDE_URL = "/home-buyers-guide.pdf";

const TIMELINES = ["Just exploring", "0–3 months", "3–6 months", "6–12 months", "12+ months"];

export default function BuyingGuidePage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [timeline, setTimeline] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  function openGuide() {
    if (typeof window !== "undefined") window.open(GUIDE_URL, "_blank", "noopener");
  }

  async function submit() {
    setErr("");
    if (!firstName || !lastName || !email || !phone || !timeline) {
      setErr("Please complete every field so we can send your guide.");
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "buyer_guide",
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          message: `Home Buyer's Guide download · buying timeline: ${timeline}`,
          criteria: { timeline },
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* still let them download */ }
    setDone(true);
    setLoading(false);
    openGuide();
  }

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Home Buyer&apos;s Guide
          </nav>
          <span className="hero__script">free download</span>
          <h1>The Southwest Louisiana Home Buyer&apos;s Guide</h1>
          <p className="hero__sub">
            Everything you need to buy with confidence — from getting pre-approved to closing day —
            written for buyers right here in SWLA. Tell us where to send it and it&apos;s yours, free.
          </p>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap guide">
          <div className="guide__copy">
            <span className="script">what&apos;s inside</span>
            <h2 className="section__title">Your step-by-step buying playbook</h2>
            <ul className="guide__list">
              <li><b>Get pre-approved first</b><span>Know your budget and make stronger offers.</span></li>
              <li><b>Choose your area</b><span>Honest local insight on every SWLA community.</span></li>
              <li><b>Tour &amp; make an offer</b><span>What to look for and how to compete.</span></li>
              <li><b>Inspection &amp; closing</b><span>Every step from accepted offer to keys.</span></li>
              <li><b>What to budget for</b><span>Closing costs, insurance, taxes — no surprises.</span></li>
            </ul>
          </div>

          <div className="hv-card guide__form">
            {!done ? (
              <>
                <h2 className="wiz__q">Where should we send your guide?</h2>
                <div className="hv-grid hv-grid--2">
                  <div className="field"><label>First Name</label>
                    <input className="input" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
                  <div className="field"><label>Last Name</label>
                    <input className="input" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
                </div>
                <div className="hv-grid hv-grid--2">
                  <div className="field"><label>Email</label>
                    <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="field"><label>Phone</label>
                    <input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                </div>
                <div className="field"><label>When are you looking to buy?</label>
                  <div className="qsel" style={{ width: "100%" }}>
                    <select value={timeline} style={{ width: "100%" }} onChange={(e) => setTimeline(e.target.value)}>
                      <option value="">Select…</option>
                      {TIMELINES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {err && <p className="hv-err">{err}</p>}
                <button type="button" className="btn btn--primary" onClick={submit} disabled={loading}>
                  {loading ? "Preparing your guide…" : "Download the Free Guide"}
                </button>
                <p className="hv-fine">By submitting you agree to be contacted by {site.name}. No spam, and you can opt out anytime.</p>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <span className="script" style={{ fontSize: "1.6rem" }}>thank you, {firstName}!</span>
                <h2 className="wiz__q" style={{ marginTop: 6 }}>Your guide is downloading</h2>
                <p className="prose" style={{ color: "var(--ink-muted)" }}>
                  If it didn&apos;t open automatically, tap below. We&apos;ll also be in touch to help with
                  your move whenever you&apos;re ready.
                </p>
                <button type="button" className="btn btn--primary" onClick={openGuide}>Download the Guide</button>
                <div className="home-cta" style={{ marginTop: 16 }}>
                  <Link className="btn btn--ghost" href="/listings">Browse Homes</Link>
                  <Link className="btn btn--ghost" href="/buy">Explore Buying in SWLA</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
