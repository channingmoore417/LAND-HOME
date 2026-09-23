import type { MetadataRoute } from "next";

import { SITE_URL as SITE } from "@/lib/seoConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/admin"] },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
