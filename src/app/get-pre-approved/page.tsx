import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import GetPreApprovedClient from "./GetPreApprovedClient";

export const metadata: Metadata = pageMetadata({
  title: "Get Pre-Approved | Check Your Home Loan Eligibility",
  description:
    `Check your home loan eligibility in about two minutes — estimated payment, debt-to-income, and which loan programs fit, including $0-down options. Powered by ${site.bayou.name}.`,
  path: "/get-pre-approved",
  image: site.bayou.headshotUrl,
  imageAlt: site.bayou.repName,
});

export default function GetPreApprovedPage() {
  return <GetPreApprovedClient />;
}
