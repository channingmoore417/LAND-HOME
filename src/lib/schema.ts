import { site } from "@/config/site";
import { SITE_URL } from "@/lib/seoConfig";
import { napSchema } from "@/lib/nap";

// Small schema.org builders shared by pages that emit JSON-LD.

/** BreadcrumbList from [name, path] pairs; paths are site-relative ("/" = home). */
export function breadcrumbSchema(items: [string, string][]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE_URL}${path === "/" ? "" : path}`,
    })),
  };
}

/** The brokerage/team as a RealEstateAgent, with full NAP — for provider/seller fields. */
export function agentSchema() {
  return {
    "@type": "RealEstateAgent",
    name: site.name,
    url: SITE_URL,
    telephone: site.phone,
    ...napSchema(),
  };
}
