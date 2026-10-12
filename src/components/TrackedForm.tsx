"use client";

import { useEffect, useState } from "react";
import { AD_VISIT_KEY } from "@/config/site";
import HiddenField from "@/components/HiddenField";

// A real, named <form> around the LAST step of a multi-step quiz. GoHighLevel's
// tracking script only sees native form submits, so each quiz keeps its screens
// as they are and, at the final step, wraps the contact fields in this form:
//   - every answer rides along as an off-screen, named input (see HiddenField) (plus UTMs / gclid /
//     landing page), so GHL's activity feed shows the whole submission
//   - the only submit button lives on the last step (earlier steps are plain
//     buttons outside the form, so nothing can submit early)
// The handler still posts through /api/forms (spam filter, Supabase, BoldTrail,
// the GHL webhook), so GHL gets ONE webhook post, not a second direct one.
const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_adgroup", "utm_term", "utm_content", "gclid", "fbclid"];

function attribution(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    const landing = window.sessionStorage.getItem(AD_VISIT_KEY); // full ad landing URL, if any
    const here = new URLSearchParams(window.location.search);
    let there = new URLSearchParams();
    if (landing) { try { there = new URL(landing, window.location.origin).searchParams; } catch { /* ignore */ } }
    for (const k of ATTR_KEYS) {
      const v = here.get(k) || there.get(k);
      if (v) out[k] = v;
    }
    out.landing_page = landing || window.location.pathname + window.location.search;
    out.page_url = window.location.href;
  } catch { /* storage blocked */ }
  return out;
}

export default function TrackedForm({
  name, fields, onSubmit, children, className,
}: {
  name: string; // e.g. "Buyer-Quiz": the form's name and id, and the inquiry_type value
  fields: Record<string, string | number | null | undefined>;
  onSubmit: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const [attr, setAttr] = useState<Record<string, string>>({});
  useEffect(() => setAttr(attribution()), []);
  const all: Record<string, string | number | null | undefined> = { inquiry_type: name, ...fields, ...attr };
  return (
    <form name={name} id={name} className={className} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      {Object.entries(all)
        .filter(([, v]) => v != null && String(v) !== "")
        .map(([k, v]) => <HiddenField key={k} name={k} value={String(v)} />)}
      {children}
    </form>
  );
}
