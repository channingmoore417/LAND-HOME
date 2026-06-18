"use client";

import { useEffect, useRef } from "react";
import { logActivity } from "@/lib/activity";

// Logs a search to the user's activity stream (when signed in). Debounced by
// a serialized signature so rapid filter changes don't spam the log.
export default function TrackSearch({ criteria }: { criteria: Record<string, unknown> }) {
  const last = useRef<string>("");
  useEffect(() => {
    const sig = JSON.stringify(criteria);
    if (!sig || sig === "{}" || sig === last.current) return;
    last.current = sig;
    const t = setTimeout(() => logActivity("search", { meta: criteria }), 800);
    return () => clearTimeout(t);
  }, [criteria]);
  return null;
}
