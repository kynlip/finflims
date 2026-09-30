#!/bin/bash
# ==============================================================================
# Auto Crawl Hoạt Hình - KKPhim Cronjob Script for VPS
# ==============================================================================
set -uo pipefail
export TZ="Asia/Ho_Chi_Minh"

APP_URL="${APP_URL:-http://localhost:3000}"
API_KEY="${CRON_API_KEY:-Anime2026CronVipKey}"
LOG_DIR="/var/log/hoathinh"
mkdir -p "$LOG_DIR" 2>/dev/null || true
LOG_FILE="$LOG_DIR/crawl-$(date +%Y%m%d).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "📡 [KKPhim] Starting Auto Crawl from $APP_URL..."

HTTP_CODE=$(curl -sS -o /tmp/hoathinh-crawl-result.json -w "%{http_code}" \
  --max-time 300 \
  "${APP_URL}/api/crawl/cronjob?api_key=${API_KEY}")

if [ "$HTTP_CODE" = "200" ]; then
  log "✅ Auto Crawl OK (HTTP 200). Result: $(cat /tmp/hoathinh-crawl-result.json 2>/dev/null)"
  exit 0
else
  log "❌ Auto Crawl FAILED (HTTP $HTTP_CODE). Response: $(cat /tmp/hoathinh-crawl-result.json 2>/dev/null)"
  exit 1
fi
