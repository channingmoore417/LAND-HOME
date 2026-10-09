// Single source of truth for the site's canonical URL. Set NEXT_PUBLIC_SITE_URL
// in Vercel once the production domain is connected; everything (canonicals,
// JSON-LD, sitemap, OpenGraph) follows from here.
// The live site is served from www (the bare domain 308-redirects to it), so
// canonicals/sitemap must use www — a canonical that redirects weakens every
// page. Normalizes a bare-domain env value too.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.landhomegroup.com")
  .replace(/\/$/, "")
  .replace("://landhomegroup.com", "://www.landhomegroup.com");
