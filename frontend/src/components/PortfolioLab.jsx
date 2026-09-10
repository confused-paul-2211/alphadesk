import { useEffect, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  analyzePortfolio, deletePortfolio, listPortfolios, savePortfolio,
} from "../api.js";
import Heatmap from "./Heatmap.jsx";
import {
  BENCHMARKS, ErrorNote, Field, Metric, Panel, PERIODS, benchLabel,
  fmtDate, fmtNum, fmtPct, fmtSignedPct, toneOf,
} from "../ui.jsx";

let nextId = 100;
const DEFAULT_ROWS = [
  { id: 1, ticker: "RELIANCE.NS", weight: 30 },
  { id: 2, ticker: "TCS.NS", weight: 25 },
  { id: 3, ticker: "HDFCBANK.NS", weight: 25 },
  { id: 4, ticker: "INFY.NS", weight: 20 },
];

export default function PortfolioLab() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [benchmark, setBenchmark] = useState("^NSEI");
  const [riskFree, setRiskFree] = useState("6.0");
  const [period, setPeriod] = useState("1y");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [saveName, setSaveName] = useState("");
  const [saved, setSaved] = useState([]);
  const [saveMsg, setSaveMsg] = useState(null);

  useEffect(() => {
    listPortfolios().then(setSaved).catch(() => {});
  }, []);

  const setRow = (id, patch) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { id: nextId++, ticker: "", weight: 10 }]);
  const removeRow = (id) => setRows((rs) => rs.filter((r) => r.id !== id));

  const holdings = () =>
    rows
      .filter((r) => r.ticker.trim())
      .map((r) => ({ ticker: r.ticker.trim().toUpperCase(), weight: Number(r.weight) || 0 }))
      .filter((h) => h.weight > 0);

  async function run() {
    const hs = holdings();
    if (hs.length === 0) {
      setError("Add at least one holding with a positive weight.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await analyzePortfolio({
        holdings: hs,
        period,
        benchmark,
        risk_free: (Number(riskFree) || 0) / 100,
      });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const hs = holdings();
    if (!saveName.trim() || hs.length === 0) {
      setSaveMsg("Give the portfolio a name and at least one holding.");
      return;
    }
    try {
      await savePortfolio(saveName.trim(), hs);
      setSaveName("");
      setSaveMsg("Saved.");
      setSaved(await listPortfolios());
    } catch (e) {
      setSaveMsg(e.message);
    }
  }

  function loadSaved(p) {
    setRows(p.holdings.map((h) => ({ id: nextId++, ticker: h.ticker, weight: h.weight })));
    setResult(null);
  }

  async function removeSaved(id) {
    try {
      await deletePortfolio(id);
      setSaved((s) => s.filter((p) => p.id !== id));
    } catch { /* leave the list as is */ }
  }

  const port = result?.portfolio;
  const div = result?.diversification;

  return (
    <>
      <Panel
        title="Portfolio lab"
        sub="Enter holdings with relative weights (they’re normalised for you), pick a benchmark and a risk-free rate, and run a full risk-and-return report."
      >
        {rows.map((r) => (
          <div className="controls" key={r.id}>
            <Field label="Ticker">
              <input
                value={r.ticker}
                onChange={(e) => setRow(r.id, { ticker: e.target.value })}
                placeholder="TCS.NS"
                style={{ width: 150 }}
              />
            </Field>
            <Field label="Weight">
              <input
                type="number" min="0" step="1" value={r.weight}
                onChange={(e) => setRow(r.id, { weight: e.target.value })}
                style={{ width: 90 }}
              />
            </Field>
            <button className="linklike danger" onClick={() => removeRow(r.id)}>
              Remove
            </button>
          </div>
        ))}
        <div className="controls">
          <button className="ghost" onClick={addRow}>Add holding</button>
        </div>

        <div className="controls" style={{ marginTop: 10 }}>
          <Field label="Benchmark">
            <select value={benchmark} onChange={(e) => setBenchmark(e.target.value)}>
              {BENCHMARKS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Risk-free rate (% p.a.)">
            <input
              type="number" step="0.1" min="0" value={riskFree}
              onChange={(e) => setRiskFree(e.target.value)} style={{ width: 90 }}
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
            {loading ? "Analysing…" : "Run analysis"}
          </button>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="controls" style={{ marginTop: 14, borderTop: `1px solid var(--rule)`, paddingTop: 14 }}>
          <Field label="Save this portfolio as">
            <input
              value={saveName} onChange={(e) => setSaveName(e.target.value)}
              placeholder="Core NIFTY basket" style={{ width: 200 }}
            />
          </Field>
          <button className="ghost" onClick={save}>Save portfolio</button>
          {saveMsg && <span className="hint">{saveMsg}</span>}
        </div>
        {saved.length > 0 && (
          <div style={{ marginTop: 8 }}>
            {saved.map((p) => (
              <div className="saved-item" key={p.id}>
                <div>
                  <strong>{p.name}</strong>{" "}
                  <span className="meta">
                    {p.holdings.map((h) => h.ticker).join(", ")}
                  </span>
                </div>
                <div>
                  <button className="linklike" onClick={() => loadSaved(p)}>Load</button>
                  <button className="linklike danger" onClick={() => removeSaved(p.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {port && (
        <Panel
          title="Risk & return report"
          sub={`Versus ${benchLabel(result.benchmark)}, ${PERIODS.find((p) => p.value === result.period)?.label ?? result.period}, risk-free ${fmtPct(result.risk_free, 1)}.`}
        >
          <div className="metrics">
            <Metric label="Annualised return" value={fmtSignedPct(port.ann_return, 1)} tone={toneOf(port.ann_return)} />
            <Metric label="Annualised volatility" value={fmtPct(port.ann_vol, 1)} />
            <Metric label="Sharpe ratio" value={fmtNum(port.sharpe)} tone={toneOf(port.sharpe)} />
            <Metric label="Sortino ratio" value={fmtNum(port.sortino)} tone={toneOf(port.sortino)} />
            <Metric label={`Beta vs ${benchLabel(result.benchmark)}`} value={fmtNum(port.beta)} />
            <Metric label="Jensen’s alpha (ann.)" value={fmtSignedPct(port.jensens_alpha, 1)} tone={toneOf(port.jensens_alpha)} />
            <Metric label="Max drawdown" value={fmtPct(port.max_drawdown, 1)} tone="neg" />
            <Metric label="1-day VaR (95%)" value={fmtPct(port.var_95_daily)} />
          </div>
          {div && (
            <p className="hint">
              Diversification at work: the weighted average of each holding’s volatility is{" "}
              {fmtPct(div.weighted_avg_vol, 1)}, but combined they move at {fmtPct(div.portfolio_vol, 1)} —
              imperfect correlation saves {fmtPct(div.benefit, 1)} of risk.
            </p>
          )}
        </Panel>
      )}

      {result?.equity_curve && (
        <Panel title="Growth of 100">
          <div className="legend">
            <span><span className="key" style={{ background: "#0e6e4b" }} />Portfolio</span>
            <span><span className="key" style={{ background: "#2851a3" }} />{benchLabel(result.benchmark)}</span>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={result.equity_curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#d5dbd3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={48}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} width={56}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #d5dbd3", borderRadius: 4 }} />
              <Line type="monotone" dataKey="portfolio" stroke="#0e6e4b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="benchmark" stroke="#2851a3" strokeWidth={1.8}
                strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {result?.drawdown_curve && (
        <Panel title="Drawdown" sub="How far the portfolio sat below its previous peak, day by day.">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={result.drawdown_curve} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#d5dbd3" vertical={false} />
              <XAxis dataKey="date" tickFormatter={fmtDate} minTickGap={48}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis width={56} tickFormatter={(v) => `${v}%`}
                tick={{ fill: "#66716a", fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #d5dbd3", borderRadius: 4 }}
                formatter={(v) => [`${v}%`, "Drawdown"]}
              />
              <Area type="monotone" dataKey="drawdown" stroke="#c4442c" strokeWidth={1.5}
                fill="#c4442c" fillOpacity={0.15} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      )}

      {result?.holdings && (
        <Panel title="Holdings detail">
          <table className="tbl">
            <thead>
              <tr>
                <th>Ticker</th>
                <th className="num">Weight</th>
                <th className="num">Ann. return</th>
                <th className="num">Volatility</th>
                <th className="num">Sharpe</th>
                <th className="num">Beta</th>
              </tr>
            </thead>
            <tbody>
              {result.holdings.map((h) => (
                <tr key={h.ticker}>
                  <td>{h.ticker}</td>
                  <td className="num">{fmtPct(h.weight, 1)}</td>
                  <td className={`num ${h.ann_return >= 0 ? "pos" : "neg"}`}>
                    {fmtSignedPct(h.ann_return, 1)}
                  </td>
                  <td className="num">{fmtPct(h.ann_vol, 1)}</td>
                  <td className="num">{fmtNum(h.sharpe)}</td>
                  <td className="num">{fmtNum(h.beta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}

      {result?.correlation && (
        <Panel
          title="Correlation of daily returns"
          sub="Green cells move together; red cells move opposite. Low or negative correlation is where diversification comes from."
        >
          <Heatmap tickers={result.correlation.tickers} matrix={result.correlation.matrix} />
        </Panel>
      )}
    </>
  );
}
