"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

// Post-closing review page. Collects a rating + feedback from EVERY client
// (posted to /api/forms as form_id "review"), then shows EVERY client the
// Google review link — no star-gating, which Google's review policy forbids.
// The private message still reaches the team via the unified forms webhook,
// so unhappy clients get a follow-up call either way.

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Great", "Excellent"];

export default function ReviewsPage() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const loadedAt = useRef<number>(Date.now());
  const honeypot = useRef<HTMLInputElement>(null);

  async function submit() {
    setErr("");
    if (!rating) { setErr("Please tap a star rating first."); return; }
    if (!name.trim() || !feedback.trim()) {
      setErr("Please add your name and a few words about your experience.");
      return;
    }
    setBusy(true);
    try {
      await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_id: "review",
          name: name.trim(),
          email: email.trim() || undefined,
          message: `${rating}-star client review · ${feedback.trim()}`,
          criteria: { rating, feedback: feedback.trim() },
          // Spam signals (enforced server-side in /api/forms):
          company: honeypot.current?.value || "",
          form_loaded_at: loadedAt.current,
          source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
        }),
      });
    } catch { /* still show the Google step */ }
    setBusy(false);
    setDone(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyAndOpen() {
    try {
      await navigator.clipboard.writeText(feedback.trim());
      setCopied(true);
    } catch { /* clipboard is a convenience, not a requirement */ }
    window.open(site.localSeo.writeReviewUrl, "_blank", "noopener");
  }

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Reviews
          </nav>
          <div className="guidehero">
            <div className="guidehero__copy">
              <span className="hero__script">we&apos;d love your feedback</span>
              <h1>How Did We Do?</h1>
              <p className="hero__sub">
                Thank you for trusting {site.name} with your move. Your honest feedback takes two
                minutes and means the world to our small local team.
              </p>
              <ul className="guidehero__points">
                <li>✓ Two minutes, start to finish</li>
                <li>✓ Every message is read by Lauren &amp; the team</li>
                <li>✓ Helps SWLA neighbors find an agent they can trust</li>
              </ul>
            </div>

            <div className="hv-card guidehero__form">
              {!done ? (
                <>
                  <h2 className="wiz__q">Rate your experience</h2>
                  {/* Honeypot — hidden from real users. */}
                  <div className="hp-field" aria-hidden="true">
                    <label htmlFor="company">Company (leave this blank)</label>
                    <input ref={honeypot} type="text" id="company" name="company" tabIndex={-1} autoComplete="off" />
                  </div>
                  <div className="rv-stars" role="radiogroup" aria-label="Star rating">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={rating === n}
                        aria-label={`${n} star${n > 1 ? "s" : ""} — ${RATING_LABELS[n]}`}
                        className={`rv-star${(hover || rating) >= n ? " is-on" : ""}`}
                        onMouseEnter={() => setHover(n)}
                        onMouseLeave={() => setHover(0)}
                        onClick={() => setRating(n)}
                      >
                        ★
                      </button>
                    ))}
                    <span className="rv-stars__label">{RATING_LABELS[hover || rating]}</span>
                  </div>
                  <div className="hv-grid hv-grid--2">
                    <div className="field"><label>Your Name</label>
                      <input className="input" type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} /></div>
                    <div className="field"><label>Email <span className="rv-opt">(optional)</span></label>
                      <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  </div>
                  <div className="field"><label>Tell us about your experience</label>
                    <textarea className="input" rows={5} value={feedback} onChange={(e) => setFeedback(e.target.value)}
                      placeholder="What was buying or selling with us like? A sentence or two is perfect…" /></div>
                  {err && <p className="hv-err">{err}</p>}
                  <button type="button" className="btn btn--primary" onClick={submit} disabled={busy} style={{ width: "100%" }}>
                    {busy ? "Sending…" : "Send My Feedback"}
                  </button>
                  <p className="hv-fine">
                    Your feedback goes straight to our team. On the next step you can also share it
                    publicly on Google if you&apos;d like.
                  </p>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <span className="script" style={{ fontSize: "1.6rem" }}>thank you{name ? `, ${name.split(" ")[0]}` : ""}!</span>
                  <h2 className="wiz__q" style={{ marginTop: 6 }}>Your feedback is in</h2>
                  <p className="prose" style={{ color: "var(--ink-muted)" }}>
                    Lauren and the team read every single message. If anything about your experience
                    fell short, we&apos;ll reach out personally to make it right.
                  </p>
                  <p className="prose" style={{ color: "var(--ink-muted)" }}>
                    Would you take one more minute to share your experience publicly? Google reviews
                    are the #1 way SWLA neighbors find us
                    {feedback.trim() ? " — we'll copy your words to paste right in" : ""}.
                  </p>
                  <button type="button" className="btn btn--primary" onClick={copyAndOpen} style={{ width: "100%" }}>
                    {copied ? "Copied — Opening Google…" : "Share My Review on Google"}
                  </button>
                  <div className="home-cta" style={{ marginTop: 16 }}>
                    <Link className="btn btn--ghost" href="/listings">Browse Homes</Link>
                    <Link className="btn btn--ghost" href="/contact">Contact Us</Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap" style={{ textAlign: "center" }}>
          <span className="script" style={{ fontSize: "1.7rem" }}>from our clients</span>
          <h2 className="section__title" style={{ marginTop: 0 }}>You&apos;d be in good company</h2>
          <p className="prose" style={{ color: "var(--ink-muted)", maxWidth: 640, margin: "0 auto" }}>
            Hundreds of Southwest Louisiana families have bought and sold with us. Read what they
            say — then add your own chapter.
          </p>
          <div className="hv-cta-row">
            <a className="btn btn--ghost" href={site.blogAuthor.gbpUrl} target="_blank" rel="noopener noreferrer">
              Read Our Google Reviews
            </a>
          </div>
        </div>
      </main>
    </>
  );
}
