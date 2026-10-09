import { site } from "@/config/site";

// Schema.org fragments built from site.nap so every RealEstateAgent block on
// the site carries the exact same NAP as the Google Business Profile.
export function napAddress() {
  const n = site.nap;
  return {
    "@type": "PostalAddress",
    streetAddress: n.street,
    addressLocality: n.city,
    addressRegion: n.region,
    postalCode: n.postalCode,
    addressCountry: "US",
  };
}

export function napSchema() {
  const n = site.nap;
  return {
    address: napAddress(),
    geo: { "@type": "GeoCoordinates", latitude: site.localSeo.latitude, longitude: site.localSeo.longitude },
    hasMap: n.mapsUrl,
    openingHoursSpecification: [
      { "@type": "OpeningHoursSpecification", dayOfWeek: [...n.openDays], opens: n.opens, closes: n.closes },
    ],
  };
}
