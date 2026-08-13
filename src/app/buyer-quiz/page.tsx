import type { Metadata } from "next";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seoMeta";
import BuyerQuizClient from "./BuyerQuizClient";

export const metadata: Metadata = pageMetadata({
  title: "Find Your Southwest Louisiana Home Match | Buyer Quiz",
  description:
    `Answer a few quick questions about your ideal community, price range, and must-haves, and ${site.name} will match you with homes for sale across Southwest Louisiana.`,
  path: "/buyer-quiz",
});

export default function BuyerQuizPage() {
  return <BuyerQuizClient />;
}
