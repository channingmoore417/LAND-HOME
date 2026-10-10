import Link from "next/link";
import BlogBody from "@/components/BlogBody";
import ListingCard from "@/components/ListingCard";
import { fetchCards, fetchFirstPhotos, type ListingCriteria } from "@/lib/listings";

// Blog bodies are markdown. A line of the form
//   {{listings city=Sulphur max=250000 features=pool,shop limit=3 href=/sulphur/homes-under-250k label="See all"}}
// is replaced at render time with live cards read from Supabase (never Trestle).
// Supported keys: city, min, max, beds, category(land|single_family|mobile),
// features (comma list of feature keys), zip, hood (subdivision keywords,
// comma list), limit (default 3, max 6), href, label.
const DIRECTIVE = /^\{\{listings\s+(.*?)\}\}\s*$/;

function parseArgs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/(\w+)=(?:"([^"]*)"|(\S+))/g)) out[m[1]] = m[2] ?? m[3];
  return out;
}

function toCriteria(a: Record<string, string>): ListingCriteria {
  const num = (v?: string) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);
  return {
    city: a.city,
    priceMin: num(a.min),
    priceMax: num(a.max),
    bedsMin: num(a.beds),
    category: (["land", "single_family", "mobile"] as const).find((c) => c === a.category),
    features: a.features ? a.features.split(",").filter(Boolean) : undefined,
    postalCode: a.zip,
    subdivisionAny: a.hood ? a.hood.split(",").filter(Boolean) : undefined,
  };
}

async function LiveListings({ args }: { args: Record<string, string> }) {
  const limit = Math.min(Math.max(Number(args.limit) || 3, 1), 6);
  const { rows, total } = await fetchCards(toCriteria(args), { limit, sort: "new" });
  if (rows.length === 0) return null; // no stale/empty block: just omit
  const photos = await fetchFirstPhotos(rows.map((r) => r.listing_key));
  for (const r of rows) r.photo_url = photos.get(r.listing_key) ?? null;
  return (
    <aside className="article__live" aria-label="Current listings">
      <div className="listings__grid">
        {rows.map((c) => <ListingCard key={c.listing_key} c={c} />)}
      </div>
      {args.href && (
        <p style={{ textAlign: "center", marginTop: 16 }}>
          <Link className="btn btn--aqua" href={args.href}>
            {args.label || `See all ${total} listings`}
          </Link>
        </p>
      )}
    </aside>
  );
}

export default function BlogContent({ markdown }: { markdown: string }) {
  const parts: ({ md: string } | { args: Record<string, string> })[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.join("").trim()) parts.push({ md: buf.join("\n") });
    buf = [];
  };
  for (const line of markdown.split("\n")) {
    const m = DIRECTIVE.exec(line.trim());
    if (m) { flush(); parts.push({ args: parseArgs(m[1]) }); } else buf.push(line);
  }
  flush();
  return (
    <>
      {parts.map((p, i) => "md" in p
        ? <BlogBody key={i} markdown={p.md} />
        : <LiveListings key={i} args={p.args} />)}
    </>
  );
}
