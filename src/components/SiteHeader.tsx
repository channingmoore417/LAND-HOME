import Link from "next/link";
import { site } from "@/config/site";

// Global header — rendered once in app/layout.tsx, site-wide.
export default function SiteHeader() {
  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link className="brand" href="/" aria-label={site.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__logo" src={site.logoUrl} alt={site.name} />
        </Link>
        <div className="nav__links">
          {site.nav.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </div>
        <a className="nav__cta" href={site.phoneHref}>
          {site.phone}
        </a>
        <button className="nav__toggle" aria-label="Menu">
          &#9776;
        </button>
      </div>
    </nav>
  );
}
