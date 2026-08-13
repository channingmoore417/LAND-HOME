import type { Metadata } from "next";
import { site } from "@/config/site";
import { SITE_URL } from "@/lib/seoConfig";

// Shared builder so every page gets a consistent canonical + OpenGraph +
// Twitter card instead of silently inheriting the homepage's defaults from
// layout.tsx (which is what happens when a page sets its own title/description
// but no openGraph/twitter block of its own).
export function pageMetadata({
  title,
  description,
  path,
  image,
  imageAlt,
  noIndex,
  type = "website",
}: {
  title: string;
  description: string;
  path: string; // e.g. "/about", "" for home — no trailing slash
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const url = `${SITE_URL}${path}`;
  const img = image || site.teamPhotoUrl;
  return {
    title,
    description,
    alternates: { canonical: url },
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type,
      url,
      title,
      description,
      siteName: site.name,
      locale: "en_US",
      images: [{ url: img, width: 1200, height: 630, alt: imageAlt || title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [img],
    },
  };
}
