import Link from "next/link";
import { site } from "@/config/site";
import AwardList from "@/components/AwardList";

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Author bio card for blog posts — supports Google E-E-A-T with a real,
// credentialed author (the team leader): bio, social profiles, and the
// office's Google Business Profile map.
export default function AuthorCard() {
  const a = site.blogAuthor;
  return (
    <aside className="authorcard" aria-label={`About the author, ${a.name}`}>
      <div className="authorcard__top">
        <div className="authorcard__avatar" aria-hidden>
          {a.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.photoUrl} alt={a.name} />
          ) : (
            <span>{initials(a.name)}</span>
          )}
        </div>
        <div className="authorcard__body">
          <span className="authorcard__eyebrow">Written by</span>
          <div className="authorcard__name">{a.name}</div>
          <div className="authorcard__title">{a.title}</div>
          <AwardList compact />
          <p className="authorcard__bio">{a.bio}</p>
          <div className="authorcard__social">
            <a href={a.instagramUrl} target="_blank" rel="noopener" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8zm0 8.1a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zm5.1-9.4a1.1 1.1 0 1 0 0 2.3 1.1 1.1 0 0 0 0-2.3z" /></svg>
              Instagram
            </a>
            <a href={a.facebookUrl} target="_blank" rel="noopener" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.3v7A10 10 0 0 0 22 12z" /></svg>
              Facebook
            </a>
            <a href={a.gbpUrl} target="_blank" rel="noopener">★ 5.0 on Google</a>
          </div>
          <div className="authorcard__links">
            <Link href={a.url}>Meet the team</Link>
            <a href={site.phoneHref}>{site.phone}</a>
          </div>
        </div>
      </div>
      <div className="authorcard__map">
        <iframe
          src={site.localSeo.mapEmbedUrl}
          title={`${site.name} office on Google Maps`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </aside>
  );
}
