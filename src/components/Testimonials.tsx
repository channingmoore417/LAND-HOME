import { REVIEWS } from "@/lib/reviews";

function Stars() {
  return (
    <span className="tw-stars" aria-label="5 out of 5 stars">
      {"★★★★★"}
    </span>
  );
}

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Client review wall (social proof). Server component.
export default function Testimonials({ reviewsUrl, max }: { reviewsUrl?: string; max?: number }) {
  const list = max ? REVIEWS.slice(0, max) : REVIEWS;
  return (
    <section className="tw">
      <div className="wrap">
        <div className="tw__head">
          <span className="script" style={{ fontSize: "1.7rem" }}>don&apos;t take our word for it</span>
          <h2 className="section__title" style={{ marginTop: 0 }}>What our clients say</h2>
          <p className="tw__sub">
            <Stars /> &nbsp;Rated 5 stars by buyers and sellers across Southwest Louisiana · Reviews from Google
          </p>
        </div>
        <div className="tw__grid">
          {list.map((r) => (
            <figure className="tw__card" key={r.name}>
              <Stars />
              <blockquote>{r.text}</blockquote>
              <figcaption>
                <span className="tw__avatar" aria-hidden="true">{initials(r.name)}</span>
                <span>
                  <span className="tw__name">{r.name}</span>
                  <span className="tw__when">{r.when}</span>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
        {reviewsUrl && (
          <div className="home-cta">
            <a className="btn btn--primary" href={reviewsUrl} target="_blank" rel="noopener">Read More Reviews on Google</a>
            <a className="btn btn--ghost" href="/home-value">Get Your Free Home Value</a>
          </div>
        )}
      </div>
    </section>
  );
}
