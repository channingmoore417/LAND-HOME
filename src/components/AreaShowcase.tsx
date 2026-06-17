import Link from "next/link";
import { photo } from "@/lib/images";
import type { AreaCard } from "@/lib/neighborhoods";

// A showcase grid of photo cards for neighborhoods or ZIP areas. Each card
// pulls a real listing photo from that area and links to the filtered search.
export default function AreaShowcase({
  eyebrow,
  title,
  cards,
  hrefFor,
}: {
  eyebrow: string;
  title: string;
  cards: AreaCard[];
  hrefFor: (slug: string) => string;
}) {
  const shown = cards.filter((c) => c.count > 0);
  if (shown.length === 0) return null;
  return (
    <section className="hoods">
      <div className="wrap">
        <span className="script" style={{ fontSize: "1.7rem" }}>{eyebrow}</span>
        <h2 className="section__title" style={{ marginTop: 0 }}>{title}</h2>
        <div className="hoods__grid">
          {shown.map((c) => (
            <Link key={c.slug} className="hood" href={hrefFor(c.slug)}>
              <div className="hood__media">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo(c.photoUrl, 800)} alt={c.name} loading="lazy" />
                ) : (
                  <div className="hood__ph" />
                )}
                <span className="hood__count">{c.count.toLocaleString()} {c.count === 1 ? "home" : "homes"}</span>
              </div>
              <div className="hood__body">
                <div className="hood__name">{c.name}</div>
                <p className="hood__blurb">{c.blurb}</p>
                <span className="hood__cta">View listings &rarr;</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
