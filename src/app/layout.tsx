import type { Metadata } from "next";
import Script from "next/script";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthProvider from "@/components/AuthProvider";
import { site } from "@/config/site";
import { SITE_URL } from "@/lib/seoConfig";
import { getNavCityMenu } from "@/lib/seo";
import "./globals.css";

const DESC =
  "The Land & Home Group — your Lake Charles realtor and Southwest Louisiana real estate team. Browse homes for sale, get a free home value, and work with trusted local agents.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${site.name} | Lake Charles Real Estate`, template: `%s | ${site.name}` },
  description: DESC,
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
    <html lang="en">
      <head>
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
        <AuthProvider>
          <SiteHeader cityMenu={cityMenu} />
          {children}
          <SiteFooter cityMenu={cityMenu} />
        </AuthProvider>
        {/* GHL (LeadConnector) chat widget — site-wide; also the A2P opt-in surface */}
        <Script
          src="https://widgets.leadconnectorhq.com/loader.js"
          data-resources-url="https://widgets.leadconnectorhq.com/chat-widget/loader.js"
          data-widget-id="6a92efa123454f63fecac23a"
          data-source="WEB_USER"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
