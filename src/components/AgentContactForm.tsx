"use client";

import { useEffect, useState } from "react";
import { HoneypotField, useFormGuard } from "@/components/FormGuard";
import { A2P_REVIEW_MODE } from "@/config/a2p";

// Contact form on an agent's page. Posts the shared `contact` form_id with the
// agent in criteria, so it lands in GHL on the existing contact webhook with
// `agent` / `intent` as their own fields.

export const AGENT_INTENT_EVENT = "lhg:agent-intent";
const INTENTS = ["Buying", "Selling", "Both", "Just have a question"];

export default function AgentContactForm({ agentName, agentSlug }: { agentName: string; agentSlug: string }) {
  const guard = useFormGuard();
  const first = agentName.split(" ")[0];
  const [intent, setIntent] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  // "List My Home" / "Search With Me" buttons preselect the intent.
  useEffect(() => {
    const on = (e: Event) => setIntent((e as CustomEvent<string>).detail);
    window.addEventListener(AGENT_INTENT_EVENT, on);
    return () => window.removeEventListener(AGENT_INTENT_EVENT, on);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    const f = new FormData(e.currentTarget);
    try {
      const ok = await guard.submit({
        form_id: "contact",
        name: f.get("name"),
        email: f.get("email"),
        phone: f.get("phone") ?? "",
        message: `[For ${agentName}] [${intent || "General"}] ${f.get("message") || ""}`,
        criteria: { agent: agentName, agent_slug: agentSlug, intent: intent || "General" },
      });
      setState(ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="agentform agentform--done" role="status">
        <h3>Message sent to {first}</h3>
        <p>{first} will call or text you back shortly, usually the same business day.</p>
      </div>
    );
  }

  return (
    <form className="agentform" onSubmit={submit}>
      <h3>Message {first}</h3>
      <HoneypotField inputRef={guard.hpRef} />
      <div className="agentform__chips" role="group" aria-label="What can I help with?">
        {INTENTS.map((i) => (
          <button type="button" key={i} className={`chip${intent === i ? " chip--on" : ""}`} onClick={() => setIntent(i)}>
            {i}
          </button>
        ))}
      </div>
      <input className="input" name="name" placeholder="Your name" autoComplete="name" required />
      <input className="input" name="email" type="email" placeholder="Email" autoComplete="email" required />
      {!A2P_REVIEW_MODE && <input className="input" name="phone" type="tel" placeholder="Phone" autoComplete="tel" />}
      <textarea className="input" name="message" rows={3} placeholder={`What can ${first} help you with?`} />
      <button className="btn btn--primary" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending..." : `Send to ${first}`}
      </button>
      {state === "error" && <p className="agentform__err">Something went wrong. Please call or text instead.</p>}
    </form>
  );
}

/** Button that scrolls to the form and preselects an intent. */
export function AgentIntentButton({ intent, className, children }: { intent: string; className?: string; children: React.ReactNode }) {
  return (
    <a
      href="#contact"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent(AGENT_INTENT_EVENT, { detail: intent }))}
    >
      {children}
    </a>
  );
}
