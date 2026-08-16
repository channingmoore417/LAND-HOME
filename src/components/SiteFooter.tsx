import Link from "next/link";
import { site } from "@/config/site";
import type { NavCityEntry } from "@/lib/seo";

// Global footer — rendered once in app/layout.tsx, site-wide.
// Holds the MLS disclaimer required on every page.
export default function SiteFooter({ cityMenu }: { cityMenu: NavCityEntry[] }) {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="footer__logo" src={site.logoUrl} alt={site.name} />
            <p>{site.footer.blurb}</p>
            <address className="footer__address">
              {site.footer.address}
              <br />
              <a href={site.phoneHref}>{site.phone}</a>
            </address>
          </div>
          {site.footer.columns.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {cityMenu.length > 0 && (
            <div>
              <h4>Browse by City</h4>
              <ul className="cities">
                {cityMenu.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href}>{c.label} Homes for Sale</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="footer__bottom">
          <div>
            &copy; {new Date().getFullYear()} {site.name}. All rights reserved.
          </div>
          <div className="eh">{site.footer.legal}</div>
        </div>
      </div>
    </footer>
  );
}
