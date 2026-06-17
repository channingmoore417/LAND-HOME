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

// Short, localized descriptor per city — woven into generated copy so each
// city's pages read uniquely (not just a find-and-replace of the name).
const CITY_FACTS: Record<string, string> = {
  "Lake Charles":
    "Lake Charles is the largest city in Southwest Louisiana — a lakefront community known for its affordability, established neighborhoods, and an economy anchored by industry, the port, and a growing tourism scene.",
  "Sulphur":
    "Just west of Lake Charles, Sulphur is a family-friendly community known for good schools, newer subdivisions, and quick access to I-10 and the region's industrial corridor.",
  "Iowa":
    "A small, fast-growing town just east of Lake Charles, Iowa is prized for rural acreage, newer homes, and an easy commute into the city.",
  "Westlake":
    "Across the river from Lake Charles, Westlake blends established neighborhoods with new industrial-driven growth and convenient riverfront access.",
  "Ragley":
    "A rural community north of Lake Charles, Ragley is prized for acreage, country living, and room to roam.",
  "Jennings":
    "The seat of Jefferson Davis Parish, Jennings offers small-town charm, affordability, and historic neighborhoods along the I-10 corridor.",
  "DeRidder":
    "The heart of Beauregard Parish, DeRidder offers affordable homes, plentiful acreage, and a relaxed pace north of Lake Charles.",
  "Vinton":
    "A small town near the Texas line, Vinton offers affordable homes, the Delta Downs racetrack, and easy I-10 access.",
  "Cameron":
    "On the Gulf Coast south of Lake Charles, Cameron is a fishing and waterfront community known for camps, coastal land, and the great outdoors.",
  "Welsh":
    "A friendly rural town in Jefferson Davis Parish, Welsh offers affordable homes and farmland along the I-10 corridor.",
  "Moss Bluff":
    "A sought-after suburb just north of Lake Charles, Moss Bluff is known for larger lots, good schools, and a semi-rural feel close to town.",
};

const CLOSE_CTA =
  "Every listing here updates throughout the day. When you're ready to tour or make an offer, The Land & Home Group — brokered by EXIT Realty Southern — is here to help, and a quick pre-approval from Bayou Mortgage puts you in the strongest position to buy.";

// Generates localized body copy (with ## subheadings) for any page that has no
// hand-written gen_intro/custom copy. Lets us roll out cities without seeding
// long copy per row; custom_body/custom_intro always override.
export function generatedBody(page: SeoPage): string {
  const city = page.city || "Southwest Louisiana";
  const fact = CITY_FACTS[city] || `${city} is part of Southwest Louisiana — an affordable, friendly place to call home.`;
  const t = page.page_type;
  const fk = page.feature_key;

  if (t === "city") {
    return [
      fact,
      `## Homes for sale in ${city}\nFrom starter homes to acreage and new construction, ${city} offers a range of properties at prices that stay attainable compared with much of the country. Browse the live listings above to see what's available right now.`,
      `## Buying in ${city} with The Land & Home Group\n${CLOSE_CTA}`,
    ].join("\n\n");
  }
  if (t === "land") {
    return [
      `${fact} Land is one of the most active segments of the market here.`,
      `## Land for sale in ${city}\nFrom build-ready lots to wooded and pasture acreage, ${city} offers parcels across a wide range of sizes and price points — ideal for building a custom home, investing, or simply finding room to spread out.`,
      `## Before you buy land\nConfirm zoning, available utilities, access, and drainage for any parcel before purchasing. The Land & Home Group can help you evaluate options and line up financing through Bayou Mortgage.`,
    ].join("\n\n");
  }
  if (t === "single_family") {
    return [
      fact,
      `## Single-family homes in ${city}\nSingle-family homes are the heart of the ${city} market — from classic ranch styles to newer construction — and remain attainable for first-time and move-up buyers alike.`,
      `## Ready to tour?\n${CLOSE_CTA}`,
    ].join("\n\n");
  }
  if (t === "mobile") {
    return [
      fact,
      `## Mobile & manufactured homes in ${city}\nMobile and manufactured homes are one of the most affordable paths to ownership in ${city}, and many are sold on their own land — combining a budget-friendly home with the value of the property underneath it.`,
      `## Financing\nManufactured-home financing differs from a standard mortgage; confirm land ownership and utilities up front. The Land & Home Group and Bayou Mortgage can walk you through it.`,
    ].join("\n\n");
  }
  if (t === "beds") {
    return [
      fact,
      `## Larger homes in ${city}\nFour-bedroom and larger homes give growing and multi-generational families room to spread out — and ${city} keeps them attainable compared with most of the country.`,
      `## Ready to tour?\n${CLOSE_CTA}`,
    ].join("\n\n");
  }
  // feature pages
  const featBlocks: Record<string, string> = {
    single_story: `## One-level living in ${city}\nSingle-story homes are popular in ${city} for their easy accessibility, simpler maintenance, and open, connected layouts — a great fit for families and downsizers alike.`,
    acre_plus: `## Acreage and large lots in ${city}\nProperties on an acre or more give you space for a shop, animals, gardens, or simply privacy. ${city} and the surrounding countryside offer a healthy selection.`,
    pool: `## Pool homes in ${city}\nThrough the warm Southwest Louisiana summers, a backyard pool turns a house into a retreat. ${city} offers pool homes across a range of neighborhoods and price points.`,
    new_construction: `## New construction in ${city}\nNew builds bring modern layouts, energy efficiency, and warranties. Browse new-construction homes in ${city}, from move-in ready to still being built.`,
    waterfront: `## Waterfront living in ${city}\nWaterfront property is among the most sought-after in the area, offering boating, fishing, and views right out the back door. Look closely at docks, bulkheads, and access when you tour.`,
    updated: `## Updated & remodeled homes in ${city}\nMove-in-ready, recently updated homes save you the work of renovating. Browse remodeled homes in ${city} with newer kitchens, baths, and systems.`,
    garage: `## Homes with garages in ${city}\nGarage space means storage, workshop room, and protected parking. Browse ${city} homes with attached and detached garages.`,
  };
  const block = (fk && featBlocks[fk]) || `## ${pageTopicLabel(page)} in ${city}\nBrowse ${topicNoun(page)} for sale in ${city}, updated live throughout the day.`;
  return [fact, block, `## Ready to tour?\n${CLOSE_CTA}`].join("\n\n");
}

export function resolveContent(page: SeoPage): ResolvedContent {
  const cityLa = page.city ? `${page.city}, LA` : "Southwest Louisiana";
  const topic = pageTopicLabel(page);
  const h1 = page.custom_h1 || page.gen_h1 || `${topic} in ${cityLa}`;
  const title = page.custom_meta_title || page.gen_meta_title || `${h1} | ${site.name}`;
  const metaDesc =
    page.custom_meta_desc ||
    page.gen_meta_desc ||
    `Browse ${topic.toLowerCase()} in ${cityLa} with ${site.name}. Live MLS listings, updated throughout the day.`;
  const intro = page.custom_intro || page.gen_intro || generatedBody(page);
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
