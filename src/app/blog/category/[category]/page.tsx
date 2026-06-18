import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPosts, getCategories, categorySlug, type BlogPost } from "@/lib/blog";
import BlogCover from "@/components/BlogCover";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const cats = await getCategories();
  const cat = cats.find((c) => categorySlug(c) === params.category);
  return {
    title: cat ? `${cat} — SWLA Real Estate Blog` : "Blog Category",
    description: cat ? `${cat} guides for buying and selling in Lake Charles and Southwest Louisiana.` : undefined,
  };
}

export default async function BlogCategory({ params }: { params: { category: string } }) {
  const cats = await getCategories();
  const cat = cats.find((c) => categorySlug(c) === params.category);
  if (!cat) notFound();
  const posts = await getPosts({ category: cat });

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/blog">Blog</Link> &nbsp;/&nbsp; {cat}
          </nav>
          <span className="hero__script">local know-how</span>
          <h1>{cat}</h1>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          <div className="bcats">
            <Link href="/blog">All</Link>
            {cats.map((c) => (
              c === cat ? <span key={c} className="bcats__on">{c}</span>
                : <Link key={c} href={`/blog/category/${categorySlug(c)}`}>{c}</Link>
            ))}
          </div>
          <div className="bgrid">
            {posts.map((p: BlogPost) => (
              <Link key={p.id} className="bcard" href={`/blog/${p.slug}`}>
                <BlogCover slug={p.slug} title={p.title} category={p.category} cover={p.cover_image} />
                <div className="bcard__body">
                  <h3 className="bcard__title">{p.title}</h3>
                  {p.excerpt && <p className="bcard__ex">{p.excerpt}</p>}
                  <span className="bcard__meta">{p.read_minutes ? `${p.read_minutes} min read` : "Read more"} &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
