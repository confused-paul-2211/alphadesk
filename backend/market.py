"""
Market data layer for AlphaDesk.

All external data comes through this module, via the free `yfinance`
library (Yahoo Finance's public endpoints — no API key needed, and it
covers NSE/BSE tickers like RELIANCE.NS as well as US listings).

A small in-memory TTL cache keeps the app fast and polite to the data
source. To swap in a different provider later (Alpha Vantage, Finnhub,
Twelve Data), reimplement these four functions and nothing else in the
codebase has to change.
"""

from __future__ import annotations

import math
import time

import pandas as pd
import yfinance as yf

_CACHE: dict = {}


def _cached(key, fetch_fn, ttl: int = 300):
    now = time.time()
    hit = _CACHE.get(key)
    if hit and now - hit[0] < ttl:
        return hit[1]
    value = fetch_fn()
    _CACHE[key] = (now, value)
    return value


def _num(value):
    """Coerce to a JSON-safe float, or None."""
    try:
        f = float(value)
        return None if math.isnan(f) or math.isinf(f) else f
    except (TypeError, ValueError):
        return None


def _safe_attr(obj, name):
    try:
        return getattr(obj, name)
    except Exception:
        return None


# ----------------------------------------------------------- price data

def get_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    """OHLCV history with adjusted prices. Raises ValueError if empty."""
    def fetch():
        df = yf.Ticker(ticker).history(period=period, interval=interval, auto_adjust=True)
        if df is None or df.empty:
            raise ValueError(f"No price data returned for '{ticker}'. Check the symbol.")
        return df
    return _cached(("hist", ticker, period, interval), fetch, ttl=300)


def get_close_matrix(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    """Adjusted-close DataFrame, one column per ticker, aligned on shared dates."""
    frames = {t: get_history(t, period)["Close"] for t in tickers}
    df = pd.DataFrame(frames).dropna()
    if df.empty or len(df) < 2:
        raise ValueError(
            "No overlapping trading days across these tickers. "
            "Mixing exchanges with very different calendars, or a bad symbol, can cause this."
        )
    return df


# ---------------------------------------------------- quote/fundamentals

def get_quote(ticker: str) -> dict:
    """Lightweight live quote using yfinance's fast_info."""
    def fetch():
        fi = yf.Ticker(ticker).fast_info
        price = _num(_safe_attr(fi, "last_price"))
        prev = _num(_safe_attr(fi, "previous_close"))
        change = round((price / prev - 1) * 100, 2) if price and prev else None
        return {
            "ticker": ticker,
            "price": price,
            "previous_close": prev,
            "change_pct": change,
            "currency": _safe_attr(fi, "currency"),
            "market_cap": _num(_safe_attr(fi, "market_cap")),
            "year_high": _num(_safe_attr(fi, "year_high")),
            "year_low": _num(_safe_attr(fi, "year_low")),
        }
    return _cached(("quote", ticker), fetch, ttl=60)


_FUNDAMENTAL_KEYS = {
    "longName": "name",
    "sector": "sector",
    "industry": "industry",
    "trailingPE": "pe_trailing",
    "forwardPE": "pe_forward",
    "priceToBook": "pb",
    "trailingEps": "eps",
    "dividendYield": "dividend_yield",
    "beta": "beta",
    "returnOnEquity": "roe",
    "profitMargins": "net_margin",
    "debtToEquity": "debt_to_equity",
    "revenueGrowth": "revenue_growth",
    "marketCap": "market_cap",
    "fiftyTwoWeekHigh": "wk52_high",
    "fiftyTwoWeekLow": "wk52_low",
}


def get_fundamentals(ticker: str) -> dict:
    """Selected valuation and quality metrics from Yahoo's info payload.

    `.info` is best-effort: fields that Yahoo doesn't publish for a given
    listing simply come back as null.
    """
    def fetch():
        try:
            info = yf.Ticker(ticker).info or {}
        except Exception:
            info = {}
        out = {"ticker": ticker}
        for src, alias in _FUNDAMENTAL_KEYS.items():
            v = info.get(src)
            out[alias] = v if isinstance(v, str) else _num(v)
        return out
    return _cached(("fund", ticker), fetch, ttl=3600)
