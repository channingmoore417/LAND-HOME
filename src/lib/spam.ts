// ============================================================
// Spam filter for the unified /api/forms endpoint.
//
// No external service, no API keys, no CAPTCHA friction. It layers cheap
// signals and only drops a submission when several of them agree:
//
//   1. MECHANICAL — honeypot field, submit speed, request origin, and whether
//      the visitor ever touched the keyboard/screen. These come from the
//      browser via useFormGuard() and are the hardest for a bot to fake.
//   2. CONTENT — links, markup, non-Latin script, and off-topic sales pitches
//      in the free-text fields.
//   3. VOLUME — per-IP rate limiting and duplicate-payload suppression.
//
// Everything except the two unambiguous mechanical failures is SCORED rather
// than fatal, so no single heuristic can lose a real lead. Leads are the whole
// point of this site: when in doubt, let it through.
// ============================================================

export interface SpamContext {
  ip: string;
  origin: string | null;
  host: string | null;
}

export interface SpamVerdict {
  spam: boolean;
  score: number;
  reasons: string[];
}

/** Drop at this score. Tuned so any ONE heuristic below always survives. */
export const SPAM_THRESHOLD = 5;

/** Score that guarantees a drop on its own (used for unambiguous failures). */
const FATAL = 100;

/** Minimum time (ms) a real person needs to fill out a form. */
const MIN_SUBMIT_MS = 2500;

/** A load timestamp further in the future than this was forged. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

// ---- content heuristics ------------------------------------------------

const URL_RE =
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]{2,}\.(?:com|net|org|ru|cn|xyz|top|info|biz|online|site|click|shop|club|icu|live|store|link|buzz|work)\b/gi;

const MARKUP_RE = /<a\s|<\/a>|\[url[=\]]|\[link[=\]]|<script|href\s*=/i;

/** Cyrillic, Armenian, Hebrew, Arabic, Japanese, Chinese. */
const NON_LATIN_RE = /[Ѐ-ӿ԰-֏֐-׿؀-ۿ぀-ヿ一-鿿]/;

// Deliberately OFF-DOMAIN only. This is a real-estate and mortgage site, so
// words like loan, rate, investment, refinance, cash offer, credit and buyer
// are all legitimate here and must never appear in this list.
const SPAM_PHRASES: RegExp[] = [
  /\bseo\b|search engine optimi|backlink|link building|link insertion|guest post/i,
  /rank (?:your|you|higher|#?1)|first page of google|google ranking|increase (?:your )?(?:website )?traffic/i,
  /web (?:design|development|designing) (?:service|compan|agenc)|mobile app develop|software develop(?:ment)? (?:service|compan)/i,
  /digital marketing (?:service|agenc|compan)|social media marketing (?:service|package)/i,
  /\bcrypto(?:currency)?\b|\bbitcoin\b|\bethereum\b|\bforex\b|binary option|\bnft\b/i,
  /\bcasino\b|\bgambling\b|\bbetting\b|online slots|\bpoker\b/i,
  /\bviagra\b|\bcialis\b|online pharmacy|\bpills\b/i,
  /\bescort\b|\bporn\b|\bhookup\b|adult (?:site|content|dating)/i,
  /work from home|make money online|earn \$?\d|passive income opportunity/i,
  /dear (?:sir|madam)|to whom it may concern.{0,40}(?:offer|service)/i,
  /i (?:came across|was browsing|stumbled upon|found) your (?:website|site)/i,
  /\btelegram\b|\bwhatsapp\s*:|contact me (?:on|at) (?:telegram|signal)/i,
  /this is not spam|\bunsubscribe\b|click here to (?:claim|unsubscribe)/i,
];

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "temp-mail.org", "throwawaymail.com", "yopmail.com", "trashmail.com",
  "sharklasers.com", "getnada.com", "dispostable.com", "maildrop.cc",
  "fakeinbox.com", "mailnesia.com", "spam4.me", "grr.la",
]);

const EMAIL_RE = /^[^\s@,;]+@[^\s@.,;]+(?:\.[^\s@.,;]+)+$/;

function countLinks(text: string): number {
  return (text.match(URL_RE) || []).length;
}

// ---- volume heuristics -------------------------------------------------
//
// In-memory and therefore per serverless instance: a bot spread across many
// cold starts will slip some through. It still blunts the common case (one
// host hammering a warm instance) at zero cost and zero dependencies. If the
// volume ever justifies it, back these two maps with Supabase or Upstash.

const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_PER_WINDOW = 6;
const DUPLICATE_WINDOW_MS = 30 * 60 * 1000;

