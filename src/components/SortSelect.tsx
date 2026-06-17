"use client";

import { useRouter } from "next/navigation";

// Sort dropdown for the IDX results. Preserves all other active filters
// (passed in as a base query string) and just swaps the `sort` param.
const OPTIONS: { value: string; label: string }[] = [
  { value: "new", label: "Newest" },
  { value: "plow", label: "Price: Low to High" },
  { value: "phigh", label: "Price: High to Low" },
  { value: "beds", label: "Most Beds" },
  { value: "sqft", label: "Largest" },
];

export default function SortSelect({ sort, baseQuery, basePath = "/listings" }: { sort: string; baseQuery: string; basePath?: string }) {
  const router = useRouter();
  return (
    <div className="sortbox">
      <label>Sort</label>
      <div className="qsel">
        <select
          value={sort}
          onChange={(e) => {
            const p = new URLSearchParams(baseQuery);
            if (e.target.value === "new") p.delete("sort");
            else p.set("sort", e.target.value);
            router.push(`${basePath}${p.toString() ? `?${p}` : ""}`);
          }}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
