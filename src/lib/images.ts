// ============================================================
// Photo delivery. Trestle/Cotality media_urls are signed and EXPIRE, and
// they're full-size + unoptimized. Routing them through Cloudinary's fetch
// delivery (f_auto,q_auto) caches a copy on first hit — so images stay fast
// and keep working even after the original signed URL expires.
//
// No-op passthrough when NEXT_PUBLIC_CLOUDINARY_CLOUD is unset, so this is
// safe to ship before Cloudinary is configured.
// ============================================================

const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD;

export function photo(url: string | null | undefined, width = 1600): string {
  if (!url) return "";
  if (!CLOUD) return url;
  const tx = ["f_auto", "q_auto", "c_limit", `w_${width}`].join(",");
  return `https://res.cloudinary.com/${CLOUD}/image/fetch/${tx}/${encodeURIComponent(url)}`;
}
