"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";

// Global header — rendered once in app/layout.tsx, site-wide.
// Client component so the mobile hamburger can open/close the nav.
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link className="brand" href="/" aria-label={site.name} onClick={close}>
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
        <button
          className="nav__toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown (shown under the bar on small screens when open) */}
      <div className={`nav__mobile${open ? " open" : ""}`}>
        {site.nav.map((item) => (
          <Link key={item.href} href={item.href} onClick={close}>
            {item.label}
          </Link>
        ))}
        <a className="nav__mobile-cta" href={site.phoneHref} onClick={close}>
          {site.phone}
        </a>
      </div>
    </nav>
  );
}
