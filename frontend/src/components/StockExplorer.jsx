import { useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { getFundamentals, getHistory, getQuote } from "../api.js";
import { SECTOR_LIST, bySector } from "../universe.js";
import {
  ErrorNote, Field, Metric, Panel, PERIODS,
  fmtBig, fmtDate, fmtNum, fmtPct, toneOf,
} from "../ui.jsx";

// Yahoo publishes dividend yield inconsistently (fraction vs percent);
// treat values under 1 as fractions.
const yieldPct = (v) => (v == null ? "—" : `${(v < 1 ? v * 100 : v).toFixed(2)}%`);

export default function StockExplorer() {
  const [ticker, setTicker] = useState("RELIANCE.NS");
  const [custom, setCustom] = useState(false);
  const [period, setPeriod] = useState("1y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  async function load(sym) {
    const symbol = (sym ?? ticker).trim().toUpperCase();
    if (!symbol) return;
    setLoading(true);
    setError(null);
    try {
      const [quote, hist, fund] = await Promise.all([
        getQuote(symbol),
        getHistory(symbol, period),
        getFundamentals(symbol).catch(() => null),
      ]);
      setData({ quote, hist, fund });
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const q = data?.quote;
  const f = data?.fund;

  return (
    <>
      <Panel
        title="Stock explorer"
        sub="Pick any of 100 NSE large-caps from the dropdown — or switch to a custom symbol (AAPL, ^NSEI, BTC-USD…) if you need something outside the list."
      >
        <div className="controls">
          <Field label="Stock">
            <select
              value={custom ? "__custom" : ticker}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__custom") { setCustom(true); return; }
                setCustom(false);
                setTicker(v);
                load(v);
              }}
              style={{ maxWidth: 300 }}
            >
              {SECTOR_LIST.map((sec) => (
                <optgroup key={sec} label={sec}>
                  {bySector(sec).map((s) => (
                    <option key={s.t} value={s.t}>{s.name} — {s.t}</option>
                  ))}
                </optgroup>
              ))}
              <option value="__custom">Custom symbol…</option>
            </select>
          </Field>
          {custom && (
            <Field label="Symbol">
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                placeholder="AAPL"
                style={{ width: 160 }}
              />
            </Field>
          )}
          <Field label="Period">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Load stock"}
          </button>
        </div>
        {error && <ErrorNote>{error} Check the symbol and that the backend is running on port 8000.</ErrorNote>}
        {!data && !error && (
          <p className="hint">Enter a symbol and press Load stock to begin.</p>
        )}
      </Panel>

      {q && (
        <Panel>
          <div className="quote-row">
            <span className="quote-name">{f?.name || q.ticker}</span>
            <span className="quote-price">
              {fmtNum(q.price)} <span style={{ fontSize: 18 }}>{q.currency}</span>
            </span>
            {q.change_pct != null && (
              <span className={`quote-change ${q.change_pct >= 0 ? "pos" : "neg"}`}>
                {q.change_pct >= 0 ? "+" : ""}{q.change_pct}% today
              </span>
            )}
          </div>
          {f?.sector && (
            <p className="hint">{f.sector}{f.industry ? ` — ${f.industry}` : ""}</p>
          )}

          <div className="metrics">
            <Metric label="Market cap" value={fmtBig(q.market_cap ?? f?.market_cap)} />
            <Metric label="P/E (trailing)" value={fmtNum(f?.pe_trailing, 1)} />
            <Metric label="P/B" value={fmtNum(f?.pb, 1)} />
            <Metric label="EPS (trailing)" value={fmtNum(f?.eps)} />
            <Metric label="Dividend yield" value={yieldPct(f?.dividend_yield)} />
            <Metric label="Return on equity" value={fmtPct(f?.roe, 1)} tone={toneOf(f?.roe)} />
            <Metric label="Net margin" value={fmtPct(f?.net_margin, 1)} tone={toneOf(f?.net_margin)} />
            <Metric label="Beta (1y)" value={fmtNum(f?.beta)} />
          </div>
          <p className="hint">
            52-week range: {fmtNum(q.year_low)} to {fmtNum(q.year_high)} {q.currency}.
            Fields the data source can’t supply right now show as “—”.
          </p>
        </Panel>
      )}

      {data?.hist && (
        <Panel title={`Price — ${data.hist.ticker}`}>
          <ResponsiveContainer width="100%" height={330}>
            <AreaChart data={data.hist.candles} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0e6e4b" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#0e6e4b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#d5dbd3" vertical={false} />
              <XAxis
                dataKey="date" tickFormatter={fmtDate} minTickGap={48}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false}
              />
              <YAxis
                domain={["auto", "auto"]} width={64}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false}
              />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #d5dbd3", borderRadius: 4 }}
                formatter={(v) => [fmtNum(v), "Close"]}
              />
              <Area
                type="monotone" dataKey="close" stroke="#0e6e4b" strokeWidth={2}
                fill="url(#priceFill)" dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="chart-note">Adjusted close, {period === "6mo" ? "past 6 months" : `past ${period.replace("y", " year(s)")}`}.</p>
        </Panel>
      )}
    </>
  );
}
