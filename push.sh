#!/bin/bash
set -e
REPO="$HOME/Documents/Claude/str-analyzer-app"
TOKEN=$(cat "$HOME/Documents/Claude/.github_token" 2>/dev/null || cat "$HOME/Claude/.github_token" 2>/dev/null)
git -C "$REPO" remote set-url origin "https://${TOKEN}@github.com/YukonCamino/str-analyzer-app.git"
git -C "$REPO" add -A
git -C "$REPO" commit -m "Update STR Analyzer app - $(date '+%Y-%m-%d')" || echo "Nothing to commit"
git -C "$REPO" push
echo "Done — Vercel is deploying now"
