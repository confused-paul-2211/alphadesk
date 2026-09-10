// Correlation heatmap: a CSS grid, no chart library needed.

const cellColor = (v) => {
  const t = Math.max(-1, Math.min(1, v));
  return t >= 0
    ? `rgba(14, 110, 75, ${0.06 + 0.5 * t})`
    : `rgba(196, 68, 44, ${0.06 + 0.5 * -t})`;
};

export default function Heatmap({ tickers, matrix }) {
  const n = tickers.length;
  return (
    <div
      className="heat"
      style={{ gridTemplateColumns: `minmax(80px, auto) repeat(${n}, 1fr)` }}
    >
      <div className="cell head" />
      {tickers.map((t) => (
        <div key={`c-${t}`} className="cell head">{t}</div>
      ))}
      {tickers.map((rowT, i) => (
        <FragmentRow key={rowT} label={rowT} row={matrix[i]} />
      ))}
    </div>
  );
}

function FragmentRow({ label, row }) {
  return (
    <>
      <div className="cell head" style={{ textAlign: "right", paddingRight: 8 }}>{label}</div>
      {row.map((v, j) => (
        <div
          key={j}
          className="cell"
          style={{ background: cellColor(v), color: Math.abs(v) > 0.75 ? "#fff" : "inherit" }}
          title={v.toFixed(3)}
        >
          {v.toFixed(2)}
        </div>
      ))}
    </>
  );
}
