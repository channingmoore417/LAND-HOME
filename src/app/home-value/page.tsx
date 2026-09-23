import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import HomeValueClient from "./HomeValueClient";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema, agentSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/seoConfig";

export const metadata: Metadata = pageMetadata({
  title: "What's My Home Worth? Free Home Value Estimate",
  description:
    `Free home value estimate for your Lake Charles or Southwest Louisiana home, built from recent comparable sales. Instant, no pressure, no obligation.`,
  path: "/home-value",
});

export default function HomeValuePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Free Home Value Estimate",
            serviceType: "Home valuation",
            url: `${SITE_URL}/home-value`,
            areaServed: { "@type": "AdministrativeArea", name: "Southwest Louisiana" },
            provider: agentSchema(),
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description: `Free home value estimate from ${site.name}, built from recent comparable sales.`,
          },
          breadcrumbSchema([["Home", "/"], ["What's My Home Worth?", "/home-value"]]),
        ]}
      />
      <HomeValueClient />
    </>
  );
}
