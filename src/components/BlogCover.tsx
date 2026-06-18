import { photo } from "@/lib/images";

// Branded blog cover. Uses a real photo if provided; otherwise a coastal
// brand-gradient "designed" cover with the category + headline overlaid.
const GRADIENTS = [
  "linear-gradient(135deg,#204860 0%,#163848 100%)",
  "linear-gradient(135deg,#1f5468 0%,#173a4a 100%)",
  "linear-gradient(135deg,#163848 0%,#2c627c 100%)",
  "linear-gradient(135deg,#23506a 0%,#13303f 100%)",
];

function pick(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

export default function BlogCover({
  slug,
  title,
  category,
  cover,
  big,
}: {
  slug: string;
  title: string;
  category: string;
  cover?: string | null;
  big?: boolean;
}) {
  return (
    <div className={`bcover${big ? " bcover--big" : ""}`} style={cover ? undefined : { backgroundImage: pick(slug) }}>
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="bcover__img" src={photo(cover, big ? 1200 : 700)} alt={title} loading="lazy" />
      )}
      <span className="bcover__veil" aria-hidden />
      <span className="bcover__cat">{category}</span>
      <span className="bcover__h">{title}</span>
      <span className="bcover__brand" aria-hidden>The Land &amp; Home Group</span>
      <svg className="bcover__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M0,55 C240,95 480,95 720,60 C960,25 1200,25 1440,60 L1440,90 L0,90 Z" fill="rgba(255,255,255,0.10)" />
        <path d="M0,68 C240,100 480,100 720,70 C960,40 1200,40 1440,70 L1440,90 L0,90 Z" fill="rgba(97,193,204,0.20)" />
      </svg>
    </div>
  );
}
