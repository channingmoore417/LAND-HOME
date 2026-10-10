"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { site } from "@/config/site";
import { adParams } from "@/lib/adVisit";

const PASS_KEY = "lhg_gate_pass";
const VIEWS_KEY = "lhg_gate_views";

// A link to a listing. For signed-out visitors it opens the lead-capture quiz
// first, then continues to the listing. Signed-in users (and anyone who has
// already completed the quiz) go straight through.
export default function ListingLink({ href, listingKey, className, children }: {
  href: string; listingKey: string; className?: string; children: React.ReactNode;
}) {
  const { user, ready, openAuth } = useAuth();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    if (!site.leadGate.enabled || user || !ready) return;
    if (site.leadGate.adsOnly && !adParams()) return;
    try {
      if (localStorage.getItem(PASS_KEY)) return;
      const views = Number(localStorage.getItem(VIEWS_KEY) || 0);
      if (views < site.leadGate.freeViews) { localStorage.setItem(VIEWS_KEY, String(views + 1)); return; }
    } catch { /* storage blocked: fall through and gate */ }
    e.preventDefault();
    openAuth({ intent: "view", listingKey, onAuthed: () => router.push(href) });
  }

  return <Link className={className} href={href} onClick={onClick}>{children}</Link>;
}
