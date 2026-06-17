// ============================================================
// Single source of truth for global header + footer content.
// Edit here — no component code changes needed.
// ============================================================

export const site = {
  name: "The Land & Home Group",
  brokerage: "EXIT Realty Southern",
  phone: "(337) 245-0909",
  phoneHref: "tel:+13372450909",
  logoUrl:
    "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a29b0edff11dedc40eb9d4e.png",
  teamPhotoUrl:
    "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/69dd43d3328c56e1a03d8884.jpg",
  serviceArea: "Sulphur & Lake Charles, LA",

  nav: [
    { label: "Buy", href: "/buy" },
    { label: "Sell", href: "/sell" },
    { label: "Listings", href: "/listings" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ],

  footer: {
    blurb:
      "Modern coastal real estate, brokered by EXIT Realty Southern. Serving Sulphur, Lake Charles and Southwest Louisiana with a personal, no-pressure approach.",
    columns: [
      {
        title: "Popular Searches",
        links: [
          { label: "Lake Charles Homes for Sale", href: "/lake-charles/homes-for-sale" },
          { label: "Land for Sale in Lake Charles", href: "/lake-charles/land-for-sale" },
          { label: "Waterfront Homes in Lake Charles", href: "/lake-charles/waterfront-homes" },
          { label: "All SWLA Listings", href: "/listings" },
        ],
      },
      {
        title: "Connect",
        links: [
          { label: "(337) 245-0909", href: "tel:+13372450909" },
          { label: "thelandhomegroup", href: "https://instagram.com/thelandhomegroup" },
          { label: "Lake Charles, LA", href: "/contact" },
          { label: "Schedule a Call", href: "/contact" },
        ],
      },
    ],
    legal:
      "Equal Housing Opportunity · Information deemed reliable but not guaranteed.",
  },

  // Bayou Mortgage partner module (the referral flywheel).
  bayou: {
    name: "Bayou Mortgage",
    logoUrl:
      "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/64b0048711553d23dbe46d69.png",
    headline: "Get a Real Rate with Bayou Mortgage",
    sub: "Our preferred local Louisiana lender. No-pressure quote — see your true monthly payment in minutes.",
    ctaLabel: "Get My Quote",
    ctaHref: "https://bayou-mortgage.com",
    disclosure:
      "Estimates only and not a commitment to lend. Channing Moore | NMLS #1235512 | Bayou Mortgage LLC | NMLS #1845349 | Licensed in Louisiana | Equal Housing Lender. Rates shown are example estimates — contact for current rates and APR.",
  },

  // Local SEO — the client's Google Business Profile (used for the map embed
  // + RealEstateAgent/LocalBusiness geo coordinates in structured data).
  localSeo: {
    gbpName: "Lauren Bane Huffman | Lake Charles Realtor",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4300.206904046305!2d-93.3336138!3d30.227165499999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x863b8f69b8ed9fe9%3A0x9064a40b358210a0!2sLauren%20Bane%20Huffman%20%7C%20Lake%20Charles%20Realtor!5e1!3m2!1sen!2sus!4v1781719708228!5m2!1sen!2sus",
    latitude: 30.2271655,
    longitude: -93.3336138,
    city: "Lake Charles",
    region: "LA",
  },
} as const;
