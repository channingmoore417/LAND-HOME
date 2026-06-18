import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, categorySlug, type BlogPost } from "@/lib/blog";
import BlogCover from "@/components/BlogCover";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Southwest Louisiana Real Estate Blog",
  description:
    "Local guides for buying and selling in Lake Charles and Southwest Louisiana — neighborhoods, moving tips, the buying process, first-time buyer help, and market know-how from The Land & Home Group.",
};

function PostCard({ p, big }: { p: BlogPost; big?: boolean }) {
  return (
    <Link className={`bcard${big ? " bcard--big" : ""}`} href={`/blog/${p.slug}`}>
      <BlogCover slug={p.slug} title={p.title} category={p.category} cover={p.cover_image} big={big} />
      <div className="bcard__body">
        <h3 className="bcard__title">{p.title}</h3>
        {p.excerpt && <p className="bcard__ex">{p.excerpt}</p>}
        <span className="bcard__meta">{p.read_minutes ? `${p.read_minutes} min read` : "Read more"} &rarr;</span>
      </div>
    </Link>
  );
}

export default async function BlogIndex() {
  const posts = await getPosts();
  const cats = [...new Set(posts.map((p) => p.category))];
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.id !== featured?.id);

  return (
    <>
      <header className="hero hero--index">
        <div className="wrap">
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; Blog
          </nav>
          <span className="hero__script">local know-how</span>
          <h1>Southwest Louisiana Real Estate Guides</h1>
          <p className="hero__sub">
            Straight, local answers for buying and selling in Lake Charles and across SWLA — neighborhoods,
            moving tips, the buying and selling process, and market insight from a team that lives here.
          </p>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap">
          {cats.length > 0 && (
            <div className="bcats">
              <span className="bcats__on">All</span>
              {cats.map((c) => (
                <Link key={c} href={`/blog/category/${categorySlug(c)}`}>{c}</Link>
              ))}
            </div>
          )}

          {posts.length === 0 ? (
            <p className="prose">New local guides are on the way — check back soon.</p>
          ) : (
            <>
              {featured && <PostCard p={featured} big />}
              <div className="bgrid">
                {rest.map((p) => <PostCard key={p.id} p={p} />)}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
