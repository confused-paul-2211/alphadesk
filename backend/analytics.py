"""
AlphaDesk analytics engine.

Every function here is pure: it takes pandas objects in and returns plain
Python data out. No network calls — which makes this module easy to unit
test and easy to explain in an interview.

Conventions
-----------
- Returns are simple daily returns computed from adjusted close prices.
- Annualisation uses 252 trading days.
- All ratios use annualised figures; the risk-free rate is an annual rate.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 252


# ---------------------------------------------------------------- basics

def daily_returns(prices):
    """Simple daily returns from a price Series or DataFrame."""
    return prices.pct_change().dropna()


def annualized_return(returns: pd.Series) -> float:
    """Geometric (compound) annualised return."""
    if len(returns) == 0:
        return 0.0
    growth = float((1 + returns).prod())
    if growth <= 0:
        return -1.0
    return growth ** (TRADING_DAYS / len(returns)) - 1


def annualized_vol(returns: pd.Series) -> float:
    """Annualised standard deviation of daily returns."""
    if len(returns) < 2:
        return 0.0
    return float(returns.std(ddof=1) * np.sqrt(TRADING_DAYS))


def sharpe_ratio(returns: pd.Series, rf: float) -> float:
    """(Annual return - risk-free) / annual volatility."""
    vol = annualized_vol(returns)
    return float((annualized_return(returns) - rf) / vol) if vol > 0 else 0.0


def sortino_ratio(returns: pd.Series, rf: float) -> float:
    """Like Sharpe, but penalises only downside volatility."""
    downside = returns[returns < 0]
    if len(downside) < 2:
        return 0.0
    dvol = float(downside.std(ddof=1) * np.sqrt(TRADING_DAYS))
    return float((annualized_return(returns) - rf) / dvol) if dvol > 0 else 0.0


def max_drawdown(returns: pd.Series) -> float:
    """Worst peak-to-trough decline of the cumulative return curve (negative)."""
    curve = (1 + returns).cumprod()
    peak = curve.cummax()
    return float((curve / peak - 1).min())


def var_historical(returns: pd.Series, level: float = 0.95) -> float:
    """One-day historical Value at Risk, returned as a positive fraction.

    'With `level` confidence, the portfolio should not lose more than this
    in a single day, based on the historical distribution.'
    """
    if len(returns) == 0:
        return 0.0
    return float(-np.percentile(returns, (1 - level) * 100))


def beta_alpha(asset_returns: pd.Series, bench_returns: pd.Series, rf: float):
    """CAPM beta and annualised Jensen's alpha versus a benchmark."""
    aligned = pd.concat([asset_returns, bench_returns], axis=1).dropna()
    if len(aligned) < 2:
        return 0.0, 0.0
    cov = np.cov(aligned.iloc[:, 0], aligned.iloc[:, 1])
    beta = float(cov[0, 1] / cov[1, 1]) if cov[1, 1] > 0 else 0.0
    ann_a = annualized_return(aligned.iloc[:, 0])
    ann_b = annualized_return(aligned.iloc[:, 1])
    alpha = float(ann_a - (rf + beta * (ann_b - rf)))
    return beta, alpha


# ------------------------------------------------------ portfolio report

