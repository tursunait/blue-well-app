#!/usr/bin/env bash
# One-click demo runner for BlueWell (macOS / Linux)
# - creates minimal env files
# - initializes Prisma dev DB
# - creates Python venv for calorie estimator and installs deps
# - starts calorie-estimator (uvicorn) and Next.js web dev server in background
# Logs: scripts/logs/web.log, scripts/logs/calorie-estimator.log

set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

mkdir -p scripts/logs

echo "=== BlueWell one-click demo ==="

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found — install pnpm first: https://pnpm.io/installation"
  exit 1
fi

if [ -z "${OPENAI_API_KEY-}" ]; then
  echo "WARNING: OPENAI_API_KEY is not set. Some features will fail without it."
  echo "You can export it now or press Enter to continue without it."
  read -r
fi

# Ensure apps/web .env.local
WEB_ENV=apps/web/.env.local
if [ ! -f "$WEB_ENV" ]; then
  echo "Creating minimal $WEB_ENV"
  cat > "$WEB_ENV" <<EOF
DATABASE_URL=file:./prisma/prisma/dev.db
SKIP_AUTH=true
OPENAI_API_KEY=${OPENAI_API_KEY-}
NEXT_PUBLIC_FASTAPI_BASE_URL=http://localhost:8001
EOF
fi

echo "Installing JS deps... (this may take a minute)"
pnpm install --shamefully-hoist

echo "Initializing Prisma (dev DB)..."
cd apps/web
npx prisma db push --accept-data-loss || true
npx prisma generate || true
cd "$ROOT_DIR"

# Setup calorie estimator venv
CE_DIR=apps/calorie-estimator-api
if [ -d "$CE_DIR" ]; then
  echo "Setting up calorie estimator venv"
  cd "$CE_DIR"
  if [ ! -d venv ]; then
    python3 -m venv venv
  fi
  . venv/bin/activate
  pip install --upgrade pip >/dev/null
  pip install -r requirements.txt >/dev/null
  deactivate
  cd "$ROOT_DIR"
else
  echo "No calorie estimator app found at $CE_DIR — skipping venv setup"
fi

echo "Starting calorie estimator (uvicorn) in background..."
if [ -d "$CE_DIR" ]; then
  (cd "$CE_DIR" && . venv/bin/activate && nohup uvicorn app.main:app --app-dir . --host 0.0.0.0 --port 8001 > "$ROOT_DIR/scripts/logs/calorie-estimator.log" 2>&1 &)
  sleep 0.5
  echo "  Logs: scripts/logs/calorie-estimator.log"
fi

echo "Starting Next.js web dev server in background..."
# start web dev in background and capture PID
nohup pnpm --filter web dev > scripts/logs/web.log 2>&1 &
sleep 1
echo "  Logs: scripts/logs/web.log"

echo "Demo started."
echo " - Web: http://localhost:3000 (or another port logged in scripts/logs/web.log)"
echo " - Calorie estimator: http://localhost:8001/health"
echo "To stop: kill the background processes (see PIDs in 'ps aux | grep pnpm' and 'ps aux | grep uvicorn'), or reboot your terminal session."

exit 0
