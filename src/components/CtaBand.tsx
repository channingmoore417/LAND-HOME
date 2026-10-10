import Link from "next/link";
import { OpenListingAlertsButton } from "@/components/ListingAlertsQuiz";

// A slim "what to do next" row that closes out a page section.
export type CtaAction =
  | { kind: "link"; label: string; href: string; primary?: boolean }
  | { kind: "tel" | "sms"; label: string; href: string; primary?: boolean }
  | { kind: "alerts"; label: string; primary?: boolean };

export default function CtaBand({ text, actions }: { text: React.ReactNode; actions: CtaAction[] }) {
  return (
    <div className="ctaband">
      <p className="ctaband__t">{text}</p>
      <div className="ctaband__btns">
        {actions.map((a) => {
          const cls = `btn ${a.primary ? "btn--primary" : "btn--ghost"} ctaband__btn`;
          if (a.kind === "alerts") return <OpenListingAlertsButton key={a.label} className={cls}>{a.label}</OpenListingAlertsButton>;
          if (a.kind === "link") return <Link key={a.label} className={cls} href={a.href}>{a.label}</Link>;
          return <a key={a.label} className={cls} href={a.href}>{a.label}</a>;
        })}
      </div>
    </div>
  );
}
