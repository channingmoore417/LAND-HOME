import { NextResponse, type NextRequest } from "next/server";
import { hasAdSuffix } from "@/config/site";

// Ad-mode URLs: <any page>/GA serves that page unchanged (rewrite — the
// address bar keeps /GA), and the client sees the suffix via usePathname()
// to hide the header + show the capture gate. Ad-mode URLs are noindex so
// they never compete with the real page in organic search.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!hasAdSuffix(pathname)) return NextResponse.next();

  const url = req.nextUrl.clone();
  const parts = pathname.replace(/\/+$/, "").split("/");
  parts.pop();
  url.pathname = parts.join("/") || "/";

  const res = NextResponse.rewrite(url);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a dot).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};

