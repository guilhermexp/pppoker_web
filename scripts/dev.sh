#!/usr/bin/env bash
set -e

# Colors
GREEN=$'\033[0;32m'
YELLOW=$'\033[0;33m'
BLUE=$'\033[0;34m'
RED=$'\033[0;31m'
BOLD=$'\033[1m'
RESET=$'\033[0m'

header() { printf "\n${BOLD}${BLUE}[%s]${RESET} %s\n" "$1" "$2"; }
ok()     { printf "  ${GREEN}✓${RESET} %s\n" "$1"; }
warn()   { printf "  ${YELLOW}!${RESET} %s\n" "$1"; }
fail()   { printf "  ${RED}✗${RESET} %s\n" "$1"; }

printf "${BOLD}━━━ Mid Poker Dev ━━━${RESET}\n"

# --- Kill stale ports ---
header "cleanup" "Liberando portas..."
for port in 3100 3101 3102 18790; do
  pid=$(lsof -i :$port -t 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill $pid 2>/dev/null && ok "Porta $port liberada (PID $pid)"
  fi
done
sleep 1

# --- Redis ---
header "redis" "Iniciando na porta 6380..."
if docker compose up -d redis 2>/dev/null; then
  ok "Redis via Docker"
elif redis-server --port 6380 --daemonize yes 2>/dev/null; then
  warn "Redis local (Docker indisponivel)"
else
  fail "Redis nao disponivel (Docker ou local)"
fi

# --- PPPoker Bridge ---
header "bridge" "PPPoker bridge na porta 3102..."
if [ -d ./Ppfichas ]; then
  (cd ./Ppfichas && python3 -m uvicorn pppoker_api_server:app --host 0.0.0.0 --port 3102 2>&1) &
  ok "Bridge: ./Ppfichas"
elif [ -d /Users/macosx/Ppfichas ]; then
  (cd /Users/macosx/Ppfichas && python3 -m uvicorn pppoker_api_server:app --host 0.0.0.0 --port 3102 2>&1) &
  ok "Bridge: /Users/macosx/Ppfichas"
else
  warn "Bridge nao encontrado. Continuando sem bridge."
fi

# --- Turbo dev ---
header "apps" "Iniciando dashboard + api + nanobot...\n"

exec turbo dev \
  --filter=@midpoker/dashboard \
  --filter=@midpoker/api \
  --filter=@midpoker/nanobot \
  --parallel
