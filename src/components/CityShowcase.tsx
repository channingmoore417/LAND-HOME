import Link from "next/link";
import { photo } from "@/lib/images";
import type { CityShowcaseCard } from "@/lib/cityShowcase";

const usd = (n: number) => `$${Math.round(n).toLocaleString()}`;

// City photo cards: a live home for sale in each city, two lines about the
// town, live counts, and a button to that city's homes-for-sale page.
export function CityGrid({ cards }: { cards: CityShowcaseCard[] }) {
  return (
    <div className="cityx__grid">
      {cards.map((c) => (
        <article className="cityx" key={c.slug}>
          <Link className="cityx__media" href={c.href} aria-label={`${c.name} homes for sale`}>
            {c.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photo(c.photoUrl, 900)} alt={`Home for sale in ${c.name}, LA`} loading="lazy" />
            ) : (
              <div className="cityx__ph" />
            )}
            <div className="cityx__shade" />
            <span className="cityx__count">{c.count.toLocaleString()} for sale</span>
            <h3 className="cityx__name">{c.name}</h3>
          </Link>
          <div className="cityx__body">
            <p className="cityx__blurb">{c.blurb}</p>
            <div className="cityx__stats">
              <div><b>{c.count.toLocaleString()}</b><span>Homes For Sale</span></div>
              {c.medianPrice ? <div><b>{usd(c.medianPrice)}</b><span>Median Price</span></div> : null}
            </div>
            {c.featured?.price ? (
              <p className="cityx__feat">
                Pictured: {usd(c.featured.price)}
                {c.featured.beds ? ` · ${c.featured.beds} bd` : ""}
                {c.featured.baths ? ` · ${c.featured.baths} ba` : ""}
                {c.featured.courtesy ? <span className="cityx__courtesy">Courtesy of {c.featured.courtesy}</span> : null}
              </p>
            ) : null}
            <Link className="btn btn--primary cityx__btn" href={c.href}>View {c.name} Homes For Sale</Link>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function CityShowcase({ eyebrow, title, cards }: { eyebrow: string; title: string; cards: CityShowcaseCard[] }) {
  if (!cards.length) return null;
  return (
    <section className="cityx-sec">
      <div className="wrap">
        <span className="script" style={{ fontSize: "1.7rem" }}>{eyebrow}</span>
        <h2 className="section__title" style={{ marginTop: 0 }}>{title}</h2>
        <CityGrid cards={cards} />
      </div>
    </section>
  );
}
