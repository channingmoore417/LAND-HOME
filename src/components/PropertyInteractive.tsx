"use client";

import { useState } from "react";

// All the lead-capture UI for a listing: sidebar lead card + message form,
// the sticky mobile bar, and the Tour / Ask modals. Every form posts to the
// single /api/forms endpoint with a stable form_id.

interface Props {
  listingKey: string;
  address: string; // full label for modals, e.g. "123 Main St, Lake Charles, LA 70601"
  priceLabel: string; // e.g. "$424,500"
}

async function submitForm(payload: Record<string, unknown>) {
  const res = await fetch("/api/forms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      source_url: typeof window !== "undefined" ? window.location.pathname : undefined,
    }),
  });
  return res.ok;
}

function dateOptions() {
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const today = new Date();
  return Array.from({ length: 8 }, (_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() + idx);
    return {
      label: `${idx === 0 ? "ASAP" : wd[d.getDay()]} ${mo[d.getMonth()]} ${d.getDate()}`,
      wd: idx === 0 ? "ASAP" : wd[d.getDay()],
      d: d.getDate(),
      mo: mo[d.getMonth()],
    };
  });
}

export default function PropertyInteractive({ listingKey, address, priceLabel }: Props) {
  const [tourOpen, setTourOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [tourMode, setTourMode] = useState<"In-Person Tour" | "Video Chat Tour">("In-Person Tour");
  const [dateIdx, setDateIdx] = useState(0);
  const dates = dateOptions();

  const [msgSent, setMsgSent] = useState(false);
  const [tourSent, setTourSent] = useState(false);
  const [askSent, setAskSent] = useState(false);
  const [busy, setBusy] = useState(false);

  function lock(open: boolean) {
    document.body.style.overflow = open ? "hidden" : "";
  }
  const openTour = () => {
    setTourOpen(true);
    lock(true);
  };
  const closeTour = () => {
    setTourOpen(false);
    lock(false);
  };
  const openAsk = () => {
    setAskOpen(true);
    lock(true);
  };
  const closeAsk = () => {
    setAskOpen(false);
    lock(false);
  };

  async function handleMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const ok = await submitForm({
      form_id: "listing_inquiry",
      listing_key: listingKey,
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email"),
      message: f.get("message"),
    });
    setBusy(false);
    if (ok) setMsgSent(true);
  }

  async function handleTour(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const ok = await submitForm({
      form_id: "showing_request",
      listing_key: listingKey,
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email"),
      preferred_times: `${tourMode} · ${dates[dateIdx].label}`,
      message: `Tour request (${tourMode}) for ${address}`,
    });
    setBusy(false);
    if (ok) setTourSent(true);
  }

  async function handleAsk(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    const ok = await submitForm({
      form_id: "listing_inquiry",
      listing_key: listingKey,
      name: f.get("name"),
      phone: f.get("phone"),
      email: f.get("email"),
      message: f.get("message"),
    });
    setBusy(false);
    if (ok) setAskSent(true);
  }

  return (
    <>
      {/* Lead card */}
      <div className="card card--lead">
        <div className="card__inner">
          <div className="eyebrow lead__eyebrow">Interested?</div>
          <h3 className="lead__title">Request a Tour</h3>
          <p className="lead__sub">See this home in person or by video — it&apos;s free, cancel anytime.</p>
          <button className="btn btn--gold" onClick={openTour}>
            Schedule a Showing
          </button>
          <button className="btn btn--ghost" onClick={openAsk}>
            Ask a Question
          </button>
          <p className="lead__legal">
            By submitting you agree to be contacted by The Land &amp; Home Group about this
            property. Consent is not a condition of purchase.
          </p>
        </div>
      </div>

      {/* Message form */}
      <div className="card">
        <div className="card__inner">
          <div className="eyebrow lead__eyebrow">Send a Message</div>
          <h3 className="lead__title" style={{ fontSize: "1.12rem", marginBottom: "16px" }}>
            Get more details
          </h3>
          {msgSent ? (
            <p className="form__ok">Thanks — we&apos;ll be in touch shortly about this home.</p>
          ) : (
            <form onSubmit={handleMessage}>
              <input className="input" name="name" type="text" placeholder="Full name" required />
              <input className="input" name="phone" type="tel" placeholder="Phone" />
              <input className="input" name="email" type="email" placeholder="Email" required />
              <textarea
                className="input"
                name="message"
                placeholder={`I'd like to know more about ${address}…`}
              />
              <button className="btn btn--dark" disabled={busy}>
                {busy ? "Sending…" : "Send Inquiry"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Sticky mobile bar */}
      <div className="stickybar">
        <div className="stickybar__price">
          <div className="l">Offered At</div>
          <div className="v">{priceLabel}</div>
        </div>
        <div className="stickybar__btns">
          <button
            className="sb--ghost"
            onClick={() => document.getElementById("calc")?.scrollIntoView()}
          >
            Payment
          </button>
          <button className="sb--gold" onClick={openTour}>
            Tour
          </button>
        </div>
      </div>

      {/* Tour modal */}
      <div className={`modal${tourOpen ? " open" : ""}`} onClick={closeTour}>
        <div className="modal__box" onClick={(e) => e.stopPropagation()}>
          <div className="modal__head">
            <h3>Request a Tour</h3>
            <button className="x" onClick={closeTour} aria-label="Close">
              &times;
            </button>
          </div>
          <div className="modal__addr">
            {address} · {priceLabel}
          </div>
          <div className="modal__body">
            {tourSent ? (
              <p className="form__ok">Tour requested! We&apos;ll confirm your time by phone or email.</p>
            ) : (
              <form onSubmit={handleTour}>
                <div className="tour__toggle">
                  {(["In-Person Tour", "Video Chat Tour"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      className={tourMode === m ? "active" : ""}
                      onClick={() => setTourMode(m)}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="tour__dates">
                  {dates.map((d, idx) => (
                    <div
                      key={idx}
                      className={`tour__date${dateIdx === idx ? " active" : ""}`}
                      onClick={() => setDateIdx(idx)}
                    >
                      <div className="wd">{d.wd}</div>
                      <div className="d">{d.d}</div>
                      <div className="mo">{d.mo}</div>
                    </div>
                  ))}
                </div>
                <input className="input" name="name" type="text" placeholder="First & last name" required />
                <input className="input" name="phone" type="tel" placeholder="Phone" required />
                <input className="input" name="email" type="email" placeholder="Email" required />
                <button className="btn btn--gold" disabled={busy}>
                  {busy ? "Sending…" : "Confirm Tour Request"}
                </button>
                <p className="lead__legal">
                  By continuing you agree to be contacted by The Land &amp; Home Group about your
                  tour. Consent is not a condition of purchase.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Ask modal */}
      <div className={`modal${askOpen ? " open" : ""}`} onClick={closeAsk}>
        <div className="modal__box" onClick={(e) => e.stopPropagation()}>
          <div className="modal__head">
            <h3>Ask a Question</h3>
            <button className="x" onClick={closeAsk} aria-label="Close">
              &times;
            </button>
          </div>
          <div className="modal__addr">
            {address} · {priceLabel}
          </div>
          <div className="modal__body">
            {askSent ? (
              <p className="form__ok">Got it — we&apos;ll answer your question shortly.</p>
            ) : (
              <form onSubmit={handleAsk}>
                <input className="input" name="name" type="text" placeholder="First & last name" required />
                <input className="input" name="phone" type="tel" placeholder="Phone" />
                <input className="input" name="email" type="email" placeholder="Email" required />
                <textarea
                  className="input"
                  name="message"
                  placeholder="What would you like to know about this home?"
                  defaultValue={`I'd like more information about ${address}.`}
                />
                <button className="btn btn--gold" disabled={busy}>
                  {busy ? "Sending…" : "Send Question"}
                </button>
                <p className="lead__legal">
                  By continuing you agree to be contacted by The Land &amp; Home Group about this
                  property. Consent is not a condition of purchase.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
