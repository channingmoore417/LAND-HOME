import Link from "next/link";
import { site } from "@/config/site";

// Global footer — rendered once in app/layout.tsx, site-wide.
// Holds the MLS disclaimer required on every page.
export default function SiteFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <div className="footer__brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="footer__logo" src={site.logoUrl} alt={site.name} />
            <p>{site.footer.blurb}</p>
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
