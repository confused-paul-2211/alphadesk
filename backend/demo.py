"""
AlphaDesk demo mode — a fully offline synthetic market.

Activate with the environment variable ALPHADESK_DEMO=1 (see the bottom of
market.py). Every data function in the app then draws from a *seeded*
one-factor model instead of Yahoo Finance:

    r_stock(t) = alpha/252 + beta * r_market(t) + idiosyncratic(t)

All series share one simulated market-factor path, so CAPM betas, the
correlation heatmap, and the diversification benefit behave the way a real
equity market does — not like independent random walks. The seed is fixed:
every run shows the same "history", which makes demos reproducible.

Use cases: classrooms and presentations with no/flaky internet, grading
without hammering Yahoo, and environments where Yahoo is unreachable.
Numbers are statistically plausible but entirely fictional.
"""

from __future__ import annotations

import hashlib

import numpy as np
import pandas as pd

TRADING_DAYS = 252
_YEARS = 5.3          # enough history to serve the "5y" period fully
_SEED = 20260910

# ticker: (start_price, beta, annual_alpha, idio_vol, profile)
_UNIVERSE = {
    "RELIANCE.NS": (2450, 1.05, 0.020, 0.16, dict(name="Reliance Industries (demo)", sector="Energy", industry="Oil & Gas Integrated", pe=27.4, pb=2.3, eps=102.5, dy=0.0035, roe=0.089, nm=0.078, de=41.2, rg=0.081, mcap=1.95e13)),
    "TCS.NS":      (3900, 0.80, 0.015, 0.14, dict(name="Tata Consultancy Services (demo)", sector="Technology", industry="IT Services", pe=30.1, pb=13.8, eps=134.2, dy=0.014, roe=0.46, nm=0.19, de=8.5, rg=0.055, mcap=1.42e13)),
    "HDFCBANK.NS": (1650, 1.10, 0.010, 0.15, dict(name="HDFC Bank (demo)", sector="Financial Services", industry="Banks — Private", pe=19.6, pb=2.9, eps=86.0, dy=0.011, roe=0.155, nm=0.26, de=None, rg=0.10, mcap=1.28e13)),
    "INFY.NS":     (1500, 0.85, 0.005, 0.15, dict(name="Infosys (demo)", sector="Technology", industry="IT Services", pe=25.3, pb=7.1, eps=61.0, dy=0.023, roe=0.30, nm=0.165, de=9.1, rg=0.046, mcap=6.4e12)),
    "ITC.NS":      (440,  0.70, 0.015, 0.13, dict(name="ITC (demo)", sector="Consumer Defensive", industry="Tobacco & FMCG", pe=26.8, pb=7.4, eps=16.6, dy=0.031, roe=0.28, nm=0.25, de=0.3, rg=0.062, mcap=5.5e12)),
    "TATAMOTORS.NS": (950, 1.35, 0.025, 0.24, dict(name="Tata Motors (demo)", sector="Consumer Cyclical", industry="Auto Manufacturers", pe=17.2, pb=3.1, eps=55.0, dy=0.006, roe=0.22, nm=0.065, de=95.0, rg=0.13, mcap=3.2e12)),
    "^NSEI":  (22500, 1.00, 0.0, 0.0,  dict(name="NIFTY 50 (demo)", sector=None, industry=None, pe=None, pb=None, eps=None, dy=None, roe=None, nm=None, de=None, rg=None, mcap=None)),
    "^BSESN": (74000, 0.98, 0.0, 0.01, dict(name="S&P BSE SENSEX (demo)", sector=None, industry=None, pe=None, pb=None, eps=None, dy=None, roe=None, nm=None, de=None, rg=None, mcap=None)),
    "^GSPC":  (5600,  0.55, 0.02, 0.07, dict(name="S&P 500 (demo)", sector=None, industry=None, pe=None, pb=None, eps=None, dy=None, roe=None, nm=None, de=None, rg=None, mcap=None)),
    "^IXIC":  (18000, 0.65, 0.03, 0.10, dict(name="NASDAQ Composite (demo)", sector=None, industry=None, pe=None, pb=None, eps=None, dy=None, roe=None, nm=None, de=None, rg=None, mcap=None)),
}

_PERIOD_DAYS = {"1mo": 21, "3mo": 63, "6mo": 126, "1y": 252, "2y": 504, "5y": 1260, "max": 10**6}


