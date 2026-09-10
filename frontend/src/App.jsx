import { useEffect, useState } from "react";
import Compare from "./components/Compare.jsx";
import Frontier from "./components/Frontier.jsx";
import PortfolioLab from "./components/PortfolioLab.jsx";
import StockExplorer from "./components/StockExplorer.jsx";

const TABS = [
  { id: "explorer", label: "Stock explorer", view: StockExplorer },
  { id: "portfolio", label: "Portfolio lab", view: PortfolioLab },
  { id: "frontier", label: "Efficient frontier", view: Frontier },
  { id: "compare", label: "Compare", view: Compare },
];

export default function App() {
  const [tab, setTab] = useState("explorer");
  const [demo, setDemo] = useState(false);
  const Active = TABS.find((t) => t.id === tab).view;

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((h) => setDemo(Boolean(h.demo)))
      .catch(() => {});
  }, []);

  return (
    <>
      <header className="masthead">
        <div className="wrap">
          <div className="masthead-top">
            <div className="brand">
              Alpha<em>Desk</em>
              {demo && <span className="pill">demo data</span>}
            </div>
            <p className="tagline">
              Equity research and portfolio analytics, built on free market data.
            </p>
          </div>
          <nav className="tabs" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={`tab ${tab === t.id ? "active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="wrap">
        <Active />
      </main>

      <footer>
        <div className="wrap">
          An educational project — not investment advice. Prices and fundamentals
          come from Yahoo Finance via the open-source yfinance library.
        </div>
      </footer>
    </>
  );
}
