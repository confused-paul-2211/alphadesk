// Thin fetch wrapper around the AlphaDesk backend.
// In dev, Vite proxies /api to http://localhost:8000 (see vite.config.js).

const BASE = "/api";

async function request(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status}).`;
    try {
      const body = await res.json();
      if (body.detail) message = typeof body.detail === "string" ? body.detail : message;
    } catch { /* keep default message */ }
    throw new Error(message);
  }
  return res.json();
}

const post = (url, body) =>
  request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const getQuote = (t) => request(`${BASE}/quote/${encodeURIComponent(t)}`);
export const getHistory = (t, period = "1y") =>
  request(`${BASE}/history/${encodeURIComponent(t)}?period=${period}`);
export const getFundamentals = (t) =>
  request(`${BASE}/fundamentals/${encodeURIComponent(t)}`);
export const compareTickers = (tickers, period = "1y") =>
  request(`${BASE}/compare?tickers=${encodeURIComponent(tickers.join(","))}&period=${period}`);
export const analyzePortfolio = (payload) => post(`${BASE}/portfolio/analyze`, payload);
export const getFrontier = (tickers, period, riskFree) =>
  request(
    `${BASE}/portfolio/frontier?tickers=${encodeURIComponent(tickers.join(","))}` +
      `&period=${period}&risk_free=${riskFree}`
  );
export const savePortfolio = (name, holdings) => post(`${BASE}/portfolios`, { name, holdings });
export const listPortfolios = () => request(`${BASE}/portfolios`);
export const deletePortfolio = (id) => request(`${BASE}/portfolios/${id}`, { method: "DELETE" });
