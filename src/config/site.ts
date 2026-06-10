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
        title: "Explore",
        links: [
          { label: "Buy a Home", href: "/buy" },
          { label: "Sell Your Home", href: "/sell" },
          { label: "All Listings", href: "/listings" },
          { label: "Neighborhoods", href: "/neighborhoods" },
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
} as const;
