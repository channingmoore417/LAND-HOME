import Link from "next/link";
import { site } from "@/config/site";

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

// Author bio card for blog posts — supports Google E-E-A-T with a real,
// credentialed author (the team leader).
export default function AuthorCard() {
  const a = site.blogAuthor;
  return (
    <aside className="authorcard">
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
        <p className="authorcard__bio">{a.bio}</p>
        <div className="authorcard__links">
          <Link href={a.url}>Meet the team</Link>
          <a href={a.gbpUrl} target="_blank" rel="noopener">★ 5.0 on Google</a>
          <a href={site.phoneHref}>{site.phone}</a>
        </div>
      </div>
    </aside>
  );
}
