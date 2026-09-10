#!/usr/bin/env bash
# AlphaDesk — one-command deploy.
#
# What it does:
#   1. Turns this folder into a git repo and commits it (idempotent).
#   2. Creates a public GitHub repo and pushes, via the GitHub CLI (`gh`),
#      which handles login in your browser — no tokens to paste anywhere.
#   3. Prints your personal one-click "Deploy to Render" link.
#
# Usage:   ./deploy.sh          (macOS / Linux / WSL)
#          bash deploy.sh       (Windows: run inside Git Bash)

set -euo pipefail
cd "$(dirname "$0")"

command -v git >/dev/null 2>&1 || {
  echo "git is required. Install it from https://git-scm.com and re-run."
  exit 1
}

# ---- 1. Local repo (safe to re-run) -----------------------------------
if [ ! -d .git ]; then
  git init -b main 2>/dev/null || { git init && git branch -M main; }
fi
git add -A
if ! git diff --cached --quiet; then
  git commit -m "AlphaDesk — portfolio analytics platform"
fi

# ---- 2. GitHub ---------------------------------------------------------
if command -v gh >/dev/null 2>&1; then
  if ! gh auth status >/dev/null 2>&1; then
    echo "Logging you into GitHub (a browser window will open)..."
    gh auth login
  fi
  if git remote get-url origin >/dev/null 2>&1; then
    git push -u origin main
  else
    gh repo create alphadesk --public --source=. --push
  fi
  REPO_URL=$(gh repo view --json url -q .url)
  echo ""
  echo "Pushed to: $REPO_URL"
  echo ""
  echo "Finish in ONE click — open this link, sign in with GitHub, approve:"
  echo ""
  echo "    https://render.com/deploy?repo=$REPO_URL"
  echo ""
  echo "Render reads render.yaml, builds the Dockerfile (~5 min), and gives"
  echo "you a live https://alphadesk-xxxx.onrender.com URL."
else
  echo ""
  echo "The GitHub CLI (gh) isn't installed — it's the no-tokens way to push."
  echo "Install it from https://cli.github.com and re-run this script."
  echo ""
  echo "Or do it manually: create an empty repo named 'alphadesk' at"
  echo "https://github.com/new then run:"
  echo ""
  echo "    git remote add origin https://github.com/<your-username>/alphadesk.git"
  echo "    git push -u origin main"
  echo ""
  echo "…and open:  https://render.com/deploy?repo=https://github.com/<your-username>/alphadesk"
fi
