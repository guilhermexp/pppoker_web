#!/bin/bash
# Script para verificar status dos deploys no Railway
# Uso: ./scripts/railway-check-status.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar se RAILWAY_TOKEN está definido
if [ -z "$RAILWAY_TOKEN" ]; then
    echo -e "${RED}Erro: RAILWAY_TOKEN não está definido${NC}"
    echo "Defina a variável de ambiente RAILWAY_TOKEN com seu token do Railway"
    echo "Exemplo: export RAILWAY_TOKEN='rw_...'"
    exit 1
fi

# IDs dos serviços (atualize conforme necessário)
DASHBOARD_SERVICE_ID="${DASHBOARD_SERVICE_ID:-8424a1b8-ccfa-4365-bf9d-0334b4a7ce98}"
API_SERVICE_ID="${API_SERVICE_ID:-4268ed80-f61d-482c-959c-f64ffea0f816}"

echo "========================================"
echo "       Mid Poker - Status Railway       "
echo "========================================"
echo ""

# Função para verificar status de um serviço
check_service() {
    local service_id=$1
    local service_name=$2

    local result=$(curl -s "https://backboard.railway.app/graphql/v2" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"query { service(id: \\\"$service_id\\\") { deployments(first: 1) { edges { node { status createdAt } } } } }\"}")

    local status=$(echo "$result" | jq -r '.data.service.deployments.edges[0].node.status // "UNKNOWN"')
    local created_at=$(echo "$result" | jq -r '.data.service.deployments.edges[0].node.createdAt // "N/A"')

    echo -n "$service_name: "
    case $status in
        "SUCCESS")
            echo -e "${GREEN}$status${NC} (deployed at: $created_at)"
            ;;
        "BUILDING"|"DEPLOYING")
            echo -e "${YELLOW}$status${NC}"
            ;;
        "FAILED"|"CRASHED")
            echo -e "${RED}$status${NC}"
            ;;
        *)
            echo "$status"
            ;;
    esac
}

# Verificar Dashboard
check_service "$DASHBOARD_SERVICE_ID" "Dashboard"

# Verificar API
check_service "$API_SERVICE_ID" "API"

echo ""
echo "========================================"
echo "         Health Checks                  "
echo "========================================"
echo ""

# Health check da API
echo -n "API Health: "
api_health=$(curl -s -o /dev/null -w "%{http_code}" "https://midpokerapi-production.up.railway.app/health" 2>/dev/null || echo "000")
if [ "$api_health" = "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL (HTTP $api_health)${NC}"
fi

# Health check do Dashboard
echo -n "Dashboard: "
dashboard_health=$(curl -s -o /dev/null -w "%{http_code}" "https://midpokerdashboard-production.up.railway.app/" 2>/dev/null || echo "000")
if [ "$dashboard_health" = "200" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL (HTTP $dashboard_health)${NC}"
fi

echo ""
echo "========================================"
echo "         CORS Check                     "
echo "========================================"
echo ""

# Verificar CORS
cors_header=$(curl -sI -X OPTIONS "https://midpokerapi-production.up.railway.app/trpc/team.current" \
    -H "Origin: https://midpokerdashboard-production.up.railway.app" \
    -H "Access-Control-Request-Method: GET" 2>/dev/null | grep -i "access-control-allow-origin" || echo "")

echo -n "CORS: "
if [[ "$cors_header" == *"midpokerdashboard"* ]]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FAIL - Header não encontrado${NC}"
fi

echo ""
