import Link from "next/link";
import { site } from "@/config/site";

// The "find us" block: team photo + local copy + Google Business Profile map.
// Reused on the SEO landing pages and the Buy hub.
export default function LocalMap({
  cityLabel = "Southwest Louisiana",
  href = "/listings",
  ctaLabel = "Browse listings",
  mapOnly = false,
  showPhoto = true,
}: {
  cityLabel?: string;
  href?: string;
  ctaLabel?: string;
  mapOnly?: boolean;
  showPhoto?: boolean;
}) {
  if (mapOnly) {
    return (
      <section className="localmap localmap--maponly">
        <div className="wrap">
          <iframe
            title={`${cityLabel} map — ${site.localSeo.gbpName}`}
            src={site.localSeo.mapEmbedUrl}
            className="localmap__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    );
  }
  return (
    <section className="localmap">
      <div className="wrap">
        <div className="localmap__grid">
          <div>
            {showPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="localmap__photo" src={site.teamPhotoUrl} alt={`${site.name} — ${cityLabel} real estate team`} />
            )}
            <span className="script">find us</span>
            <h2 className="section__title">Your local {cityLabel} real estate team</h2>
            <p className="prose">
              {site.name}, brokered by {site.brokerage}, serves {cityLabel} and all of Southwest
              Louisiana. Reach us at <a href={site.phoneHref}><strong>{site.phone}</strong></a> — no
              pressure, just local expertise.
            </p>
            <Link className="btn btn--aqua" href={href} style={{ maxWidth: 320 }}>{ctaLabel}</Link>
          </div>
          <iframe
            title={`${cityLabel} map — ${site.localSeo.gbpName}`}
            src={site.localSeo.mapEmbedUrl}
            className="localmap__frame"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
