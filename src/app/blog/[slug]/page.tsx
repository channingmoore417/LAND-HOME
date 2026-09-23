import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPost, getPosts, categorySlug, extractFaqs } from "@/lib/blog";
import { photo } from "@/lib/images";
import { site } from "@/config/site";
import BlogBody from "@/components/BlogBody";
import BlogCover from "@/components/BlogCover";
import AuthorCard from "@/components/AuthorCard";
import JsonLd from "@/components/JsonLd";
import RecentlyViewedBox from "@/components/RecentlyViewedBox";
import ListingAlertsQuiz, { OpenListingAlertsButton } from "@/components/ListingAlertsQuiz";
import MobileActionBar from "@/components/MobileActionBar";
import CtaBand from "@/components/CtaBand";
import SellStatsBox from "@/components/SellStatsBox";
import { getSellStats, fillSellTokens } from "@/lib/sellStats";
import { pageMetadata } from "@/lib/seoMeta";

export const dynamic = "force-dynamic";

import { SITE_URL as SITE } from "@/lib/seoConfig";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: "Post not found" };
  const stats = post.market_slug ? await getSellStats(post.market_slug) : null;
  const title = fillSellTokens(post.meta_title || post.title, stats);
  const description = fillSellTokens(post.meta_description || post.excerpt || `${title} — ${site.name}`, stats);
  return pageMetadata({
    title,
    description,
    path: `/blog/${post.slug}`,
    image: post.cover_image ? photo(post.cover_image, 1200) : undefined,
    imageAlt: post.title,
    type: "article",
  });
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const related = (await getPosts({ category: post.category, limit: 4 })).filter((p) => p.slug !== post.slug).slice(0, 3);
  const pageUrl = `${SITE}/blog/${post.slug}`;
  // City selling posts carry live MLS numbers as {{tokens}}.
  const stats = post.market_slug ? await getSellStats(post.market_slug) : null;
  const body = fillSellTokens(post.body, stats);
  const faqs = extractFaqs(body);
  // City selling posts talk to homeowners, so their CTAs are seller CTAs.
  const seller = !!stats;
  const cityName = stats?.city || post.city || "your area";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: fillSellTokens(post.meta_description || post.excerpt || "", stats) || undefined,
      datePublished: post.published_at,
      author: {
        "@type": "Person",
        name: site.blogAuthor.name,
        jobTitle: "Team Leader, " + site.name,
        worksFor: { "@type": "RealEstateAgent", name: site.name },
        url: `${SITE}/about`,
        image: site.blogAuthor.photoUrl,
        sameAs: [site.blogAuthor.gbpUrl, site.blogAuthor.instagramUrl, site.blogAuthor.facebookUrl],
      },
      publisher: { "@type": "RealEstateAgent", name: site.name },
      mainEntityOfPage: pageUrl,
      ...(post.cover_image ? { image: post.cover_image } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: pageUrl },
      ],
    },
    ...(faqs.length
      ? [{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }]
      : []),
  ];

  return (
    <>
      <JsonLd data={jsonLd} />
      {!seller && <ListingAlertsQuiz city={post.city} source={post.slug} />}
      <MobileActionBar seller={seller} />
      <header className="hero hero--index hero--article">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <nav className="hero__crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> &nbsp;/&nbsp; <Link href="/blog">Blog</Link> &nbsp;/&nbsp;{" "}
            <Link href={`/blog/category/${categorySlug(post.category)}`}>{post.category}</Link>
          </nav>
          <h1 className="article__title">{post.title}</h1>
          <div className="article__byline">
            By {site.blogAuthor.name} · {fmtDate(post.published_at)}{post.read_minutes ? ` · ${post.read_minutes} min read` : ""}
          </div>
          <div className="article__ctas">
            {seller ? (
              <Link className="btn btn--aqua" href="/home-value">What&apos;s My Home Worth?</Link>
            ) : (
              <OpenListingAlertsButton className="btn btn--aqua">Get New Listings First</OpenListingAlertsButton>
            )}
            <a className="btn btn--hollow" href={site.phoneHref}>Call {site.phone}</a>
          </div>
        </div>
        <svg className="hero__wave" viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0,40 C240,90 480,90 720,55 C960,20 1200,20 1440,55 L1440,90 L0,90 Z" fill="#F8FAFB" />
        </svg>
      </header>

      <main className="results">
        <div className="wrap" style={{ maxWidth: 760 }}>
          {post.cover_image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="article__cover" src={photo(post.cover_image, 1400)} alt={post.title} />
          )}

          {stats && <SellStatsBox s={stats} />}
          {seller && (
            <CtaBand
              text={<>Want to know what <strong>your</strong> {cityName} home would sell for?</>}
              actions={[
                { kind: "link", label: "Get My Free Home Value", href: "/home-value", primary: true },
                { kind: "link", label: "Get a Cash Offer", href: "/sell-my-house-fast" },
              ]}
            />
          )}

          <BlogBody markdown={body} />

          <AuthorCard />

          {/* CTA */}
          {seller ? (
            <section className="article__cta">
              <span className="script">thinking about selling?</span>
              <h2>Find out what your {cityName} home is worth</h2>
              <p>Get a free home value based on real local sales, or a cash offer if you need to sell as-is. No pressure either way.</p>
              <div className="article__cta-row">
                <Link className="btn btn--aqua" href="/home-value">Get My Free Home Value</Link>
                <Link className="btn btn--hollow" href="/sell-my-house-fast">Get a Cash Offer</Link>
                <a className="btn btn--hollow" href={site.phoneHref}>Call {site.phone}</a>
              </div>
            </section>
          ) : (
            <section className="article__cta">
              <span className="script">ready when you are</span>
              <h2>Thinking about a move in Southwest Louisiana?</h2>
              <p>Take our 60-second buyer quiz, get a free home value, or just reach out — no pressure.</p>
              <div className="article__cta-row">
                <Link className="btn btn--aqua" href="/buyer-quiz">Take the Buyer Quiz</Link>
                <Link className="btn btn--hollow" href="/home-value">What&apos;s My Home Worth?</Link>
                <a className="btn btn--hollow" href={site.phoneHref}>Call {site.phone}</a>
              </div>
            </section>
          )}

          <RecentlyViewedBox />

          {related.length > 0 && (
            <section className="article__related">
              <h2 className="section__title">Keep reading</h2>
              <div className="bgrid">
                {related.map((p) => (
                  <Link key={p.id} className="bcard" href={`/blog/${p.slug}`}>
                    <BlogCover slug={p.slug} title={p.title} category={p.category} cover={p.cover_image} />
                    <div className="bcard__body">
                      <h3 className="bcard__title">{p.title}</h3>
                      <span className="bcard__meta">Read more &rarr;</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </>
  );
}
