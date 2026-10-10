import type { Metadata } from "next";
import Script from "next/script";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import CaptureGate from "@/components/CaptureGate";
import ListingAlertsQuiz from "@/components/ListingAlertsQuiz";
import SiteLocalBand from "@/components/SiteLocalBand";
import AuthProvider from "@/components/AuthProvider";
import { site, AD_VISIT_KEY, AD_VISIT_COOKIE } from "@/config/site";
import { SITE_URL } from "@/lib/seoConfig";
import { getNavCityMenu } from "@/lib/seo";
import "./globals.css";

const DESC =
  "The Land & Home Group — your Lake Charles realtor and Southwest Louisiana real estate team. Browse homes for sale, get a free home value, and work with trusted local agents.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${site.name} | Lake Charles Real Estate`, template: `%s | ${site.name}` },
  description: DESC,
  icons: {
    icon: "https://assets.cdn.filesafe.space/xdGkCWotXaek58gmTbxt/media/6ab43fb08d8128ee4cb38e1b.jpg",
    apple: "https://assets.cdn.filesafe.space/xdGkCWotXaek58gmTbxt/media/6ab43fb08d8128ee4cb38e1b.jpg",
  },
  verification: {
    google: "UMH1v38QMsah0vOpy-uV5lPTIij5xk9Q_RLKQm4-SxI",
  },
  openGraph: {
    type: "website",
    siteName: site.name,
    url: SITE_URL,
    title: `${site.name} | Lake Charles Real Estate`,
    description: DESC,
    locale: "en_US",
    images: [{ url: site.teamPhotoUrl, width: 1200, height: 630, alt: `${site.name} — Lake Charles real estate team` }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} | Lake Charles Real Estate`,
    description: DESC,
    images: [site.teamPhotoUrl],
  },
};

// City/topic nav data changes rarely (new programmatic pages added
// occasionally, not per-request) — revalidate hourly rather than on every
// request, so pages that don't otherwise need dynamic rendering can still
// be statically generated.
export const revalidate = 3600;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Cities + their topic pages (mobile homes, new construction, 4+ bedroom,
  // etc.), fetched fresh from seo_pages so the nav/footer never drift out of
  // sync with which programmatic pages actually exist.
  const cityMenu = await getNavCityMenu();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Ad visit (came in via a /GA link): flag <html> before first paint so the header and hero stay hidden on every later page. */}
        <script dangerouslySetInnerHTML={{ __html: `try{var k=${JSON.stringify(AD_VISIT_KEY)};if(!sessionStorage.getItem(k)){var m=document.cookie.match(/(?:^|; )${AD_VISIT_COOKIE}=([^;]*)/);if(m)sessionStorage.setItem(k,decodeURIComponent(m[1]))}if(sessionStorage.getItem(k))document.documentElement.dataset.ad="1"}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Google tag (GA4 / Google Ads). Loads after the page is interactive; GA4 tracks client-side page changes on its own. */}
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-J59TGYC1RT" strategy="afterInteractive" />
        <Script id="gtag-init" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-J59TGYC1RT');`}
        </Script>
        <AuthProvider>
          <SiteHeader cityMenu={cityMenu} />
          {children}
          <SiteLocalBand cities={cityMenu.map((c) => ({ label: c.label, href: c.href }))} />
          <SiteFooter cityMenu={cityMenu} />
          <CaptureGate />
          <ListingAlertsQuiz global source="site" />
        </AuthProvider>
      </body>
    </html>
  );
}
