import { getLiveClient } from "@/lib/supabase";

export interface BlogPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  cover_image: string | null;
  category: string;
  city: string | null;
  author: string;
  read_minutes: number | null;
  meta_title: string | null;
  meta_description: string | null;
  featured: boolean;
  published_at: string;
  /** City page slug whose live selling numbers fill {{tokens}} in the body. */
  market_slug?: string | null;
}

const LIST_COLS =
  "id, slug, title, excerpt, cover_image, category, city, author, read_minutes, featured, published_at";

export async function getPosts(opts: { category?: string; limit?: number } = {}): Promise<BlogPost[]> {
  const sb = getLiveClient();
  let q = sb.from("blog_posts").select(LIST_COLS).eq("published", true).order("published_at", { ascending: false });
  if (opts.category) q = q.eq("category", opts.category);
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) { console.error("[blog] list failed:", error.message); return []; }
  return (data as BlogPost[]) ?? [];
}

export async function getPost(slug: string): Promise<BlogPost | null> {
  const sb = getLiveClient();
  const { data } = await sb.from("blog_posts").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return (data as BlogPost) ?? null;
}

export async function getCategories(): Promise<string[]> {
  const sb = getLiveClient();
  const { data } = await sb.from("blog_posts").select("category").eq("published", true);
  const set = new Set<string>(((data as { category: string }[]) ?? []).map((r) => r.category));
  return [...set];
}

export function categorySlug(category: string): string {
  return category.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// Pulls Q&A pairs out of a post's "Frequently Asked Questions" section for
// FAQPage schema. Questions may be "### Question" headings or "**Question**"
// lines; the answer is everything up to the next question or section.
export function extractFaqs(markdown: string): { q: string; a: string }[] {
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^#{1,3}\s+.*(frequently asked|faq)/i.test(l));
  if (start === -1) return [];
  const faqs: { q: string; a: string }[] = [];
  let cur: { q: string; a: string[] } | null = null;
  const flush = () => {
    if (cur && cur.a.join(" ").trim()) faqs.push({ q: cur.q, a: cur.a.join(" ").replace(/\s+/g, " ").trim() });
  };
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,2}\s/.test(line)) break; // next top-level section ends the FAQ
    const h = line.match(/^###\s+(.+)$/) || line.match(/^\*\*(.+\?)\*\*\s*$/);
    if (h) { flush(); cur = { q: h[1].trim(), a: [] }; continue; }
    if (cur && line.trim()) cur.a.push(line.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_`]/g, "").replace(/^[-*]\s+/, ""));
  }
  flush();
  return faqs;
}
