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

  // Some titles come from hand-authored CMS data (blog post meta_title,
  // seo_pages custom_meta_title) that may already end in "| {site.name}".
  // Append it once, and always emit title.absolute — bypassing the layout's
  // "%s | site.name" template entirely — so a title can never get the site
  // name appended twice regardless of what the source data already contains.
  const suffix = ` | ${site.name}`;
  const fullTitle = title.endsWith(suffix) || title === site.name ? title : `${title}${suffix}`;

  return {
    title: { absolute: fullTitle },
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
