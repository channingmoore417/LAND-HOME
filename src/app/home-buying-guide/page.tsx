import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import HomeBuyingGuideClient from "./HomeBuyingGuideClient";

export const metadata: Metadata = pageMetadata({
  title: "The Southwest Louisiana Home Buyer's Guide | Free Download",
  description:
    `Everything you need to buy with confidence in Southwest Louisiana — from getting pre-approved to closing day. Free instant download from ${site.name}.`,
  path: "/home-buying-guide",
});

export default function BuyingGuidePage() {
  return <HomeBuyingGuideClient />;
}
