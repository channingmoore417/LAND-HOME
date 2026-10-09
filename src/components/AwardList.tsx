import { site } from "@/config/site";

// Lauren's awards as a row of badges. `compact` is the smaller author-card size.
export default function AwardList({ compact = false }: { compact?: boolean }) {
  const awards = site.blogAuthor.awards;
  if (!awards.length) return null;
  return (
    <ul className={`awards${compact ? " awards--compact" : ""}`} aria-label={`${site.blogAuthor.name}'s awards`}>
      {awards.map((a) => (
        <li className="awards__item" key={a.title + a.year}>
          <svg viewBox="0 0 24 24" aria-hidden>
            <path fill="currentColor" d="M17 3V2H7v1H3v3a4 4 0 0 0 4 4h.3A5 5 0 0 0 11 12.9V16H8v2h8v-2h-3v-3.1A5 5 0 0 0 16.7 10h.3a4 4 0 0 0 4-4V3h-4zM5 6V5h2v3a2 2 0 0 1-2-2zm14 0a2 2 0 0 1-2 2V5h2v1zM6 20h12v2H6z" />
          </svg>
          <span>
            <b>{a.title}</b>
            <small>{a.year}{a.detail ? ` · ${a.detail}` : ""}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** schema.org `award` strings, e.g. "EXIT Realty Platinum Award 2026 (100+ transactions)". */
export function awardStrings(): string[] {
  return site.blogAuthor.awards.map((a) => `${a.title} ${a.year}${a.detail ? ` (${a.detail})` : ""}`);
}
