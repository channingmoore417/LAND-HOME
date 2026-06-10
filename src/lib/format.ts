export function usd(n: number | null | undefined, withCents = false): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: withCents ? 2 : 0,
  });
}

export function int(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function num(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}

// Title-case a single SWLA city/word coming from MLS data.
export function titleCase(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
}

// Split a comma/semicolon-delimited MLS feature string into clean chips.
export function splitFeatures(s: string | null | undefined): string[] {
  if (!s) return [];
  return s
    .split(/[,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Estimated annual property tax fallback when TaxAnnualAmount is null
// (common in SWLAR). Rough SWLA effective rate ~0.6% of list price.
export function estAnnualTax(listPrice: number | null | undefined): number {
  if (!listPrice) return 0;
  return Math.round((listPrice * 0.006) / 10) * 10;
}
