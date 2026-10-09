import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import GetPreApprovedClient from "./GetPreApprovedClient";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/seoConfig";

export const metadata: Metadata = pageMetadata({
  title: "Get Pre-Approved | Check Your Home Loan Eligibility",
  description:
    `Check your home loan eligibility in about two minutes: estimated payment, debt-to-income and which loan programs fit, including $0-down options.`,
  path: "/get-pre-approved",
  image: site.bayou.headshotUrl,
  imageAlt: site.bayou.repName,
});

export default function GetPreApprovedPage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Mortgage Pre-Approval Check",
            serviceType: "Mortgage pre-approval",
            url: `${SITE_URL}/get-pre-approved`,
            areaServed: { "@type": "State", name: "Louisiana" },
            provider: { "@type": "Organization", name: site.bayou.companyName },
          },
          breadcrumbSchema([["Home", "/"], ["Get Pre-Approved", "/get-pre-approved"]]),
        ]}
      />
      <GetPreApprovedClient />
    </>
  );
}
