# AlphaDesk

A full-stack portfolio analytics and equity research platform, built on **free market data** (no API key required). Designed as an MBA finance project: every number on screen maps to a concept from portfolio management, corporate finance, or the CFA Level I curriculum.

**Stack:** React + Vite + Recharts · FastAPI (Python) · SQLite · yfinance (Yahoo Finance)

---

## What it does

**Stock explorer** — live quote, valuation snapshot (P/E, P/B, ROE, margins, dividend yield, market cap), and an adjusted-close price chart for any Yahoo Finance symbol, including NSE/BSE listings.

**Portfolio lab** — build a weighted portfolio and get a full risk-and-return report: annualised return and volatility, Sharpe and Sortino ratios, CAPM beta and Jensen's alpha versus a chosen benchmark (NIFTY 50, SENSEX, S&P 500, NASDAQ), maximum drawdown, one-day 95% historical VaR, a growth-of-100 curve against the benchmark, a drawdown chart, per-holding stats, and a correlation heatmap. Portfolios can be saved to and loaded from a SQLite database.

**Efficient frontier** — a Monte Carlo sketch of Markowitz mean-variance optimisation: 2,500 random long-only weightings plotted by risk and return, with the max-Sharpe (tangency) and minimum-variance portfolios highlighted and their weights reported.

**Compare** — up to six symbols rebased to 100, so stocks and indices in different currencies can be read side by side.

---

## Architecture

```
┌─────────────────────────┐        ┌──────────────────────────┐
│  React SPA (Vite)       │  /api  │  FastAPI backend         │
│  Recharts visuals       │ ─────► │  main.py    (routes)     │
│  4 views, shared UI kit │ ◄───── │  analytics.py (pure math)│
└─────────────────────────┘  JSON  │  market.py  (data + TTL  │
                                   │              cache)      │
                                   │  db.py      (SQLite)     │
                                   └─────┬──────────────┬─────┘
                                         │              │
                                   Yahoo Finance   portfolios.db
                                   (via yfinance)  (saved portfolios)
```

Deliberate design choices worth mentioning in a walkthrough:

- **`analytics.py` is pure.** Every finance function takes pandas objects and returns plain Python — no network calls. That is why `test_offline.py` can validate the math on synthetic data without internet access.
- **`market.py` is the only module that touches the outside world**, behind a small TTL cache. Swapping Yahoo for Alpha Vantage or Finnhub means rewriting four functions and nothing else.
- **The frontend never computes finance.** It renders what the API returns, so the numbers in the UI and the numbers in the API docs can never disagree.

---

## Quickstart

Prerequisites: Python 3.10+ and Node 18+.

**1. Backend** (from `backend/`):

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Interactive API docs are auto-generated at http://localhost:8000/docs — useful in a demo.

