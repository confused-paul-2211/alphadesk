import { useState } from "react";
import {
  CartesianGrid, LabelList, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis,
} from "recharts";
import { getFrontier } from "../api.js";
import { ErrorNote, Field, Panel, PERIODS, fmtNum, fmtPct } from "../ui.jsx";

const toPct = (p) => ({ ...p, vol: p.vol * 100, ret: p.ret * 100 });

export default function Frontier() {
  const [input, setInput] = useState("RELIANCE.NS, TCS.NS, HDFCBANK.NS, INFY.NS, ITC.NS");
  const [period, setPeriod] = useState("1y");
  const [riskFree, setRiskFree] = useState("6.0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  async function run() {
    const tickers = input.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    if (tickers.length < 2) {
      setError("The frontier needs at least two tickers.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getFrontier(tickers, period, (Number(riskFree) || 0) / 100));
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const points = data?.points.map(toPct);
  const maxSharpe = data && toPct(data.max_sharpe);
  const minVol = data && toPct(data.min_vol);
  const assets = data?.assets.map(toPct);

  return (
    <>
      <Panel
        title="Efficient frontier"
        sub="A Monte Carlo sketch of Markowitz portfolio theory: 2,500 random long-only weightings of your tickers, plotted by annualised risk and return. The upper-left edge of the cloud is the efficient frontier."
      >
        <div className="controls">
          <Field label="Tickers (2–10, comma-separated)">
            <input
              value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              style={{ width: 380, maxWidth: "72vw" }}
            />
          </Field>
          <Field label="Risk-free (% p.a.)">
            <input type="number" step="0.1" min="0" value={riskFree}
              onChange={(e) => setRiskFree(e.target.value)} style={{ width: 90 }} />
          </Field>
          <Field label="Period">
            <select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <button className="btn" onClick={run} disabled={loading}>
            {loading ? "Simulating…" : "Draw frontier"}
          </button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}
      </Panel>

      {data && (
        <Panel title="Risk–return cloud">
          <div className="legend">
            <span><span className="key" style={{ background: "#2851a3", opacity: 0.45 }} />Simulated portfolios</span>
            <span><span className="key" style={{ background: "#0e6e4b" }} />Max Sharpe (tangency)</span>
            <span><span className="key" style={{ background: "#c4442c" }} />Minimum variance</span>
            <span><span className="key" style={{ background: "#17211b" }} />Individual assets</span>
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke="#d5dbd3" />
              <XAxis
                type="number" dataKey="vol" name="Volatility"
                domain={["auto", "auto"]} tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false}
              />
              <YAxis
                type="number" dataKey="ret" name="Return"
                domain={["auto", "auto"]} tickFormatter={(v) => `${v.toFixed(0)}%`}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} width={56}
              />
              <ZAxis range={[18, 18]} />
              <Tooltip
                cursor={{ stroke: "#66716a", strokeDasharray: "3 3" }}
                contentStyle={{ background: "#fff", border: "1px solid #d5dbd3", borderRadius: 4 }}
                formatter={(v, name) => [`${v.toFixed(1)}%`, name === "vol" ? "Volatility" : name === "ret" ? "Return" : name]}
              />
              <Scatter data={points} fill="#2851a3" fillOpacity={0.28} isAnimationActive={false} />
              <Scatter data={assets} fill="#17211b" shape="diamond">
                <LabelList dataKey="ticker" position="top" style={{ fontSize: 11, fill: "#17211b" }} />
              </Scatter>
              <Scatter data={[minVol]} fill="#c4442c" />
              <Scatter data={[maxSharpe]} fill="#0e6e4b" />
            </ScatterChart>
          </ResponsiveContainer>
          <p className="chart-note">
            Both axes are annualised. Risk-free rate {fmtPct(data.risk_free, 1)} used for Sharpe ratios.
          </p>
        </Panel>
      )}

      {data && (
        <Panel title="Model portfolios from the simulation">
          <table className="tbl">
            <thead>
              <tr>
                <th>Portfolio</th>
                <th className="num">Return</th>
                <th className="num">Volatility</th>
                <th className="num">Sharpe</th>
                <th>Weights</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Max Sharpe (tangency)", p: data.max_sharpe },
                { name: "Minimum variance", p: data.min_vol },
              ].map(({ name, p }) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td className="num pos">{fmtPct(p.ret, 1)}</td>
                  <td className="num">{fmtPct(p.vol, 1)}</td>
                  <td className="num">{fmtNum(p.sharpe)}</td>
                  <td>
                    {Object.entries(p.weights)
                      .sort((a, b) => b[1] - a[1])
                      .map(([t, w]) => `${t} ${(w * 100).toFixed(0)}%`)
                      .join(", ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="hint" style={{ marginTop: 10 }}>
            These are illustrative, in-sample results from historical data — the classic
            limitation of mean-variance optimisation, and a good talking point.
          </p>
        </Panel>
      )}
    </>
  );
}
