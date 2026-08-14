/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.cotality.com" },
      { protocol: "https", hostname: "api-trestle.corelogic.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "assets.cdn.filesafe.space" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async redirects() {
    return [
      // The search/browse page moved from /listings to /homes-for-sale.
      // Exact-path match only — /listings/[listingKey] detail pages are
      // a separate route and are unaffected.
      { source: "/listings", destination: "/homes-for-sale", permanent: true },
    ];
  },
};

export default nextConfig;
