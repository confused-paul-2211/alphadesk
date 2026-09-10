"""
Tiny SQLite persistence layer for saved portfolios.

Uses the standard-library sqlite3 module — zero configuration, and the
database file (portfolios.db) is created next to this script on first run.
Connections are opened per call, which keeps things thread-safe under
uvicorn without any pooling machinery.
"""

from __future__ import annotations

import json
import os
import pathlib
import sqlite3

# Default: a file next to this script. Override with ALPHADESK_DB when the
# host provides a persistent volume (e.g. a Render disk mounted at /data):
#   ALPHADESK_DB=/data/portfolios.db
DB_PATH = pathlib.Path(os.environ.get("ALPHADESK_DB") or pathlib.Path(__file__).parent / "portfolios.db")


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init() -> None:
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS portfolios (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                name       TEXT NOT NULL,
                holdings   TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
            """
        )


def save_portfolio(name: str, holdings: list[dict]) -> int:
    with _conn() as c:
        cur = c.execute(
            "INSERT INTO portfolios (name, holdings) VALUES (?, ?)",
            (name, json.dumps(holdings)),
        )
        return int(cur.lastrowid)


def list_portfolios() -> list[dict]:
    with _conn() as c:
        rows = c.execute("SELECT * FROM portfolios ORDER BY id DESC").fetchall()
    return [
        {
            "id": r["id"],
            "name": r["name"],
            "holdings": json.loads(r["holdings"]),
            "created_at": r["created_at"],
        }
        for r in rows
    ]


def delete_portfolio(portfolio_id: int) -> bool:
    with _conn() as c:
        cur = c.execute("DELETE FROM portfolios WHERE id = ?", (portfolio_id,))
        return cur.rowcount > 0
