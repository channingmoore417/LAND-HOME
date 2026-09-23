import type { Metadata } from "next";
import Link from "next/link";
import { getPosts, categorySlug, type BlogPost } from "@/lib/blog";
import BlogCover from "@/components/BlogCover";
import { pageMetadata } from "@/lib/seoMeta";
import JsonLd from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";
import { SITE_URL } from "@/lib/seoConfig";
import { site } from "@/config/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({
  title: "Southwest Louisiana Real Estate Blog",
  description:
    "Local guides to buying, selling and moving to Lake Charles and Southwest Louisiana: neighborhoods, relocation, first-time buyers and the buying process.",
  path: "/blog",
});

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
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "Southwest Louisiana Real Estate Guides",
            url: `${SITE_URL}/blog`,
            publisher: { "@type": "RealEstateAgent", name: site.name, url: SITE_URL },
            blogPost: posts.slice(0, 20).map((p) => ({
              "@type": "BlogPosting",
              headline: p.title,
              url: `${SITE_URL}/blog/${p.slug}`,
              datePublished: p.published_at,
            })),
          },
          breadcrumbSchema([["Home", "/"], ["Blog", "/blog"]]),
        ]}
      />
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
