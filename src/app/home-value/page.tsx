import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import HomeValueClient from "./HomeValueClient";

export const metadata: Metadata = pageMetadata({
  title: "What's My Home Worth? Free Home Value Estimate",
  description:
    `Get a free, data-driven home value estimate for your Southwest Louisiana home in seconds, built from recent comparable sales. No pressure, no obligation — from ${site.name}.`,
  path: "/home-value",
});

export default function HomeValuePage() {
  return <HomeValueClient />;
}
