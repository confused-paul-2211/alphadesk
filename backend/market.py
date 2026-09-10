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


def _matrix_from_raw(raw: pd.DataFrame, tickers: list[str]) -> pd.DataFrame:
    """Pure post-processing of a batched yf.download result (offline-testable).

    Extracts the Close panel, flags symbols that returned nothing (an
    all-NaN column would otherwise silently wipe every row in dropna),
    and aligns the rest on shared trading days.
    """
    if raw is None or raw.empty:
        raise ValueError("No price data returned. Check the symbols.")
    if isinstance(raw.columns, pd.MultiIndex):
        close = raw["Close"]
    else:  # single ticker fallback shape
        close = raw[["Close"]].rename(columns={"Close": tickers[0]})
    dead = [t for t in tickers if t not in close.columns or close[t].isna().all()]
    if dead:
        raise ValueError(f"No data for: {', '.join(dead)}. Check those symbols.")
    return close[tickers].dropna()


def get_close_matrix(tickers: list[str], period: str = "1y") -> pd.DataFrame:
    """Adjusted-close DataFrame, one column per ticker, aligned on shared dates.

    Multi-ticker requests go through ONE batched yf.download call instead of
    a call per symbol — the difference between ~2s and ~2min for a 100-stock
    portfolio, and far kinder to Yahoo's rate limits.
    """
    if len(tickers) == 1:
        df = pd.DataFrame({tickers[0]: get_history(tickers[0], period)["Close"]}).dropna()
    else:
        def fetch():
            raw = yf.download(
                tickers, period=period, auto_adjust=True,
                progress=False, group_by="column", threads=True,
            )
            return _matrix_from_raw(raw, tickers)
        df = _cached(("matrix", tuple(sorted(tickers)), period), fetch, ttl=300).copy()
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


def _row(df, *names):
    """Most recent value of the first matching row in a yfinance statement DataFrame."""
    try:
        if df is None or df.empty:
            return None
        for n in names:
            if n in df.index:
                s = df.loc[n].dropna()
                if len(s):
                    return float(s.iloc[0])  # yfinance orders columns newest-first
    except Exception:
        pass
    return None


def _derive_fundamentals(price, mcap, shares, net_income, revenue, equity, ttm_divs):
    """Pure ratio math from raw building blocks (offline-testable).

    Returns only the keys it can actually compute; callers merge these in
    wherever Yahoo's `.info` came back empty.
    """
    out = {}
    if net_income is not None and shares:
        out["eps"] = _num(net_income / shares)
    if price and out.get("eps") and out["eps"] > 0:
        out["pe_trailing"] = _num(price / out["eps"])
    if mcap and equity and equity > 0:
        out["pb"] = _num(mcap / equity)
    if net_income is not None and equity and equity > 0:
        out["roe"] = _num(net_income / equity)
    if net_income is not None and revenue:
        out["net_margin"] = _num(net_income / revenue)
    if ttm_divs is not None and price:
        out["dividend_yield"] = _num(ttm_divs / price)
    return {k: v for k, v in out.items() if v is not None}


def _computed_beta(ticker: str):
    """1-year beta regressed against the home index (chart endpoint only)."""
    bench = "^NSEI" if ticker.upper().endswith((".NS", ".BO")) else "^GSPC"
    try:
        px = get_close_matrix([ticker, bench], "1y")
        r = px.pct_change().dropna()
        if len(r) < 60:
            return None
        varb = r[bench].var()
        return _num(r[ticker].cov(r[bench]) / varb) if varb else None
    except Exception:
        return None


def get_fundamentals(ticker: str) -> dict:
    """Valuation and quality metrics, resilient to Yahoo's endpoint moods.

    Layered sourcing:
      1. `.info` (quoteSummary) — richest payload, but heavily throttled,
         especially from cloud/datacenter IPs, where it often returns an
         empty shell while everything else still works.
      2. Financial statements + fast_info — recompute EPS, P/E, P/B, ROE
         and net margin from first principles (a different endpoint that
         usually stays up when `.info` doesn't).
      3. Dividend history -> trailing yield; 1-year regression vs the home
         index -> beta. Both ride the chart endpoint — the most reliable.

    Fields that no layer can source come back null and render as "—".
    """
    def fetch():
        tk = yf.Ticker(ticker)
        try:
            info = tk.info or {}
        except Exception:
            info = {}
        out = {"ticker": ticker}
        for src, alias in _FUNDAMENTAL_KEYS.items():
            v = info.get(src)
            out[alias] = v if isinstance(v, str) else _num(v)

        core = ("pe_trailing", "pb", "eps", "roe", "net_margin", "dividend_yield")
        if any(out.get(k) is None for k in core):
            fi = _safe_attr(tk, "fast_info")
            price = _num(_safe_attr(fi, "last_price")) if fi else None
            mcap = out.get("market_cap") or (_num(_safe_attr(fi, "market_cap")) if fi else None)
            shares = _num(_safe_attr(fi, "shares")) if fi else None

            try:
                inc = tk.income_stmt
            except Exception:
                inc = None
            try:
                bs = tk.balance_sheet
            except Exception:
                bs = None

            net_income = _row(inc, "Net Income", "Net Income Common Stockholders")
            revenue = _row(inc, "Total Revenue", "Operating Revenue")
            equity = _row(bs, "Stockholders Equity", "Common Stock Equity",
                          "Total Equity Gross Minority Interest")
            if shares is None:
                shares = _row(bs, "Ordinary Shares Number", "Share Issued")

            ttm_divs = None
            try:
                divs = tk.dividends
                if divs is not None and len(divs):
                    cutoff = divs.index.max() - pd.Timedelta(days=365)
                    recent = divs[divs.index >= cutoff]
                    ttm_divs = float(recent.sum()) if len(recent) else None
            except Exception:
                pass

            derived = _derive_fundamentals(price, mcap, shares, net_income,
                                           revenue, equity, ttm_divs)
            for k, v in derived.items():
                if out.get(k) is None:
                    out[k] = v
            if out.get("eps") is None:
                out["eps"] = _num(_row(inc, "Diluted EPS", "Basic EPS"))
                if out.get("pe_trailing") is None and price and out.get("eps") and out["eps"] > 0:
                    out["pe_trailing"] = _num(price / out["eps"])
            if out.get("market_cap") is None:
                out["market_cap"] = mcap

        if out.get("beta") is None:
            out["beta"] = _computed_beta(ticker)
        return out
    return _cached(("fund", ticker), fetch, ttl=3600)


# ------------------------------------------------------------ demo mode
#
# ALPHADESK_DEMO=1 swaps this module's data source for a seeded, fully
# offline synthetic market (see demo.py). Same function signatures, same
# response shapes — the rest of the app can't tell the difference. Useful
# for classrooms, flaky WiFi, and environments where Yahoo is unreachable.
import os as _os
if _os.environ.get("ALPHADESK_DEMO"):
    from demo import (  # noqa: F401
        get_history, get_close_matrix, get_quote, get_fundamentals,
    )
