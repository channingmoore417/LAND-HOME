import { reliableInventory, type SellStats } from "@/lib/sellStats";
import { usd } from "@/lib/format";

// "Live from the MLS" summary box at the top of a city selling post.
export default function SellStatsBox({ s }: { s: SellStats }) {
  const tiles: [string, string][] = [
    [s.days_to_offer == null ? "—" : `${s.days_to_offer} days`, "Median time to an accepted offer"],
    [s.sale_to_list == null ? "—" : `${s.sale_to_list}%`, "Of original asking price"],
    [s.median_sold ? usd(s.median_sold) : "—", "Median sale price, last 6 months"],
    [reliableInventory(s) == null ? "—" : `${reliableInventory(s)} mo`, "Months of inventory"],
  ];
  return (
    <aside className="sellbox" aria-label={`${s.city} home sale numbers`}>
      <div className="sellbox__head">
        <span className="sellbox__live" aria-hidden />
        Live {s.city} numbers from the MLS, updated daily
      </div>
      <div className="sellbox__grid">
        {tiles.map(([v, k]) => (
          <div className="sellbox__tile" key={k}>
            <b>{v}</b>
            <span>{k}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
