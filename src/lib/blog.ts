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
