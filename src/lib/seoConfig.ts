// Single source of truth for the site's canonical URL. Set NEXT_PUBLIC_SITE_URL
// in Vercel once the production domain is connected; everything (canonicals,
// JSON-LD, sitemap, OpenGraph) follows from here.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://landhomegroup.com").replace(/\/$/, "");
