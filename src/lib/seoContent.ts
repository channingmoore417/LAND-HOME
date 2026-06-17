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
  ];

  // One feature/category-specific Q where it adds real value.
  const fk = page.feature_key;
  if (fk === "waterfront") {
    faqs.push({
      q: `Where are the waterfront homes in ${city}?`,
      a: `Waterfront properties in ${city} sit along the lake, bayous, canals and the Calcasieu River throughout the area. Each waterfront listing shows its location and photos — use the map and details on the listing page to explore the setting.`,
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
      a: `Most ${city} lots and acreage are suitable for building, but always verify zoning, utilities, access and any deed restrictions for a specific parcel before purchasing. We're happy to help you do that diligence.`,
    });
  } else if (page.page_type === "beds") {
    faqs.push({
      q: `Are larger homes affordable in ${city}?`,
      a: `Yes — one of the advantages of ${city} is that bigger homes remain attainable compared with most of the country. There are ${stats.count.toLocaleString()} ${noun} on the market right now${range}, spanning practical family homes to spacious estates.`,
    });
  }

  faqs.push(...cityLivingFaqs(page, city));

  faqs.push({
    q: `How often are these ${city} listings updated?`,
    a: `Continuously. Listings refresh from the local MLS throughout the day, so new homes, price changes and status updates appear automatically.`,
  });
  faqs.push({
    q: `Who can help me buy a home in ${city}?`,
    a: `${site.name}, brokered by ${site.brokerage}, serves ${city} and all of Southwest Louisiana. Call ${site.phone} or request a tour on any listing to get started — there's no pressure and no obligation.`,
  });

  return faqs;
}

// Relocation / "living in" questions — strong AEO + local SEO. Lake Charles
// answers are specific; add other cities here as the program expands. The
// richest set lands on the city hub; a couple appear on every page.
function cityLivingFaqs(page: SeoPage, city: string): Faq[] {
  if (city !== "Lake Charles") return [];
  const isHub = page.page_type === "city";
  const out: Faq[] = [
    {
      q: `Is Lake Charles, Louisiana a good place to live?`,
      a: `Lake Charles is widely considered a good place to live for buyers who value affordability and an easygoing, outdoor lifestyle. The cost of living runs below the national average, homes are attainable, and residents enjoy the lakefront, a lively festival calendar (Mardi Gras, Contraband Days and more), casinos and dining, and an easy drive to Houston. Like anywhere on the Gulf Coast, summers are hot and humid, but many buyers find the value and the community more than worth it.`,
    },
    {
      q: `Is it expensive to live in Lake Charles?`,
      a: `No — Lake Charles is considered affordable. The overall cost of living sits below the U.S. average, and housing in particular is a bargain compared with most of the country. Louisiana's homestead exemption also lowers property taxes for primary residences, helping a budget go further.`,
    },
  ];
  if (isHub) {
    out.push(
      {
        q: `What are the best family neighborhoods in Lake Charles?`,
        a: `South Lake Charles is the most popular choice for families, thanks to well-regarded schools, newer subdivisions, parks and convenient shopping along Nelson Road. Other favorites include the Graywood and Country Club areas (larger lots and newer custom homes), the Prien Lake area, and the growing suburbs toward Moss Bluff and Sulphur just outside the city. The right fit depends on schools, commute and budget — we're glad to help you compare.`,
      },
      {
        q: `What is the average income in Lake Charles, Louisiana?`,
        a: `The median household income in Lake Charles is roughly $48,000 according to recent U.S. Census estimates — a bit below the national median — but the area's low cost of living, and especially its affordable housing, means that income tends to go further here than in many larger metros.`,
      },
      {
        q: `What is there to do in Lake Charles?`,
        a: `Plenty. Lake Charles is known for its casinos and entertainment, lakefront promenade and parks, fishing and boating, and a busy festival schedule including Mardi Gras and Contraband Days. McNeese State University adds college sports and events, and the Gulf beaches at Cameron are a short drive away.`,
      },
      {
        q: `What are property taxes like in Lake Charles?`,
        a: `Property taxes in Calcasieu Parish are relatively low, and Louisiana's homestead exemption shields the first $75,000 of a primary residence's value from most parish taxes, keeping annual bills modest for owner-occupants. Exact taxes vary by location and assessed value — each listing's details and your closing documents reflect the specifics.`,
      },
    );
  }
  return out;
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
