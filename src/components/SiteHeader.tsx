"use client";

import { useState } from "react";
import Link from "next/link";
import { site } from "@/config/site";
import { useAuth } from "@/components/AuthProvider";

interface NavChild { label: string; href: string }
interface NavItem { label: string; href: string; children?: readonly NavChild[] }

// Global header — rendered once in app/layout.tsx, site-wide.
// Client component so the mobile hamburger can open/close the nav.
export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const nav = site.nav as readonly NavItem[];
  const { user, ready, openAuth } = useAuth();

  return (
    <nav className="nav">
      <div className="nav__inner">
        <Link className="brand" href="/" aria-label={site.name} onClick={close}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="brand__logo" src={site.logoUrl} alt={site.name} />
        </Link>

        <div className="nav__links">
          {nav.map((item) =>
            item.children ? (
              <div className="nav__item" key={item.href}>
                <Link className="nav__item-link" href={item.href}>
                  {item.label} <span className="nav__caret" aria-hidden>&#9662;</span>
                </Link>
                <div className="nav__dropdown">
                  {item.children.map((c) => (
                    <Link key={c.href} href={c.href}>{c.label}</Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link key={item.href} href={item.href}>{item.label}</Link>
            ),
          )}
        </div>

        {ready && (user ? (
          <Link className="nav__account" href="/account" aria-label="My account">♥ Saved</Link>
        ) : (
          <button className="nav__account" onClick={() => openAuth()}>Sign in</button>
        ))}
        <a className="nav__cta" href={site.phoneHref}>{site.phone}</a>
        <button
          className="nav__toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile dropdown */}
      <div className={`nav__mobile${open ? " open" : ""}`}>
        {nav.map((item) => (
          <div key={item.href}>
            <Link href={item.href} onClick={close}>{item.label}</Link>
            {item.children && (
              <div className="nav__mobile-sub">
                {item.children.map((c) => (
                  <Link key={c.href} href={c.href} onClick={close}>{c.label}</Link>
                ))}
              </div>
            )}
          </div>
        ))}
        {ready && (user ? (
          <Link href="/account" onClick={close}>♥ My Saved Homes</Link>
        ) : (
          <button className="nav__mobile-signin" onClick={() => { close(); openAuth(); }}>Sign in / Create account</button>
        ))}
        <a className="nav__mobile-cta" href={site.phoneHref} onClick={close}>{site.phone}</a>
      </div>
    </nav>
  );
}
