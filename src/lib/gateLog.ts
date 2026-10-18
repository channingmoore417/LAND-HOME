"use client";

// Fire-and-forget log of what the capture gate did (see /api/gate-log).
export function logGate(outcome: string, traffic: "ad" | "organic", path: string, detail?: Record<string, unknown>) {
  try {
    fetch("/api/gate-log", {
      method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, traffic, path, detail }),
    }).catch(() => {});
  } catch { /* best effort */ }
}
