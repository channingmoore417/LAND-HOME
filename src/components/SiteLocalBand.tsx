"use client";

import { usePathname } from "next/navigation";
import LocalMap from "@/components/LocalMap";

// Site-wide "find us" band (Google Business Profile map + full NAP), rendered
// once from the root layout above the footer so every page carries it.
// City pages (/sulphur/…, /lake-charles/…) get their city's wording.
// Skipped where a page already renders its own map (listing detail, contact)
// and on private pages.
const SKIP = [/^\/listings\//, /^\/contact(\/|$)/, /^\/admin(\/|$)/, /^\/account(\/|$)/];

export default function SiteLocalBand({ cities }: { cities: { label: string; href: string }[] }) {
  const path = usePathname() || "/";
  if (SKIP.some((re) => re.test(path))) return null;

  const seg = path.split("/")[1];
  const city = seg ? cities.find((c) => c.href === `/${seg}/homes-for-sale`) : undefined;

  return city ? (
    <LocalMap cityLabel={city.label} href={city.href} ctaLabel={`Browse ${city.label} listings`} showPhoto={false} />
  ) : (
    <LocalMap href="/homes-for-sale" ctaLabel="Browse all listings" showPhoto={false} />
  );
}