def analyze_portfolio(
    prices: pd.DataFrame,
    bench_prices: pd.Series,
    weights: dict[str, float],
    rf: float,
) -> dict:
    """Full risk/return report for a weighted portfolio.

    Parameters
    ----------
    prices : DataFrame of adjusted closes, one column per ticker.
    bench_prices : Series of benchmark adjusted closes (same index ideally).
    weights : {ticker: weight}. Normalised to sum to 1 internally.
    rf : annual risk-free rate, e.g. 0.06 for 6%.
    """
    tickers = list(prices.columns)
    w = np.array([float(weights[t]) for t in tickers])
    w = w / w.sum()

    rets = daily_returns(prices)
    port_rets = pd.Series(rets.values @ w, index=rets.index, name="portfolio")
    bench_rets = daily_returns(bench_prices)

    beta, alpha = beta_alpha(port_rets, bench_rets, rf)

    per_asset = []
    for i, t in enumerate(tickers):
        r = rets[t]
        b, _ = beta_alpha(r, bench_rets, rf)
        per_asset.append({
            "ticker": t,
            "weight": round(float(w[i]), 4),
            "ann_return": annualized_return(r),
            "ann_vol": annualized_vol(r),
            "sharpe": sharpe_ratio(r, rf),
            "beta": b,
        })

    port_vol = annualized_vol(port_rets)
    weighted_avg_vol = float(sum(a["ann_vol"] * a["weight"] for a in per_asset))

    corr = rets.corr()

    # Normalised value curves (both start at 100) and drawdown series.
    curve = (1 + port_rets).cumprod() * 100
    bcurve = (1 + bench_rets.reindex(port_rets.index).fillna(0)).cumprod() * 100
    dd = curve / curve.cummax() - 1

    equity_curve = [
        {
            "date": d.strftime("%Y-%m-%d"),
            "portfolio": round(float(pv), 2),
            "benchmark": round(float(bv), 2),
        }
        for d, pv, bv in zip(curve.index, curve.values, bcurve.values)
    ]
    drawdown_curve = [
        {"date": d.strftime("%Y-%m-%d"), "drawdown": round(float(v) * 100, 2)}
        for d, v in dd.items()
    ]

    return {
        "portfolio": {
            "ann_return": annualized_return(port_rets),
            "ann_vol": port_vol,
            "sharpe": sharpe_ratio(port_rets, rf),
            "sortino": sortino_ratio(port_rets, rf),
            "max_drawdown": max_drawdown(port_rets),
            "var_95_daily": var_historical(port_rets, 0.95),
            "beta": beta,
            "jensens_alpha": alpha,
        },
        "diversification": {
            "weighted_avg_vol": weighted_avg_vol,
            "portfolio_vol": port_vol,
            "benefit": weighted_avg_vol - port_vol,
        },
        "holdings": per_asset,
        "correlation": {
            "tickers": tickers,
            "matrix": [[round(float(x), 3) for x in row] for row in corr.values],
        },
        "equity_curve": equity_curve,
        "drawdown_curve": drawdown_curve,
    }


# --------------------------------------------------- efficient frontier

def efficient_frontier(
    prices: pd.DataFrame,
    rf: float,
    n_sims: int = 2500,
    seed: int = 7,
) -> dict:
    """Monte Carlo sketch of the Markowitz frontier.

    Simulates `n_sims` random long-only weight vectors, computes each
    portfolio's annualised return, volatility and Sharpe ratio, and tracks
    the max-Sharpe (tangency) and minimum-variance portfolios.
    """
    rets = daily_returns(prices)
    mean = rets.mean().values * TRADING_DAYS
    cov = rets.cov().values * TRADING_DAYS
    n = len(prices.columns)
    rng = np.random.default_rng(seed)

    points = []
    best = {"sharpe": -1e18}
    minv = {"vol": 1e18}
    for _ in range(int(n_sims)):
        w = rng.random(n)
        w = w / w.sum()
        r = float(w @ mean)
        v = float(np.sqrt(w @ cov @ w))
        s = (r - rf) / v if v > 0 else 0.0
        points.append({"ret": round(r, 4), "vol": round(v, 4), "sharpe": round(s, 3)})
        if s > best["sharpe"]:
            best = {
                "ret": r, "vol": v, "sharpe": s,
                "weights": {t: round(float(x), 4) for t, x in zip(prices.columns, w)},
            }
        if v < minv["vol"]:
            minv = {
                "ret": r, "vol": v, "sharpe": s,
                "weights": {t: round(float(x), 4) for t, x in zip(prices.columns, w)},
            }

    assets = [
        {
            "ticker": t,
            "ret": round(float(mean[i]), 4),
            "vol": round(float(np.sqrt(cov[i, i])), 4),
        }
        for i, t in enumerate(prices.columns)
    ]
    return {"points": points, "max_sharpe": best, "min_vol": minv, "assets": assets}
