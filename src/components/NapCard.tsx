import { site } from "@/config/site";

// Visible NAP (name / address / phone) + hours, matching the Google Business
// Profile word for word. Rendered next to every Google map embed.
export default function NapCard() {
  const n = site.nap;
  return (
    <div className="napcard">
      <div className="napcard__name">{site.localSeo.gbpName}</div>
      <a className="napcard__rating" href={n.mapsUrl} target="_blank" rel="noopener">
        <span aria-hidden>★★★★★</span> {n.rating} · {n.reviewCount} Google reviews
      </a>
      <address className="napcard__addr">
        <a href={n.directionsUrl} target="_blank" rel="noopener">
          {n.street}<br />{n.city}, {n.region} {n.postalCode}
        </a>
        <a href={site.phoneHref}>{site.phone}</a>
        <a href={n.website}>{n.website.replace(/^https?:\/\//, "")}</a>
      </address>
      <dl className="napcard__hours">
        {n.hours.map((h) => (
          <div key={h.days}>
            <dt>{h.days}</dt>
            <dd>{h.time}</dd>
          </div>
        ))}
      </dl>
      <div className="napcard__actions">
        <a className="btn btn--aqua" href={n.directionsUrl} target="_blank" rel="noopener">Get Directions</a>
        <a className="btn napcard__call" href={site.phoneHref}>Call {site.phone}</a>
      </div>
    </div>
  );
}
