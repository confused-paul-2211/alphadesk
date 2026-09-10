"""
Offline sanity tests — no internet required.

Runs the analytics engine on synthetic geometric-Brownian-motion prices and
exercises the non-network API routes with FastAPI's TestClient.

    python test_offline.py
"""

import numpy as np
import pandas as pd

import analytics


def make_prices(seed=0, days=260):
    rng = np.random.default_rng(seed)
    dates = pd.bdate_range("2025-01-01", periods=days)

    def gbm(mu, sigma):
        r = rng.normal(mu / 252, sigma / np.sqrt(252), days)
        return pd.Series(100 * np.cumprod(1 + r), index=dates)

    prices = pd.DataFrame({
        "AAA": gbm(0.14, 0.28),
        "BBB": gbm(0.09, 0.20),
        "CCC": gbm(0.18, 0.36),
    })
    bench = gbm(0.11, 0.17)
    bench.name = "BENCH"
    return prices, bench


def test_analytics():
    prices, bench = make_prices()
    res = analytics.analyze_portfolio(
        prices, bench, {"AAA": 0.5, "BBB": 0.3, "CCC": 0.2}, rf=0.06
    )

    p = res["portfolio"]
    assert -0.99 < p["ann_return"] < 5, p
    assert 0 < p["ann_vol"] < 2
    assert p["max_drawdown"] <= 0
    assert p["var_95_daily"] >= 0
    assert len(res["equity_curve"]) == len(res["drawdown_curve"])
    assert res["equity_curve"][0]["portfolio"] > 0

    m = np.array(res["correlation"]["matrix"])
    assert m.shape == (3, 3)
    assert np.allclose(m, m.T)
    assert np.allclose(np.diag(m), 1, atol=1e-6)

    # Diversification benefit should be non-negative for long-only weights.
    assert res["diversification"]["benefit"] >= -1e-9

    fr = analytics.efficient_frontier(prices, rf=0.06, n_sims=400)
    assert len(fr["points"]) == 400
    top = max(pt["sharpe"] for pt in fr["points"])
    assert fr["max_sharpe"]["sharpe"] >= top - 1e-6
    assert abs(sum(fr["max_sharpe"]["weights"].values()) - 1) < 1e-3
    print("analytics: all assertions passed")
    print(f"  portfolio  return={p['ann_return']:+.2%}  vol={p['ann_vol']:.2%}  "
          f"sharpe={p['sharpe']:.2f}  maxDD={p['max_drawdown']:.2%}  beta={p['beta']:.2f}")
    print(f"  frontier   max-sharpe={fr['max_sharpe']['sharpe']:.2f}  "
          f"min-vol={fr['min_vol']['vol']:.2%}")


def test_api_wiring():
    from fastapi.testclient import TestClient
    import main

    client = TestClient(main.app)
    assert client.get("/api/health").json()["status"] == "ok"

    r = client.post("/api/portfolios", json={
        "name": "Test portfolio",
        "holdings": [{"ticker": "aaa", "weight": 0.6}, {"ticker": "bbb", "weight": 0.4}],
    })
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    assert any(p["id"] == pid for p in client.get("/api/portfolios").json())
    assert client.delete(f"/api/portfolios/{pid}").status_code == 200
    assert client.delete(f"/api/portfolios/{pid}").status_code == 404

    # Validation should reject an empty holdings list without touching the network.
    assert client.post("/api/portfolio/analyze",
                       json={"holdings": []}).status_code == 422
    print("api wiring: all assertions passed")


if __name__ == "__main__":
    test_analytics()
    test_api_wiring()
    print("\nAll offline tests passed.")


def test_matrix_from_raw():
    """Batched-download post-processing: shapes, bad-symbol detection."""
    import numpy as np
    import pandas as pd
    from market import _matrix_from_raw

    idx = pd.date_range("2026-01-01", periods=5, freq="B")
    cols = pd.MultiIndex.from_product([["Close", "Open"], ["AAA", "BBB", "BAD"]])
    data = np.random.rand(5, 6) * 100
    raw = pd.DataFrame(data, index=idx, columns=cols)
    raw[("Close", "BAD")] = float("nan")

    try:
        _matrix_from_raw(raw, ["AAA", "BBB", "BAD"])
        raise AssertionError("should have flagged the dead symbol")
    except ValueError as e:
        assert "BAD" in str(e)

    ok = _matrix_from_raw(raw, ["AAA", "BBB"])
    assert list(ok.columns) == ["AAA", "BBB"] and len(ok) == 5
    print("matrix post-processing: bad-symbol detection + alignment OK")


test_matrix_from_raw()


def test_derived_fundamentals():
    """Statement-based ratio derivation with Reliance-like magnitudes."""
    from market import _derive_fundamentals, _row
    import pandas as pd

    d = _derive_fundamentals(
        price=1279.0, mcap=17.31e12, shares=13.53e9,
        net_income=6.96e11, revenue=9.6e12, equity=8.3e12, ttm_divs=5.5,
    )
    eps = 6.96e11 / 13.53e9
    assert abs(d["eps"] - eps) < 0.01
    assert abs(d["pe_trailing"] - 1279.0 / eps) < 0.05          # ~24.9x
    assert abs(d["pb"] - 17.31e12 / 8.3e12) < 0.01              # ~2.09x
    assert abs(d["roe"] - 6.96e11 / 8.3e12) < 1e-4              # ~8.4%
    assert abs(d["net_margin"] - 6.96e11 / 9.6e12) < 1e-4       # ~7.3%
    assert abs(d["dividend_yield"] - 5.5 / 1279.0) < 1e-5       # ~0.43%

    # guards: loss-maker has no meaningful P/E; broken equity is skipped
    d2 = _derive_fundamentals(1279.0, None, 13.53e9, -1e10, 9.6e12, 0, None)
    assert "pe_trailing" not in d2 and "pb" not in d2 and "roe" not in d2
    assert d2["net_margin"] < 0

    # _row: picks the first matching label, newest column
    df = pd.DataFrame({"2026": [10.0], "2025": [8.0]}, index=["Net Income"])
    assert _row(df, "Net Income Common Stockholders", "Net Income") == 10.0
    assert _row(df, "Nonexistent") is None
    print("derived fundamentals: ratios, guards, row lookup OK")


def test_fundamentals_resilience_offline():
    """With no network at all, get_fundamentals must degrade to nulls, never raise."""
    from market import get_fundamentals
    out = get_fundamentals("RELIANCE.NS")
    assert out["ticker"] == "RELIANCE.NS"
    assert "pe_trailing" in out and "beta" in out
    print("no-network resilience: graceful nulls, no exception "
          f"(pe={out['pe_trailing']}, beta={out['beta']})")


test_derived_fundamentals()
test_fundamentals_resilience_offline()
