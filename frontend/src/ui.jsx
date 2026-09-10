// Small shared UI pieces and number formatters.

export const fmtPct = (v, digits = 2) =>
  v == null || Number.isNaN(v) ? "—" : `${(v * 100).toFixed(digits)}%`;

export const fmtSignedPct = (v, digits = 2) =>
  v == null || Number.isNaN(v) ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toFixed(digits)}%`;

export const fmtNum = (v, digits = 2) =>
  v == null || Number.isNaN(v) ? "—" : Number(v).toFixed(digits);

export const fmtBig = (v) => {
  if (v == null || Number.isNaN(v)) return "—";
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (abs >= 1e9) return (v / 1e9).toFixed(2) + "B";
  if (abs >= 1e6) return (v / 1e6).toFixed(2) + "M";
  return v.toLocaleString();
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const fmtDate = (iso) => {
  if (!iso) return "";
  const [y, m] = iso.split("-");
  return `${MONTHS[Number(m) - 1]} ’${y.slice(2)}`;
};

export function Metric({ label, value, tone }) {
  const cls = tone === "pos" ? "value pos" : tone === "neg" ? "value neg" : "value";
  return (
    <div className="metric">
      <div className={cls}>{value}</div>
      <div className="label">{label}</div>
    </div>
  );
}

export function Panel({ title, sub, children }) {
  return (
    <section className="panel">
      {title && <h2 className="panel-title">{title}</h2>}
      {sub && <p className="panel-sub">{sub}</p>}
      {children}
    </section>
  );
}

export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ErrorNote({ children }) {
  return <div className="error">{children}</div>;
}

export const toneOf = (v) => (v == null ? undefined : v >= 0 ? "pos" : "neg");

export const CHART_COLORS = ["#0e6e4b", "#2851a3", "#c4442c", "#8a5a00", "#5b3a8e", "#17211b"];

export const PERIODS = [
  { value: "6mo", label: "6 months" },
  { value: "1y", label: "1 year" },
  { value: "2y", label: "2 years" },
  { value: "5y", label: "5 years" },
];

export const BENCHMARKS = [
  { value: "^NSEI", label: "NIFTY 50" },
  { value: "^BSESN", label: "SENSEX" },
  { value: "^GSPC", label: "S&P 500" },
  { value: "^IXIC", label: "NASDAQ Composite" },
];

export const benchLabel = (v) => BENCHMARKS.find((b) => b.value === v)?.label ?? v;
