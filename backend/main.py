"""
AlphaDesk API — FastAPI application.

Run from the backend/ directory:

    uvicorn main:app --reload --port 8000

Interactive docs (auto-generated): http://localhost:8000/docs
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

import pathlib

import analytics
import db
import market

app = FastAPI(
    title="AlphaDesk API",
    version="1.0.0",
    description="Portfolio analytics & equity research on free market data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for a local student project; lock down if deployed
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init()


# ------------------------------------------------------------- schemas

class Holding(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    weight: float = Field(gt=0, description="Relative weight; normalised server-side.")


class AnalyzeRequest(BaseModel):
    holdings: list[Holding] = Field(min_length=1, max_length=15)
    period: str = "1y"
    benchmark: str = "^NSEI"
    risk_free: float = Field(default=0.06, ge=0, le=0.25)


class SavePortfolioRequest(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    holdings: list[Holding] = Field(min_length=1, max_length=15)


def _clean_tickers(raw: list[str], lo: int = 1, hi: int = 15) -> list[str]:
    tickers = [t.strip().upper() for t in raw if t.strip()]
    if not (lo <= len(tickers) <= hi):
        raise HTTPException(400, f"Provide between {lo} and {hi} tickers.")
    if len(set(tickers)) != len(tickers):
        raise HTTPException(400, "Duplicate tickers in request.")
    return tickers


# ------------------------------------------------------------ endpoints

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "alphadesk"}


@app.get("/api/quote/{ticker}")
def quote(ticker: str):
    try:
        return market.get_quote(ticker.strip().upper())
    except Exception as e:
        raise HTTPException(502, f"Quote fetch failed: {e}")


@app.get("/api/history/{ticker}")
def history(ticker: str, period: str = "1y", interval: str = "1d"):
    try:
        df = market.get_history(ticker.strip().upper(), period, interval)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"History fetch failed: {e}")

    candles = []
    for idx, row in df.iterrows():
        vol = row.get("Volume")
        candles.append({
            "date": idx.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 2),
            "high": round(float(row["High"]), 2),
            "low": round(float(row["Low"]), 2),
            "close": round(float(row["Close"]), 2),
            "volume": 0 if vol is None or vol != vol else int(vol),
        })
    return {"ticker": ticker.upper(), "period": period, "candles": candles}


@app.get("/api/fundamentals/{ticker}")
def fundamentals(ticker: str):
    try:
        return market.get_fundamentals(ticker.strip().upper())
    except Exception as e:
        raise HTTPException(502, f"Fundamentals fetch failed: {e}")


@app.get("/api/compare")
def compare(tickers: str = Query(..., description="Comma-separated, e.g. AAPL,MSFT"),
            period: str = "1y"):
    tks = _clean_tickers(tickers.split(","), lo=1, hi=6)
    try:
        closes = market.get_close_matrix(tks, period)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"Data fetch failed: {e}")

    norm = closes / closes.iloc[0] * 100
    series = [
        {"date": d.strftime("%Y-%m-%d"), **{t: round(float(row[t]), 2) for t in tks}}
        for d, row in norm.iterrows()
    ]
    return {"tickers": tks, "period": period, "series": series}


@app.post("/api/portfolio/analyze")
def analyze(req: AnalyzeRequest):
    tickers = _clean_tickers([h.ticker for h in req.holdings])
    weights = {t: h.weight for t, h in zip(tickers, req.holdings)}
    benchmark = req.benchmark.strip().upper()
    if benchmark in tickers:
        raise HTTPException(400, "Benchmark can't also be a holding.")

    try:
        closes = market.get_close_matrix(tickers + [benchmark], req.period)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"Data fetch failed: {e}")

    if len(closes) < 30:
        raise HTTPException(422, "Fewer than 30 overlapping trading days — pick a longer period.")

    result = analytics.analyze_portfolio(
        closes[tickers], closes[benchmark], weights, req.risk_free
    )
    result.update({"benchmark": benchmark, "period": req.period, "risk_free": req.risk_free})
    return result


@app.get("/api/portfolio/frontier")
def frontier(tickers: str = Query(...), period: str = "1y",
             risk_free: float = 0.06, sims: int = 2500):
    tks = _clean_tickers(tickers.split(","), lo=2, hi=10)
    try:
        closes = market.get_close_matrix(tks, period)
    except ValueError as e:
        raise HTTPException(404, str(e))
    except Exception as e:
        raise HTTPException(502, f"Data fetch failed: {e}")

    result = analytics.efficient_frontier(closes, risk_free, n_sims=min(max(sims, 200), 5000))
    result.update({"period": period, "risk_free": risk_free})
    return result


# ---------------------------------------------------- saved portfolios

@app.post("/api/portfolios")
def create_portfolio(req: SavePortfolioRequest):
    holdings = [{"ticker": h.ticker.strip().upper(), "weight": h.weight} for h in req.holdings]
    pid = db.save_portfolio(req.name.strip(), holdings)
    return {"id": pid, "name": req.name.strip(), "holdings": holdings}


@app.get("/api/portfolios")
def get_portfolios():
    return db.list_portfolios()


@app.delete("/api/portfolios/{portfolio_id}")
def remove_portfolio(portfolio_id: int):
    if not db.delete_portfolio(portfolio_id):
        raise HTTPException(404, "Portfolio not found.")
    return {"deleted": portfolio_id}


# ---------------------------------------------------- static frontend (production)
#
# In production the React build is copied to backend/static (see the Dockerfile)
# and FastAPI serves it directly — one origin, no CORS trouble, no dev proxy.
# API routes are registered above, so they win over this catch-all mount.
# In local development the folder doesn't exist and this block is a no-op;
# Vite's dev server handles the frontend instead.

_STATIC = pathlib.Path(__file__).parent / "static"
if _STATIC.is_dir():
    app.mount("/", StaticFiles(directory=_STATIC, html=True), name="app")
