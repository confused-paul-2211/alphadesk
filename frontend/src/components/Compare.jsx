import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { compareTickers } from "../api.js";
import { Chips, StockPicker } from "./StockPicker.jsx";
import {
  CHART_COLORS, ErrorNote, Field, Panel, PERIODS, fmtDate,
} from "../ui.jsx";

export default function Compare() {
  const [sel, setSel] = useState(["RELIANCE.NS", "TCS.NS", "^NSEI"]);
  const [period, setPeriod] = useState("1y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  async function run() {
    if (sel.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setData(await compareTickers(sel, period));
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Panel
        title="Compare performance"
        sub="Every series is rebased to 100 at the start of the window, so different price levels and currencies can be read side by side. Pick up to six symbols — indices included."
      >
        <div className="controls">
          <StockPicker
            includeIndices
            prompt={sel.length < 6 ? "Add a stock or index…" : "Six is the limit"}
            exclude={sel}
            onAdd={(t) => sel.length < 6 && setSel([...sel, t])}
          />
          <Field label="Period">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <button className="btn" onClick={run} disabled={loading || sel.length === 0}>
            {loading ? "Loading…" : "Compare"}
          </button>
        </div>
        <Chips items={sel} onRemove={(t) => setSel(sel.filter((x) => x !== t))} />
        {error && <ErrorNote>{error}</ErrorNote>}
      </Panel>

      {data && (
        <Panel title="Growth of 100">
          <div className="legend">
            {data.tickers.map((t, i) => (
              <span key={t}>
                <span className="key" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {t}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#d5dbd3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={48}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} width={56}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #d5dbd3", borderRadius: 4 }} />
              {data.tickers.map((t, i) => (
                <Line key={t} type="monotone" dataKey={t} dot={false} strokeWidth={2}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      )}
    </>
  );
}
