#!/usr/bin/env bash
# Post-deploy smoke test.
# Usage:
#   ./scripts/smoke.sh                                   # uses defaults
#   API_URL=https://tertitask-api.onrender.com \
#   FRONTEND_URL=https://tertitask-web.vercel.app \
#   ./scripts/smoke.sh

set -euo pipefail

API_URL="${API_URL:-https://tertitask-api.onrender.com}"
FRONTEND_URL="${FRONTEND_URL:-https://tertitask-web.vercel.app}"

PASS=0
FAIL=0

ok()   { echo "  PASS  $1"; PASS=$((PASS+1)); }
fail() { echo "  FAIL  $1"; FAIL=$((FAIL+1)); }

check_status() {
  local label="$1" expected="$2" url="$3"
  shift 3
  local actual
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$@" "$url")
  if [ "$actual" = "$expected" ]; then
    ok "$label (HTTP $actual)"
  else
    fail "$label — expected HTTP $expected, got $actual  [$url]"
  fi
}

echo ""
echo "TertiTask smoke test"
echo "  API:      $API_URL"
echo "  Frontend: $FRONTEND_URL"
echo ""

# ── 1. Health check ───────────────────────────────────────────────────────────
label="GET /api/health/"
body=$(curl -sf "$API_URL/api/health/" 2>/dev/null || true)
code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health/")
if [ "$code" = "200" ] && echo "$body" | grep -q '"ok"'; then
  ok "$label (HTTP 200, status=ok)"
else
  fail "$label — HTTP $code, body: $body"
fi

# ── 2. Auth/sync with invalid token → 401 ────────────────────────────────────
check_status "POST /api/auth/sync/ (invalid token → 401)" "401" \
  "$API_URL/api/auth/sync/" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer this-is-not-a-real-firebase-token"

# ── 3. Categories endpoint (public) → 200 ─────────────────────────────────────
check_status "GET /api/categories/ (public → 200)" "200" \
  "$API_URL/api/categories/"

# ── 4. Vercel homepage → 200 ──────────────────────────────────────────────────
check_status "GET $FRONTEND_URL (homepage → 200)" "200" \
  "$FRONTEND_URL"

# ── 5. Vercel SPA rewrite: /browse → 200 (not 404) ───────────────────────────
check_status "GET $FRONTEND_URL/browse (SPA rewrite → 200)" "200" \
  "$FRONTEND_URL/browse"

# ── 6. Vercel SPA rewrite: /404-should-not-exist → 200 (index.html) ──────────
check_status "GET $FRONTEND_URL/definitely-404 (SPA rewrite → 200)" "200" \
  "$FRONTEND_URL/definitely-404"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "Results: $PASS passed, $FAIL failed"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