**2. Frontend** (from `frontend/`, in a second terminal):

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api` to the backend, so it behaves as one app.

**3. Verify the engine** (optional, no internet needed):

```bash
cd backend && python test_offline.py
```

---

## Ticker cheat sheet (Yahoo symbols)

| Market | Format | Examples |
|---|---|---|
| NSE (India) | `SYMBOL.NS` | `RELIANCE.NS`, `TCS.NS`, `HDFCBANK.NS`, `ITC.NS` |
| BSE (India) | `SYMBOL.BO` | `RELIANCE.BO` |
| US | plain | `AAPL`, `MSFT`, `NVDA` |
| Indices | `^…` | `^NSEI` (NIFTY 50), `^BSESN` (SENSEX), `^GSPC` (S&P 500) |
| Crypto / FX | pairs | `BTC-USD`, `USDINR=X` |

---

## API reference

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Liveness check |
| GET | `/api/quote/{ticker}` | Live price, day change, market cap, 52-week range |
| GET | `/api/history/{ticker}?period=1y` | OHLCV candles (adjusted) |
| GET | `/api/fundamentals/{ticker}` | P/E, P/B, EPS, ROE, margins, D/E, beta |
| GET | `/api/compare?tickers=A,B&period=1y` | Series rebased to 100 |
| POST | `/api/portfolio/analyze` | Full risk/return report for weighted holdings |
| GET | `/api/portfolio/frontier?tickers=A,B,C` | Monte Carlo efficient frontier |
| POST/GET/DELETE | `/api/portfolios` | Save, list, delete portfolios (SQLite) |

---

## The finance inside (and where it comes from)

| Metric in the app | Concept | Where you meet it |
|---|---|---|
| Annualised return | Geometric compounding of daily returns | Quant methods (TVM, HPR) |
| Annualised volatility | σ of daily returns × √252 | Quant methods / portfolio management |
| Sharpe ratio | Excess return per unit of total risk | Portfolio management (CFA L1) |
| Sortino ratio | Excess return per unit of *downside* risk | Risk-adjusted performance |
| Beta | Cov(rp, rb) / Var(rb) — CAPM's systematic risk | CAPM, cost of equity, corporate finance |
| Jensen's alpha | Return above the CAPM-required return | Performance attribution |
| Max drawdown | Worst peak-to-trough loss | Risk management |
| 95% one-day VaR | Loss threshold from the historical distribution | Market risk (historical simulation method) |
| Correlation heatmap | Why imperfect correlation reduces portfolio σ | Diversification, MPT |
| Efficient frontier | Markowitz mean-variance optimisation; tangency portfolio | Modern Portfolio Theory (CFA L1 PM) |

The Portfolio lab also reports the **diversification benefit** explicitly: weighted-average holding volatility minus portfolio volatility — the single clearest demonstration of why correlation matters.

---

## Data source notes

- **yfinance** wraps Yahoo Finance's public endpoints: free, no key, no hard quota, and it covers Indian tickers — which is why it's the default here. It is *unofficial*, so treat it as an educational data source, and expect occasional throttling (the built-in cache helps).
- **Swapping providers:** implement `get_history`, `get_close_matrix`, `get_quote`, `get_fundamentals` in `market.py` against your provider of choice. Free-tier alternatives: Alpha Vantage (25 req/day), Finnhub (60 req/min, weak Indian coverage), Twelve Data (800 req/day).
- Prices are **adjusted closes**, so returns already account for splits and dividends.

## Known limitations (own these in an interview — they're features of your judgement)

- All statistics are **historical/in-sample**; past μ and σ are noisy estimates of the future. This is the standard critique of naïve mean-variance optimisation.
- The Monte Carlo frontier is a *sketch*, not a solved optimisation (a `scipy.optimize` version is a natural extension).
- VaR here is the historical-simulation method: simple and assumption-light, but blind to regimes not in the sample.
- Yahoo's `.info` fundamentals are best-effort and sometimes null for Indian listings.

---

## Deploying it (free, no credit card)

In production the two dev servers collapse into **one service**: the `Dockerfile` builds the React app (stage 1) and copies it into the Python image (stage 2), where FastAPI serves it as static files alongside the API. Same origin, so no CORS and no proxy — the frontend's relative `/api` calls just work.

**Option A — Render (recommended: a clean `*.onrender.com` URL + a GitHub repo to link on your resume).** One command:

```bash
./deploy.sh        # Windows: run `bash deploy.sh` inside Git Bash
```

The script commits the project, pushes it to a new public GitHub repo via the GitHub CLI (login happens in your browser — no tokens to paste), then prints your personal one-click link of the form `https://render.com/deploy?repo=<your-repo>`. Open it, sign in with GitHub, approve — Render reads `render.yaml`, builds the Dockerfile (~5 min), and hands you a live URL. Prefer manual? The equivalent is `git init/commit/push` to GitHub, then **New + → Blueprint** on [render.com](https://render.com).

**Option B — Hugging Face Spaces (no GitHub needed):** create a new **Space → Docker → Blank**, then upload the project files through the web UI (skip `node_modules`). The Dockerfile's default port (7860) is already what Spaces expects.

**Free-tier realities, worth stating up front in a demo:**
- Render's free instance **sleeps after ~15 idle minutes**; the first visit after that takes ~a minute to wake. Open the link *before* an interview, not during.
- The filesystem is **ephemeral**: saved portfolios reset on each deploy/restart. For real persistence, attach a Render disk and set `ALPHADESK_DB=/data/portfolios.db` (already supported in `db.py`).
- Yahoo occasionally throttles requests from shared cloud IPs. The built-in cache absorbs most of it; if it becomes chronic, that's exactly what the provider-swap seam in `market.py` is for.

---

## Roadmap ideas

Fama-French three-factor regression per holding · DCF valuation module fed by the fundamentals endpoint · scipy-solved frontier with a capital allocation line · user accounts (JWT) so saved portfolios are per-user · news sentiment column · deployment (backend on Render/Railway free tier, frontend on Vercel/Netlify).

---

## Talking about it on a resume

> Built a full-stack portfolio analytics platform (React, FastAPI, SQLite) computing Sharpe/Sortino, CAPM beta and Jensen's alpha, historical VaR, and a Monte Carlo Markowitz efficient frontier on live NSE/US market data; designed a provider-agnostic data layer with caching and an offline-testable analytics engine.

Questions to be ready for: *Why geometric rather than arithmetic annualisation for returns?* (Compounding — arithmetic overstates multi-period growth.) *Why does the portfolio's σ sit below the weighted average of holdings' σ?* (Correlations < 1.) *What breaks if you feed the optimiser five years of bull-market data?* (Estimation error — garbage in, optimal-looking garbage out.)

---

*Educational project. Nothing here is investment advice.*