def _params_for(ticker: str):
    """Known tickers get their profile; unknown ones get deterministic params."""
    if ticker in _UNIVERSE:
        return _UNIVERSE[ticker]
    h = int(hashlib.md5(ticker.encode()).hexdigest(), 16)
    start = 100 + (h % 3900)
    beta = 0.6 + (h >> 8) % 100 / 100.0          # 0.6 – 1.6
    alpha = ((h >> 16) % 9 - 4) / 100.0          # −4% … +4%
    ivol = 0.12 + (h >> 24) % 16 / 100.0         # 12% – 28%
    prof = dict(name=f"{ticker} (demo)", sector="Demo", industry="Synthetic",
                pe=12 + (h >> 4) % 30, pb=1 + (h >> 6) % 9, eps=round(start / (12 + (h >> 4) % 30), 2),
                dy=((h >> 10) % 40) / 1000.0, roe=0.08 + ((h >> 12) % 25) / 100.0,
                nm=0.05 + ((h >> 14) % 25) / 100.0, de=(h >> 18) % 120, rg=((h >> 20) % 18) / 100.0,
                mcap=float(start) * 2e8)
    return start, beta, alpha, ivol, prof


def _dates() -> pd.DatetimeIndex:
    end = pd.Timestamp.today().normalize()
    return pd.bdate_range(end=end, periods=int(_YEARS * TRADING_DAYS))


_market_cache: dict = {}


def _market_factor() -> np.ndarray:
    """One shared market path: ~11% drift, ~14% vol, mild fat-ish tails."""
    if "factor" not in _market_cache:
        rng = np.random.default_rng(_SEED)
        n = len(_dates())
        r = rng.normal(0.11 / TRADING_DAYS, 0.14 / np.sqrt(TRADING_DAYS), n)
        shocks = rng.random(n) < 0.01                      # occasional bad days
        r[shocks] -= rng.uniform(0.01, 0.03, shocks.sum())
        _market_cache["factor"] = r
    return _market_cache["factor"]


def _close_series(ticker: str) -> pd.Series:
    key = ("close", ticker)
    if key not in _market_cache:
        start, beta, alpha, ivol, _ = _params_for(ticker)
        seed = _SEED ^ int(hashlib.md5(ticker.encode()).hexdigest()[:8], 16)
        rng = np.random.default_rng(seed)
        rm = _market_factor()
        eps = rng.normal(0, ivol / np.sqrt(TRADING_DAYS), len(rm))
        r = alpha / TRADING_DAYS + beta * rm + eps
        closes = start * np.cumprod(1 + r)
        _market_cache[key] = pd.Series(closes, index=_dates(), name="Close")
    return _market_cache[key]


# --------------------------- the four functions market.py delegates to

def get_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    close = _close_series(ticker)
    n = min(_PERIOD_DAYS.get(period, 252), len(close))
    close = close.iloc[-n:]
    seed = _SEED ^ int(hashlib.md5((ticker + "ohlc").encode()).hexdigest()[:8], 16)
    rng = np.random.default_rng(seed)
    spread = 1 + np.abs(rng.normal(0, 0.006, len(close)))
    df = pd.DataFrame(index=close.index)
    df["Close"] = close
    df["Open"] = close.shift(1).fillna(close.iloc[0]) * (1 + rng.normal(0, 0.003, len(close)))
    df["High"] = np.maximum(df["Open"], df["Close"]) * spread
    df["Low"] = np.minimum(df["Open"], df["Close"]) / spread
    df["Volume"] = (rng.lognormal(14.5, 0.35, len(close))).astype(int)
    return df


def get_close_matrix(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    frames = {t: get_history(t, period)["Close"] for t in tickers}
    df = pd.DataFrame(frames).dropna()
    if df.empty or len(df) < 2:
        raise ValueError("No overlapping demo data — check the symbols.")
    return df


def get_quote(ticker: str) -> dict:
    close = _close_series(ticker)
    price, prev = float(close.iloc[-1]), float(close.iloc[-2])
    _, _, _, _, prof = _params_for(ticker)
    year = close.iloc[-TRADING_DAYS:]
    return {
        "ticker": ticker,
        "price": round(price, 2),
        "previous_close": round(prev, 2),
        "change_pct": round((price / prev - 1) * 100, 2),
        "currency": "INR" if ticker.endswith((".NS", ".BO")) or ticker in ("^NSEI", "^BSESN") else "USD",
        "market_cap": prof["mcap"],
        "year_high": round(float(year.max()), 2),
        "year_low": round(float(year.min()), 2),
    }


def get_fundamentals(ticker: str) -> dict:
    _, beta, _, _, p = _params_for(ticker)
    close = _close_series(ticker)
    year = close.iloc[-TRADING_DAYS:]
    return {
        "ticker": ticker, "name": p["name"], "sector": p["sector"], "industry": p["industry"],
        "pe_trailing": p["pe"], "pe_forward": round(p["pe"] * 0.92, 1) if p["pe"] else None,
        "pb": p["pb"], "eps": p["eps"], "dividend_yield": p["dy"], "beta": round(beta, 2),
        "roe": p["roe"], "net_margin": p["nm"], "debt_to_equity": p["de"],
        "revenue_growth": p["rg"], "market_cap": p["mcap"],
        "wk52_high": round(float(year.max()), 2), "wk52_low": round(float(year.min()), 2),
    }
