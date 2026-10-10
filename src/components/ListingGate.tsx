"use client";

import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { site } from "@/config/site";
import { adParams } from "@/lib/adVisit";

const PASS_KEY = "lhg_gate_pass";
const VIEWS_KEY = "lhg_gate_views";

// Drop on a listing page. For signed-out paid-ad visitors it opens the
// lead-capture quiz over the listing; it can't be dismissed, only completed.
export default function ListingGate({ listingKey }: { listingKey: string }) {
  const { user, ready, openAuth } = useAuth();

  useEffect(() => {
    if (!ready || user || !site.leadGate.enabled) return;
    if (site.leadGate.adsOnly && !adParams()) return;
    try {
      if (localStorage.getItem(PASS_KEY)) return;
      const views = Number(localStorage.getItem(VIEWS_KEY) || 0);
      if (views < site.leadGate.freeViews) { localStorage.setItem(VIEWS_KEY, String(views + 1)); return; }
    } catch { /* storage blocked: gate anyway */ }
    openAuth({ intent: "view", listingKey });
  }, [ready, user, listingKey, openAuth]);

  return null;
}
