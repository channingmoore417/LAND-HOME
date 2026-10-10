import Link from "next/link";
import type { Agent } from "@/lib/types";

// Renders the team roster as cards. Server component — data comes from the
// public-read `agents` table via getTeam(). Gracefully handles missing
// photos (initials avatar), bios, titles, and contact info.
function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function telHref(phone: string) {
  return "tel:+1" + phone.replace(/[^0-9]/g, "");
}

export default function TeamGrid({ team }: { team: Agent[] }) {
  return (
    <div className="team__grid">
      {team.map((a) => (
        <article className="teamcard" key={a.id}>
          <Link className="teamcard__media" href={`/agents/${a.slug}`} aria-label={`About ${a.full_name}`}>
            {a.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.photo_url} alt={a.full_name} />
            ) : (
              <span className="teamcard__avatar" aria-hidden>{initials(a.full_name)}</span>
            )}
          </Link>
          <div className="teamcard__body">
            <h3 className="teamcard__name"><Link href={`/agents/${a.slug}`}>{a.full_name}</Link></h3>
            {a.title && <div className="teamcard__title">{a.title}</div>}
            {a.specialties && a.specialties.length > 0 && (
              <div className="teamcard__tags">
                {a.specialties.map((s) => (
                  <span className="teamcard__tag" key={s}>{s}</span>
                ))}
              </div>
            )}
            {a.bio && <p className="teamcard__bio">{a.bio}</p>}
            <div className="teamcard__contact">
              {a.phone && <a href={telHref(a.phone)}>📞 {a.phone}</a>}
              {a.email && <a href={`mailto:${a.email}`}>✉️ {a.email}</a>}
            </div>
            <Link className="teamcard__more" href={`/agents/${a.slug}`}>
              View {a.full_name.split(" ")[0]}&apos;s profile &rarr;
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
