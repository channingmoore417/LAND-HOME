import { usd, int } from "@/lib/format";
import { fetchMarketStats, fetchMarketTrend, type MarketTrend } from "@/lib/marketStats";

// Medians over fewer than this many listings are too jumpy to headline —
// below it we show counts and the price floor but hold back the medians.
const MEDIAN_MIN_SAMPLE = 10;

// Signed month-over-month delta, e.g. "▲ +3.2%". Sign + arrow carry the
// direction (never color alone); "≈" marks a flat month.
function Delta({ value, unit, goodWhenDown = false }: { value: number | null; unit: "%" | "days"; goodWhenDown?: boolean }) {
  if (value === null) return null;
  const rounded = unit === "%" ? Math.round(value * 10) / 10 : Math.round(value);
  if (Math.abs(rounded) < (unit === "%" ? 0.1 : 1)) {
    return <span className="mkt__delta">≈ no change vs last month</span>;
  }
  const up = rounded > 0;
  const good = goodWhenDown ? !up : up;
  const text = unit === "%" ? `${up ? "+" : ""}${rounded}%` : `${up ? "+" : ""}${rounded} days`;
  return (
    <span className={`mkt__delta ${good ? "is-good" : "is-off"}`}>
      {up ? "▲" : "▼"} {text} vs last month
    </span>
  );
}

// "Market at a glance" — real aggregates from the MLS feed for one city (or
// the whole market when city is omitted). Renders nothing when the area has
// no active residential listings, so zero-inventory cities degrade cleanly.
export default async function MarketStats({ city }: { city?: string | null }) {
  const stats = await fetchMarketStats(city);
  if (!stats || stats.activeCount === 0) return null;
  const trend: MarketTrend | null = await fetchMarketTrend(stats, city);

  const label = city || "Southwest Louisiana";
  const showMedians = stats.activeCount >= MEDIAN_MIN_SAMPLE;
  const reducedPct =
    stats.activeCount > 0 ? Math.round((stats.reducedCount / stats.activeCount) * 100) : 0;
  const asOf = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="mkt">
      <div className="wrap">
        <span className="script" style={{ fontSize: "1.7rem" }}>by the numbers</span>
        <h2 className="section__title" style={{ marginTop: 0 }}>
          {label} housing market at a glance
        </h2>
        <div className="mkt__grid">
          {showMedians && (
            <div className="mkt__tile">
              <div className="mkt__n">{usd(stats.medianPrice)}</div>
              <div className="mkt__k">Median List Price</div>
              {trend && <Delta value={trend.medianPriceChangePct} unit="%" />}
            </div>
          )}
          {showMedians && stats.medianDom !== null && (
            <div className="mkt__tile">
              <div className="mkt__n">{int(stats.medianDom)}</div>
              <div className="mkt__k">Median Days on Market</div>
              {trend && <Delta value={trend.medianDomChangeDays} unit="days" goodWhenDown />}
            </div>
          )}
          <div className="mkt__tile">
            <div className="mkt__n">{usd(stats.minPrice)}</div>
            <div className="mkt__k">Homes Starting At</div>
          </div>
          {showMedians && stats.medianPpsf !== null && (
            <div className="mkt__tile">
              <div className="mkt__n">{usd(stats.medianPpsf)}</div>
              <div className="mkt__k">Median Price / SqFt</div>
            </div>
          )}
          <div className="mkt__tile">
            <div className="mkt__n">{int(stats.activeCount)}</div>
            <div className="mkt__k">Homes for Sale</div>
            {trend && <Delta value={trend.activeCountChangePct} unit="%" />}
          </div>
          <div className="mkt__tile">
            <div className="mkt__n">{int(stats.newLast30d)}</div>
            <div className="mkt__k">New in the Last 30 Days</div>
          </div>
          {showMedians && (
            <div className="mkt__tile">
              <div className="mkt__n">{reducedPct}%</div>
              <div className="mkt__k">With a Price Reduction</div>
            </div>
          )}
        </div>
        <p className="mkt__note">
          Live MLS data for active residential listings in {label} as of {asOf}.
          {!showMedians && " Small market — medians omitted where the sample is too thin to be meaningful."}
          {trend && ` Monthly change compares against ${new Date(`${trend.baselineDate}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric" })}.`}
        </p>
      </div>
    </section>
  );
}
