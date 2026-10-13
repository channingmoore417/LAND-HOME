"use client";

import { useEffect } from "react";

// A client arriving from an alert is already a known contact, so mark this
// browser as "captured" — otherwise the listing sign-up gate would greet them.
// (Same flags the gate itself sets: sessionStorage "lhg_captured" + a cookie.)
export default function ClientPass({ token }: { token: string }) {
  useEffect(() => {
    try { window.sessionStorage.setItem("lhg_captured", "1"); } catch { /* storage blocked */ }
    document.cookie = `lhg_client=${token}; path=/; max-age=${60 * 60 * 24 * 90}; samesite=lax`;
  }, [token]);
  return null;
}
