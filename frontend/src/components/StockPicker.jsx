import { useState } from "react";
import { INDICES, NAME_OF, SECTOR_LIST, bySector } from "../universe.js";

/** Sector-grouped dropdown + Add button. `exclude` hides already-chosen symbols. */
export function StockPicker({ onAdd, exclude = [], includeIndices = false, prompt = "Add a stock…" }) {
  const [pick, setPick] = useState("");
  const ex = new Set(exclude);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select value={pick} onChange={(e) => setPick(e.target.value)}>
        <option value="">{prompt}</option>
        {includeIndices && (
          <optgroup label="Indices">
            {INDICES.filter((i) => !ex.has(i.t)).map((i) => (
              <option key={i.t} value={i.t}>{i.name}</option>
            ))}
          </optgroup>
        )}
        {SECTOR_LIST.map((sec) => (
          <optgroup key={sec} label={sec}>
            {bySector(sec).filter((s) => !ex.has(s.t)).map((s) => (
              <option key={s.t} value={s.t}>{s.name} — {s.t}</option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        className="ghost"
        disabled={!pick}
        onClick={() => { if (pick) { onAdd(pick); setPick(""); } }}
      >
        Add
      </button>
    </div>
  );
}

/** Removable chips showing the chosen symbols (hover for the full name). */
export function Chips({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="chips">
      {items.map((t) => (
        <span className="chip" key={t} title={NAME_OF[t] || t}>
          {t}
          <button className="chip-x" onClick={() => onRemove(t)} aria-label={`Remove ${t}`}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
