import { NextResponse, type NextRequest } from "next/server";
import { hasAdSuffix, AD_VISIT_COOKIE } from "@/config/site";

// Ad-mode URLs: <any page>/GA serves that page unchanged (rewrite — the
// address bar keeps /GA), and the client sees the suffix via usePathname()
// to hide the header + show the capture gate. Ad-mode URLs are noindex so
// they never compete with the real page in organic search.
// Any ad click flags the visit with a cookie (not just /GA URLs), so opening a
// listing in a new tab, dropping /GA, or landing with only gclid/UTMs still
// triggers the capture gate. The layout script restores it into sessionStorage.
function isAdClick(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const medium = (q.get("utm_medium") ?? "").toLowerCase();
  return (
    hasAdSuffix(req.nextUrl.pathname) ||
    q.has("gclid") || q.has("gbraid") || q.has("wbraid") ||
    ["cpc", "ppc", "paid", "paidsearch"].includes(medium)
  );
}

function flag(req: NextRequest, res: NextResponse) {
  if (!isAdClick(req)) return res;
  res.cookies.set(AD_VISIT_COOKIE, encodeURIComponent((req.nextUrl.pathname + req.nextUrl.search).slice(0, 400)), {
    path: "/", maxAge: 60 * 60 * 24, sameSite: "lax",
  });
  return res;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!hasAdSuffix(pathname)) return flag(req, NextResponse.next());

  const url = req.nextUrl.clone();
  const parts = pathname.replace(/\/+$/, "").split("/");
  parts.pop();
  url.pathname = parts.join("/") || "/";

  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return flag(req, res);
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a dot).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

