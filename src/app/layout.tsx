import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import AuthProvider from "@/components/AuthProvider";
import { site } from "@/config/site";
import { SITE_URL } from "@/lib/seoConfig";
import "./globals.css";

const DESC =
  "The Land & Home Group — your Lake Charles realtor and Southwest Louisiana real estate team. Browse homes for sale, get a free home value, and work with trusted local agents.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${site.name} | Lake Charles Real Estate`, template: `%s | ${site.name}` },
  description: DESC,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          <SiteHeader />
          {children}
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
