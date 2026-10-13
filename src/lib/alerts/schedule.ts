// ============================================================
// When is a client's digest due?
//
// The scheduler (pg_cron) fires hourly. Each run asks "has this client's most
// recent send SLOT passed without a send?" rather than "is it exactly 9:00?",
// so a missed or failed hour self-heals on the next run instead of dropping
// a whole day/week. Slots are in Central time and DST-safe.
// ============================================================

const TZ = "America/Chicago";
export const DAILY_HOUR = 8;      // daily digest: 8:00 AM Central
export const WEEKLY_DOW = 6;      // weekly digest + text: Saturday
export const WEEKLY_HOUR = 9;     // 9:00 AM Central
export const INSTANT_MIN_GAP_MS = 60 * 60 * 1000;

interface Wall { y: number; m: number; d: number; h: number; dow: number }

function wallClock(at: Date): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", hourCycle: "h23", weekday: "short",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const dows = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    y: +get("year"), m: +get("month"), d: +get("day"), h: +get("hour"),
    dow: dows.indexOf(get("weekday")),
  };
}

/** UTC instant for a Central wall-clock time (handles CST/CDT). */
function centralToUtc(y: number, m: number, d: number, h: number): Date {
  const guess = new Date(Date.UTC(y, m - 1, d, h, 0, 0));
  // How far ahead of UTC is Central at that moment? Re-read the wall clock to find out.
  const w = wallClock(guess);
  const asWall = Date.UTC(w.y, w.m - 1, w.d, w.h, 0, 0);
  const offset = asWall - guess.getTime();
  return new Date(guess.getTime() - offset);
}

/** The most recent daily slot at or before `now`. */
export function latestDailySlot(now: Date): Date {
  const w = wallClock(now);
  let slot = centralToUtc(w.y, w.m, w.d, DAILY_HOUR);
  if (slot > now) slot = centralToUtc(w.y, w.m, w.d - 1, DAILY_HOUR);
  return slot;
}

/** The most recent weekly slot (Saturday 9am Central) at or before `now`. */
export function latestWeeklySlot(now: Date): Date {
  const w = wallClock(now);
  const back = (w.dow - WEEKLY_DOW + 7) % 7;
  let slot = centralToUtc(w.y, w.m, w.d - back, WEEKLY_HOUR);
  if (slot > now) slot = centralToUtc(w.y, w.m, w.d - back - 7, WEEKLY_HOUR);
  return slot;
}

export interface DueInput {
  frequency: string;
  lastDigestAt: Date | null;
  now: Date;
}

/** Is the (email) digest due for this client right now? */
export function digestDue({ frequency, lastDigestAt, now }: DueInput): boolean {
  if (frequency === "instant") {
    return !lastDigestAt || now.getTime() - lastDigestAt.getTime() >= INSTANT_MIN_GAP_MS;
  }
  const slot = frequency === "daily" ? latestDailySlot(now) : latestWeeklySlot(now);
  return !lastDigestAt || lastDigestAt < slot;
}

/** Is the weekly text due? Same Saturday slot, tracked by last_sms_at. */
export function smsDue(lastSmsAt: Date | null, now: Date): boolean {
  const slot = latestWeeklySlot(now);
  return !lastSmsAt || lastSmsAt < slot;
}
