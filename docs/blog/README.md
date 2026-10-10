# 90-day blog plan

`90-day-blog-plan.csv` is the refined calendar (Oct 10 2026 – Jan 7 2027). Every internal link was checked against `seo_pages`, the published `blog_posts`, and the tool pages.

## Live listings in a post

Put a directive on its own line in the post's markdown body (`blog_posts.body`). It renders live cards from Supabase on each pageview (never Trestle) and is omitted if nothing matches.

```
{{listings city="Moss Bluff" max=300000 limit=3 href=/moss-bluff/homes-under-300k label="See all Moss Bluff homes under $300K"}}
```

Keys: `city`, `min`, `max`, `beds`, `category` (land|single_family|mobile), `features` (comma list: pool, garage, waterfront, fireplace, new_construction, updated, single_story, acre_plus, shop, fixer, golf, owner_financing), `zip`, `hood` (subdivision keywords, comma list), `limit` (1-6, default 3), `href`, `label`. Quote values containing spaces.

Implemented in `src/components/BlogContent.tsx`.

## Sold data

Closed sales live in the `sold_comps` table (synced by `trestle-sync?mode=sold`, 18 months back). The site does not display it yet: the `{{listings}}` embed reads active listings only. When writing "sold comps" sections, query by ZIP or subdivision rather than city (Moss Bluff and Carlyss closings are often filed under other cities), use medians, and cite the sample size.
