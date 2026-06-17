// ============================================================
// Content + structured-data generation for the SEO/AEO landing pages.
// Resolves on-page copy (custom override → generated → computed fallback),
// builds a data-driven FAQ, and emits JSON-LD (BreadcrumbList, ItemList,
// FAQPage, RealEstateAgent) — the pieces answer engines and rich results read.
// ============================================================

import { site } from "@/config/site";
import { usd } from "@/lib/format";
import { pageTopicLabel, topicNoun, type SeoPage } from "@/lib/seo";
import type { Card, ListingStats } from "@/lib/listings";

export interface ResolvedContent {
  h1: string;
  title: string;
  metaDesc: string;
  intro: string;
}

export function resolveContent(page: SeoPage): ResolvedContent {
  const cityLa = page.city ? `${page.city}, LA` : "Southwest Louisiana";
  const topic = pageTopicLabel(page);
  const h1 = page.custom_h1 || page.gen_h1 || `${topic} in ${cityLa}`;
  const title = page.custom_meta_title || page.gen_meta_title || `${h1} | ${site.name}`;
  const metaDesc =
    page.custom_meta_desc ||
    page.gen_meta_desc ||
    `Browse ${topic.toLowerCase()} in ${cityLa} with ${site.name}. Live MLS listings, updated every 15 minutes.`;
  const intro = page.custom_intro || page.gen_intro || "";
  return { h1, title, metaDesc, intro };
}

export interface Faq {
  q: string;
  a: string;
}

export function faqsFor(page: SeoPage, stats: ListingStats): Faq[] {
  const city = page.city || "Southwest Louisiana";
  const noun = topicNoun(page);
  const range =
    stats.priceMin && stats.priceMax
      ? `, priced from ${usd(stats.priceMin)} to ${usd(stats.priceMax)}`
      : "";

  const faqs: Faq[] = [
    {
      q: `How many ${noun} are for sale in ${city}?`,
      a: `There are currently ${stats.count.toLocaleString()} ${noun} for sale in ${city}, Louisiana${range}. The list updates automatically as new listings hit the market.`,
    },
    {
      q: `Do homes in ${city} require flood insurance?`,
      a: `It depends on the property's flood zone. Many ${city} homes sit in flood zone X, where lenders typically don't require flood insurance, while others fall in higher-risk zones. Check the flood details on each listing and confirm the specific zone before purchasing.`,
    },
    {
      q: `How often are these ${city} listings updated?`,
      a: `Every 15 minutes. Listings sync directly from the Southwest Louisiana Association of Realtors (SWLAR) MLS, so new homes, price changes and status updates appear throughout the day.`,
    },
  ];

  // One feature/category-specific Q where it adds real value.
  const fk = page.feature_key;
  if (fk === "waterfront") {
    faqs.push({
      q: `Where are the waterfront homes in ${city}?`,
      a: `Waterfront properties in ${city} sit along the lake, bayous and canals throughout the area. Each waterfront listing shows its location and photos — use the map and details on the listing page to explore the setting.`,
    });
  } else if (fk === "pool") {
    faqs.push({
      q: `Are pool homes more expensive in ${city}?`,
      a: `Homes with pools in ${city} often carry a modest premium over comparable homes without one, but pricing varies widely by neighborhood, lot and home size. Browse the live results above to compare current asking prices.`,
    });
  } else if (fk === "new_construction") {
    faqs.push({
      q: `Is there new construction available in ${city}?`,
      a: `Yes — ${stats.count.toLocaleString()} new-construction ${stats.count === 1 ? "home is" : "homes are"} currently listed in ${city}, ranging from move-in-ready builds to homes still under construction. Build status is noted on each listing.`,
    });
  } else if (page.page_type === "land") {
    faqs.push({
      q: `Can I build on land for sale in ${city}?`,
      a: `Most ${city} lots and acreage are suitable for building, but always verify zoning, utilities, flood zone and any deed restrictions for a specific parcel before purchasing. We're happy to help you do that diligence.`,
    });
  }

  faqs.push({
    q: `Who can help me buy a home in ${city}?`,
    a: `${site.name}, brokered by ${site.brokerage}, serves ${city} and all of Southwest Louisiana. Call ${site.phone} or request a tour on any listing to get started — there's no pressure and no obligation.`,
  });

  return faqs;
}

// JSON-LD graph for the page. Returns an array of schema.org objects.
export function jsonLdGraph(opts: {
  content: ResolvedContent;
  stats: ListingStats;
  cards: Card[];
  faqs: Faq[];
  siteUrl: string;
  pageUrl: string;
  cityHubUrl: string;
  cityLabel: string;
  topicLabel: string;
}): object[] {
  const { content, stats, cards, faqs, siteUrl, pageUrl, cityHubUrl, cityLabel, topicLabel } = opts;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: cityLabel, item: cityHubUrl },
      { "@type": "ListItem", position: 3, name: topicLabel, item: pageUrl },
    ],
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: content.h1,
    description: content.metaDesc,
    url: pageUrl,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: stats.count,
      itemListElement: cards.slice(0, 12).map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${siteUrl}/listings/${c.listing_key}`,
        name: c.unparsed_address || `${cityLabel} listing`,
      })),
    },
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const agent = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: site.name,
    description: `${site.name}, brokered by ${site.brokerage}, serving ${cityLabel} and Southwest Louisiana.`,
    url: siteUrl,
    telephone: site.phone,
    areaServed: { "@type": "City", name: `${cityLabel}, Louisiana` },
    address: {
      "@type": "PostalAddress",
      addressLocality: site.localSeo.city,
      addressRegion: site.localSeo.region,
      addressCountry: "US",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: site.localSeo.latitude,
      longitude: site.localSeo.longitude,
    },
  };

  return [breadcrumb, itemList, faqPage, agent];
}
