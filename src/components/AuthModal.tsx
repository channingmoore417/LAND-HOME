"use client";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabaseBrowser";

// Instant sign-up / login modal. No email round-trip — the account is created
// and the session starts right here (email confirmation must be off in Supabase
// Auth settings so signUp returns a session immediately).
export default function AuthModal({
  intent,
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
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const heading = mode === "signup"
    ? (intent === "save" ? "Save this home" : "Create your free account")
    : "Welcome back";
  const sub = mode === "signup"
    ? "Create a free account to save homes, get matched, and track your search — it takes seconds."
    : "Log in to see your saved homes and searches.";

  async function submit() {
    setErr("");
    if (mode === "signup") {
      if (!firstName.trim() || !/\S+@\S+\.\S+/.test(email) || password.length < 6) {
        setErr("Add your first name, a valid email, and a password (at least 6 characters).");
        return;
      }
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim(), phone } },
      });
      if (error) { setLoading(false); setErr(error.message); return; }
      if (!data.session) {
        // Fallback if email confirmation is enabled on the project.
        const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
        if (e2) {
          setLoading(false);
          setErr("Account created — please confirm your email, then log in. (Tip: turn off email confirmation in Supabase for instant sign-up.)");
          return;
        }
      }
      // Save name/phone to the profile too.
      const uid = data.user?.id ?? (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        await supabase.from("profiles").update({
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          phone,
        }).eq("id", uid);
      }
      setLoading(false);
      onAuthed();
    } else {
      if (!email || !password) { setErr("Enter your email and password."); return; }
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { setErr(error.message); return; }
      onAuthed();
    }
  }

  return (
    <div className="authm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="authm__card" onClick={(e) => e.stopPropagation()}>
        <button className="authm__close" aria-label="Close" onClick={onClose}>×</button>
        <span className="script" style={{ fontSize: "1.5rem" }}>{mode === "signup" ? "join us" : "log in"}</span>
        <h2 className="authm__title">{heading}</h2>
        <p className="authm__sub">{sub}</p>

        {mode === "signup" && (
          <div className="hv-grid hv-grid--2">
            <div className="field"><label>First Name</label>
              <input className="input" type="text" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} /></div>
            <div className="field"><label>Last Name</label>
              <input className="input" type="text" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} /></div>
          </div>
        )}
        <div className="field"><label>Email</label>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {mode === "signup" && (
          <div className="field"><label>Phone <span style={{ color: "var(--ink-muted)", fontWeight: 400 }}>(optional)</span></label>
            <input className="input" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        )}
        <div className="field"><label>Password</label>
          <input className="input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} /></div>

        {err && <p className="hv-err">{err}</p>}
        <button type="button" className="btn btn--primary" style={{ width: "100%" }} onClick={submit} disabled={loading}>
          {loading ? "One moment…" : mode === "signup" ? "Create Account & Save" : "Log In"}
        </button>

        <p className="authm__toggle">
          {mode === "signup" ? (
            <>Already have an account? <button onClick={() => { setErr(""); setMode("login"); }}>Log in</button></>
          ) : (
            <>New here? <button onClick={() => { setErr(""); setMode("signup"); }}>Create an account</button></>
          )}
        </p>
      </div>
    </div>
  );
}