const recentByIp = new Map<string, number[]>();
const recentFingerprints = new Map<string, number>();

function sweep(now: number) {
  for (const [ip, hits] of recentByIp) {
    const live = hits.filter((t) => now - t < RATE_WINDOW_MS);
    if (live.length) recentByIp.set(ip, live);
    else recentByIp.delete(ip);
  }
  for (const [fp, t] of recentFingerprints) {
    if (now - t >= DUPLICATE_WINDOW_MS) recentFingerprints.delete(fp);
  }
}

/** Records this hit and reports whether the IP has blown its budget. */
function overRateLimit(ip: string, now: number): boolean {
  if (!ip) return false;
  const hits = (recentByIp.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  hits.push(now);
  recentByIp.set(ip, hits);
  return hits.length > RATE_MAX_PER_WINDOW;
}

/** Records this payload and reports whether it is a recent replay. */
function isDuplicate(fingerprint: string, now: number): boolean {
  const seen = recentFingerprints.get(fingerprint);
  recentFingerprints.set(fingerprint, now);
  return seen !== undefined && now - seen < DUPLICATE_WINDOW_MS;
}

// ---- the filter --------------------------------------------------------

export interface SpamCandidate {
  form_id: string;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  message?: unknown;
  company?: unknown;
  form_loaded_at?: unknown;
  human_interactions?: unknown;
}

export function evaluateSpam(p: SpamCandidate, ctx: SpamContext): SpamVerdict {
  const now = Date.now();
  sweep(now);

  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const name = typeof p.name === "string" ? p.name : "";
  const email = typeof p.email === "string" ? p.email.trim() : "";
  const message = typeof p.message === "string" ? p.message : "";
  const freeText = `${name}\n${message}`;

  // --- 1. mechanical ---

  // Honeypot: hidden from humans, irresistible to form-filling bots.
  if (typeof p.company === "string" && p.company.trim() !== "") {
    add(FATAL, "honeypot");
  }

  // Submit speed. A forged future timestamp is its own tell.
  if (typeof p.form_loaded_at === "number" && Number.isFinite(p.form_loaded_at)) {
    const elapsed = now - p.form_loaded_at;
    if (elapsed < -MAX_CLOCK_SKEW_MS) add(2, "future-timestamp");
    else if (elapsed >= 0 && elapsed < MIN_SUBMIT_MS) add(FATAL, "too-fast");
  } else {
    // Every form on the site sends this. Absent means the POST did not come
    // from our UI at all.
    add(3, "no-load-timestamp");
  }

  // Keyboard/pointer activity before submit. Headless bots that write straight
  // into the DOM produce none.
  if (typeof p.human_interactions === "number" && Number.isFinite(p.human_interactions)) {
    if (p.human_interactions === 0) add(2, "no-interaction");
  } else {
    add(1, "no-interaction-signal");
  }

  // Same-origin check. Compared against the request's own Host so preview
  // deploys and any future custom domain keep working with no config.
  if (!ctx.origin) {
    add(3, "no-origin");
  } else {
    let originHost = "";
    try {
      originHost = new URL(ctx.origin).host;
    } catch {
      /* malformed Origin — treated as a mismatch below */
    }
    if (!originHost || !ctx.host || originHost !== ctx.host) add(4, "cross-origin");
  }

  // --- 2. content ---

  const links = countLinks(freeText);
  if (links >= 2) add(4, `links:${links}`);
  else if (links === 1) add(2, "link");

  if (MARKUP_RE.test(freeText)) add(4, "markup");
  if (NON_LATIN_RE.test(freeText)) add(3, "non-latin");

  const phraseHits = SPAM_PHRASES.filter((re) => re.test(freeText)).length;
  if (phraseHits) add(Math.min(phraseHits * 3, 6), `phrases:${phraseHits}`);

  if (email) {
    if (!EMAIL_RE.test(email)) add(2, "bad-email");
    const domain = email.split("@")[1]?.toLowerCase();
    if (domain && DISPOSABLE_EMAIL_DOMAINS.has(domain)) add(2, "disposable-email");
  }

  if (name && !/\p{L}/u.test(name)) add(2, "nameless");
  if (message.length > 2000) add(1, "very-long");

  // --- 3. volume ---
  // Checked last so the maps only record submissions that got this far.

  const fingerprint = `${p.form_id}|${email.toLowerCase()}|${message.slice(0, 200)}`;
  if (isDuplicate(fingerprint, now)) add(FATAL, "duplicate");
  if (overRateLimit(ctx.ip, now)) add(FATAL, "rate-limit");

  return { spam: score >= SPAM_THRESHOLD, score, reasons };
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") || "";
}
