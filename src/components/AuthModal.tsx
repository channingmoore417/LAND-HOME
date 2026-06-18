"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";
import { site } from "@/config/site";

// Sign-up / login modal. Instant registration with NO separate password — the
// phone number is used as the password. Plus Google / Apple OAuth.
export default function AuthModal({
  onClose,
  onAuthed,
}: {
  intent?: string;
  onClose: () => void;
  onAuthed: () => void;
}) {
  const supabase = getBrowserClient();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const digits = (s: string) => s.replace(/\D/g, "");

  async function oauth(provider: "google" | "apple") {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: typeof window !== "undefined" ? window.location.href : undefined },
    });
    if (error) setErr(`${provider === "google" ? "Google" : "Apple"} sign-in isn't set up yet. ${error.message}`);
  }

  async function finishProfile() {
    const uid = (await supabase.auth.getUser()).data.user?.id;
    if (uid) await supabase.from("profiles").update({ full_name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone }).eq("id", uid);
  }

  async function register() {
    setErr("");
    const pw = digits(phone);
    if (!firstName.trim() || !lastName.trim() || !/\S+@\S+\.\S+/.test(email) || pw.length < 6) {
      setErr("Please add your name, a valid email, and your phone number.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone } },
    });
    if (error) {
      // Already registered? Log them in with their phone.
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pw });
      setLoading(false);
      if (e2) { setErr(error.message.toLowerCase().includes("registered") ? "That email is already registered — check your phone number and tap Log in." : error.message); return; }
      onAuthed(); return;
    }
    if (!data.session) {
      const { error: e2 } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (e2) { setLoading(false); setErr("Account created — please confirm your email, then log in. (Turn off email confirmation in Supabase for instant sign-up.)"); return; }
    }
    await finishProfile();
    setLoading(false);
    onAuthed();
  }

  async function login() {
    setErr("");
    const pw = digits(phone);
    if (!/\S+@\S+\.\S+/.test(email) || pw.length < 6) { setErr("Enter your email and phone number."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    setLoading(false);
    if (error) { setErr("We couldn't log you in. Check your email and phone number."); return; }
    onAuthed();
  }

  return (
    <div className="authm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="authm__card" onClick={(e) => e.stopPropagation()}>
        <button className="authm__close" aria-label="Close" onClick={onClose}>×</button>
        <h2 className="authm__title">{mode === "signup" ? "Continue Your Home Search." : "Welcome back."}</h2>

        <div className="authm__oauth">
          <button className="oauthbtn oauthbtn--google" onClick={() => oauth("google")}>
            <span className="oauthbtn__g">G</span> Sign in with Google
          </button>
          <button className="oauthbtn oauthbtn--apple" onClick={() => oauth("apple")}>
             Sign in with Apple
          </button>
        </div>

        <div className="authm__or"><span>or</span></div>

        {mode === "signup" ? (
          <>
            <div className="field"><label>First Name *</label>
              <input className="input" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="field"><label>Last Name *</label>
              <input className="input" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
            <div className="field"><label>Phone Number *</label>
              <input className="input" type="tel" autoComplete="tel" placeholder="This will be used as your password" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field"><label>Email *</label>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            {err && <p className="hv-err">{err}</p>}
            <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={register} disabled={loading}>
              {loading ? "One moment…" : "Register"}
            </button>
            <p className="authm__toggle">Returning user? <button onClick={() => { setErr(""); setMode("login"); }}>Log in here</button></p>
            <p className="authm__legal">
              By registering on {site.name.toLowerCase().includes("the") ? "" : "the "}{site.name} website, you consent to receive
              calls, texts, and emails from {site.name}, brokered by {site.brokerage}, regarding real estate matters.
              This consent allows us to contact you in compliance with the Telephone Consumer Protection Act (TCPA) and
              Do Not Call (DNC) guidelines. Consent is not a condition of purchase; you can opt out anytime.
            </p>
          </>
        ) : (
          <>
            <div className="field"><label>Email *</label>
              <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div className="field"><label>Phone Number *</label>
              <input className="input" type="tel" autoComplete="tel" placeholder="Your phone number (your password)" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            {err && <p className="hv-err">{err}</p>}
            <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={login} disabled={loading}>
              {loading ? "One moment…" : "Log In"}
            </button>
            <p className="authm__toggle">New here? <button onClick={() => { setErr(""); setMode("signup"); }}>Create an account</button></p>
          </>
        )}
      </div>
    </div>
  );
}
