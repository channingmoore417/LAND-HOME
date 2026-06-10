"use client";

import { useMemo, useState } from "react";
import { site } from "@/config/site";

const fmt = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// Payment estimator + Bayou Mortgage module. Logic ported from the
// template; values are estimates only (see disclosure).
export default function MortgageCalculator({
  price,
  taxAnnual,
  insAnnual = 2400,
}: {
  price: number;
  taxAnnual: number;
  insAnnual?: number;
}) {
  const [priceStr, setPriceStr] = useState(price.toLocaleString("en-US"));
  const [dpPct, setDpPct] = useState(20);
  const [rateStr, setRateStr] = useState("6.75%");
  const [termStr, setTermStr] = useState("30 yr");
  const [taxStr, setTaxStr] = useState(taxAnnual.toLocaleString("en-US"));
  const [insStr, setInsStr] = useState(insAnnual.toLocaleString("en-US"));

  const n = (s: string) => parseFloat(s.replace(/[^0-9.]/g, "")) || 0;

  const { monthly, pi, taxMo, insMo, dpAmt } = useMemo(() => {
    const p = n(priceStr);
    const dpAmt = (p * dpPct) / 100;
    const loan = p - dpAmt;
    const rate = n(rateStr) / 100 / 12;
    const months = n(termStr) * 12;
    const pi =
      rate > 0
        ? (loan * rate * Math.pow(1 + rate, months)) / (Math.pow(1 + rate, months) - 1)
        : loan / months;
    const taxMo = n(taxStr) / 12;
    const insMo = n(insStr) / 12;
    return { monthly: pi + taxMo + insMo, pi, taxMo, insMo, dpAmt };
  }, [priceStr, dpPct, rateStr, termStr, taxStr, insStr]);

  return (
    <div className="calc">
      <div className="calc__body">
        <div className="calc__inputs">
          <div className="field">
            <label>Home Price</label>
            <div className="field__money">
              <input type="text" value={priceStr} onChange={(e) => setPriceStr(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>
              Down Payment — {dpPct}% ({fmt(dpAmt)})
            </label>
            <input
              type="range"
              className="range"
              min={0}
              max={50}
              value={dpPct}
              onChange={(e) => setDpPct(parseFloat(e.target.value))}
            />
          </div>
          <div className="field__row">
            <div className="field field--plain">
              <label>Interest Rate</label>
              <input type="text" value={rateStr} onChange={(e) => setRateStr(e.target.value)} />
            </div>
            <div className="field field--plain">
              <label>Term</label>
              <input type="text" value={termStr} onChange={(e) => setTermStr(e.target.value)} />
            </div>
          </div>
          <div className="field__row">
            <div className="field">
              <label>Taxes / yr</label>
              <div className="field__money">
                <input type="text" value={taxStr} onChange={(e) => setTaxStr(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Insurance / yr</label>
              <div className="field__money">
                <input type="text" value={insStr} onChange={(e) => setInsStr(e.target.value)} />
              </div>
            </div>
          </div>
        </div>

        <div className="calc__result">
          <div className="k">Estimated Monthly</div>
          <div className="big">
            {fmt(monthly)}
            <small>/mo</small>
          </div>
          <div className="calc__break">
            <div>
              <span>Principal &amp; Interest</span>
              <b>{fmt(pi)}</b>
            </div>
            <div>
              <span>Property Taxes</span>
              <b>{fmt(taxMo)}</b>
            </div>
            <div>
              <span>Insurance</span>
              <b>{fmt(insMo)}</b>
            </div>
          </div>
        </div>
      </div>

      <div className="bayou">
        <div className="bayou__txt">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bayou__logo" src={site.bayou.logoUrl} alt={site.bayou.name} />
          <div className="bayou__copy">
            <div className="t">{site.bayou.headline}</div>
            <div className="s">{site.bayou.sub}</div>
          </div>
        </div>
        <a className="bayou__cta" href={site.bayou.ctaHref} target="_blank" rel="noopener">
          {site.bayou.ctaLabel}
        </a>
      </div>
      <div className="bayou__disc">{site.bayou.disclosure}</div>
    </div>
  );
}
