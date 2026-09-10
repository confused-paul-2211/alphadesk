import { useState } from "react";
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { compareTickers } from "../api.js";
import {
  CHART_COLORS, ErrorNote, Field, Panel, PERIODS, fmtDate,
} from "../ui.jsx";

export default function Compare() {
  const [input, setInput] = useState("RELIANCE.NS, TCS.NS, ^NSEI");
  const [period, setPeriod] = useState("1y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  async function run() {
    const tickers = input.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setData(await compareTickers(tickers, period));
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
        sub="Every series is rebased to 100 at the start of the window, so different price levels and currencies can be read side by side. Up to six symbols, comma-separated."
      >
        <div className="controls">
          <Field label="Tickers">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              style={{ width: 340, maxWidth: "72vw" }}
            />
          </Field>
          <Field label="Period">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <button className="btn" onClick={run} disabled={loading}>
            {loading ? "Loading…" : "Compare"}
          </button>
        </div>
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
