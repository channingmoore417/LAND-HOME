"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { trackSignal } from "@/lib/signals";

// Mounted once in the layout. Sends one session_start per browser session
// (drives the 30–60 day "returning visitor" signal) and an identify when the
// visitor signs in, so earlier anonymous signals reach GHL.
export default function SignalTracker() {
  const { user, ready } = useAuth();
  const started = useRef(false);
  const identified = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || started.current) return;
    started.current = true;
    try {
      if (window.sessionStorage.getItem("lhg_session")) return;
      window.sessionStorage.setItem("lhg_session", "1");
    } catch { /* storage blocked: still track once per page load */ }
    trackSignal("session_start");
    if (user) identified.current = user.id;
  }, [ready, user]);

  useEffect(() => {
    if (!ready || !user || identified.current === user.id) return;
    identified.current = user.id;
    trackSignal("identify");
  }, [ready, user]);

  return null;
}
