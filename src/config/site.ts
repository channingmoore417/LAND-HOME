// ============================================================
// Single source of truth for global header + footer content.
// Edit here — no component code changes needed.
// ============================================================

export const site = {
  name: "The Land & Home Group",
  brokerage: "EXIT Realty Southern",
  phone: "(713) 314-6466",
  phoneHref: "tel:+17133146466",
  email: "lauren@landhomegroup.com",
  emailHref: "mailto:lauren@landhomegroup.com",
  logoUrl:
    "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a29b0edff11dedc40eb9d4e.png",
  teamPhotoUrl:
    "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/69dd43d3328c56e1a03d8884.jpg",
  serviceArea: "Sulphur & Lake Charles, LA",

  nav: [
    {
      label: "Buy",
      href: "/buy",
      // Per-city (and per-city-topic: mobile homes, new construction,
      // 4+ bedroom, etc.) links are NOT hand-maintained here — they're
      // fetched live from seo_pages (see getNavCityMenu in lib/seo.ts) and
      // rendered by SiteHeader as a nested Buy > City > Topic menu, so this
      // list never drifts out of sync with which programmatic pages exist.
      children: [
        { label: "All Homes for Sale", href: "/homes-for-sale" },
        { label: "Work With a Buyer's Agent", href: "/buyers-agent" },
      ],
    },
    {
      label: "Sell",
      href: "/home-value",
      children: [
        { label: "What's My Home Worth?", href: "/home-value" },
        { label: "Sell Fast for Cash (As-Is)", href: "/sell-my-house-fast" },
      ],
    },
    { label: "Our Listings", href: "/our-listings" },
    { label: "Blog", href: "/blog" },
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
          { label: "Sell My House Fast (Cash Offer)", href: "/sell-my-house-fast" },
          { label: "All SWLA Listings", href: "/homes-for-sale" },
        ],
      },
      {
        title: "Connect",
        links: [
          { label: "(713) 314-6466", href: "tel:+17133146466" },
          { label: "thelandhomegroup", href: "https://instagram.com/thelandhomegroup" },
          { label: "Lake Charles, LA", href: "/contact" },
          { label: "Schedule a Call", href: "/contact" },
        ],
      },
    ],
    legal:
      "Equal Housing Opportunity · Information deemed reliable but not guaranteed.",
    legalLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },

  // Mortgage partner module (the referral flywheel). Bayou Mortgage LLC has
  // closed; this is now Channing Moore operating as The Moore Mortgage Team,
  // licensed through Umortgage.
  bayou: {
    name: "The Moore Mortgage Team",
    repName: "Channing Moore",
    personalNmls: "1235512",
    companyName: "Umortgage",
    companyNmls: "1457759",
    logoUrl:
      "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a7dc297c00ec1b226d3cc85.png",
    headshotUrl:
      "https://assets.cdn.filesafe.space/oEIlQOv4C2ZirNFvg7QJ/media/6a7dc26679dbc24f68bac7d9.png",
    headline: "Get Your Real Numbers. Payment, Rate and Cost",
    sub: "Our preferred local Louisiana lender. No-pressure quote — see your true monthly payment in minutes.",
    ctaLabel: "Get My Quote",
    ctaHref: "/get-pre-approved",
    disclosure:
      "Estimates only and not a commitment to lend. Channing Moore | NMLS #1235512 | Umortgage | NMLS #1457759 | Licensed in Louisiana | Equal Housing Lender. Rates shown are example estimates — contact for current rates and APR.",
  },

  // Local SEO — the client's Google Business Profile (used for the map embed
  // + RealEstateAgent/LocalBusiness geo coordinates in structured data).
  localSeo: {
    gbpName: "The Land & Home Group | Lake Charles Realtor",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3447.3474971895225!2d-93.3336138!3d30.227165499999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x863b8f69b8ed9fe9%3A0x9064a40b358210a0!2sThe%20Land%20%26%20Home%20Group%20%7C%20Lake%20Charles%20Realtor!5e0!3m2!1sen!2sus!4v1790188666149!5m2!1sen!2sus",
    latitude: 30.2271655,
    longitude: -93.3336138,
    city: "Lake Charles",
    region: "LA",
  },

  // Blog author (team leader) — powers the author bio card + Person structured
  // data for Google E-E-A-T. photoUrl is Lauren's headshot.
  blogAuthor: {
    name: "Lauren Huffman",
    title: "Team Leader · Lake Charles Realtor",
    photoUrl: "https://assets.cdn.filesafe.space/xdGkCWotXaek58gmTbxt/media/6ab41ce8ec718870e13e4db2.jpg",
    bio:
      "Lauren Huffman leads The Land & Home Group, brokered by EXIT Realty Southern. A Southwest Louisiana local and one of the area's most-reviewed agents, Lauren has helped hundreds of families buy and sell across Lake Charles, Sulphur, Moss Bluff, Westlake and the surrounding communities — with honest, no-pressure guidance and deep local market knowledge.",
    url: "/about",
    gbpUrl: "https://share.google/P0z9MIBZPEnlqMUMh",
    instagramUrl: "https://www.instagram.com/thelandhomegroup",
    facebookUrl: "https://www.facebook.com/landhomerealestategroup",
  },

  // NAP (name / address / phone) — must match the Google Business Profile
  // exactly. Powers the visible "find us" block, the footer, and every
  // RealEstateAgent schema address on the site.
  nap: {
    name: "The Land & Home Group",
    street: "3701 Maplewood Dr",
    city: "Sulphur",
    region: "LA",
    postalCode: "70663",
    website: "https://www.landhomegroup.com",
    hours: [
      { days: "Monday – Friday", time: "8 AM – 8 PM" },
      { days: "Saturday – Sunday", time: "Closed" },
    ],
    // schema.org OpeningHoursSpecification equivalent of `hours`
    openDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "20:00",
    rating: "5.0",
    reviewCount: 50,
    mapsUrl: "https://maps.google.com/?cid=10404621407182000288",
    directionsUrl:
      "https://www.google.com/maps/dir/?api=1&destination=The+Land+%26+Home+Group+3701+Maplewood+Dr+Sulphur+LA+70663",
  },
} as const;
