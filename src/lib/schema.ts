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

// One business entity for the whole site. Every page that describes the team
// uses this @id, so Google sees a single business (matching the Google
// Business Profile) instead of a dozen unconnected copies.
export const BUSINESS_ID = `${SITE_URL}/#business`;

/** @id for an agent's Person node (their /agents page). */
export function personId(slug: string): string {
  return `${SITE_URL}/agents/${slug}#person`;
}

/** Profiles that are the same business elsewhere on the web. */
export function businessSameAs(): string[] {
  return [site.nap.mapsUrl, site.blogAuthor.gbpUrl, site.blogAuthor.facebookUrl, site.blogAuthor.instagramUrl];
}

/** The brokerage/team as a RealEstateAgent, with full NAP — for provider/seller fields. */
export function agentSchema() {
  return {
    "@type": "RealEstateAgent",
    "@id": BUSINESS_ID,
    name: site.name,
    alternateName: site.localSeo.gbpName,
    url: SITE_URL,
    telephone: site.phone,
    email: site.email,
    logo: site.logoUrl,
    image: site.teamPhotoUrl,
    priceRange: "$$",
    sameAs: businessSameAs(),
    parentOrganization: { "@type": "Organization", name: site.brokerage },
    ...napSchema(),
  };
}

/** Short reference to the business entity (publisher, worksFor, provider). */
export function businessRef() {
  return { "@type": "RealEstateAgent", "@id": BUSINESS_ID, name: site.name, url: SITE_URL };
}
