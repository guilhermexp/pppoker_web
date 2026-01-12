#!/bin/bash
# Script para fazer redeploy de serviços no Railway
# Uso: ./scripts/railway-redeploy.sh [dashboard|api|all]

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

# IDs (atualize conforme necessário)
PROJECT_ID="${PROJECT_ID:-ea7050a3-d408-4dfc-9498-fcdb9278084e}"
ENV_ID="${ENV_ID:-710337af-0510-4552-a86d-361c8f2536e8}"
DASHBOARD_SERVICE_ID="${DASHBOARD_SERVICE_ID:-8424a1b8-ccfa-4365-bf9d-0334b4a7ce98}"
API_SERVICE_ID="${API_SERVICE_ID:-4268ed80-f61d-482c-959c-f64ffea0f816}"

# Função para fazer redeploy
redeploy_service() {
    local service_id=$1
    local service_name=$2

    echo -e "${YELLOW}Iniciando redeploy do $service_name...${NC}"

    local result=$(curl -s "https://backboard.railway.app/graphql/v2" \
        -H "Authorization: Bearer $RAILWAY_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"query\": \"mutation { serviceInstanceRedeploy(environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$service_id\\\") }\"}")

    local success=$(echo "$result" | jq -r '.data.serviceInstanceRedeploy // false')

    if [ "$success" = "true" ]; then
        echo -e "${GREEN}$service_name: Redeploy iniciado com sucesso${NC}"
    else
        echo -e "${RED}$service_name: Falha ao iniciar redeploy${NC}"
        echo "$result" | jq .
        return 1
    fi
}

# Função para aguardar deploy
wait_for_deploy() {
    local service_id=$1
    local service_name=$2
    local max_attempts=60
    local attempt=0

    echo -e "${YELLOW}Aguardando deploy do $service_name...${NC}"

    while [ $attempt -lt $max_attempts ]; do
        local result=$(curl -s "https://backboard.railway.app/graphql/v2" \
            -H "Authorization: Bearer $RAILWAY_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"query\": \"query { service(id: \\\"$service_id\\\") { deployments(first: 1) { edges { node { status } } } } }\"}")

        local status=$(echo "$result" | jq -r '.data.service.deployments.edges[0].node.status // "UNKNOWN"')

        case $status in
            "SUCCESS")
                echo -e "${GREEN}$service_name: Deploy concluído com sucesso!${NC}"
                return 0
                ;;
            "FAILED"|"CRASHED")
                echo -e "${RED}$service_name: Deploy falhou com status: $status${NC}"
                return 1
                ;;
            "BUILDING"|"DEPLOYING")
                echo -n "."
                ;;
            *)
                echo -n "?"
                ;;
        esac

        sleep 5
        attempt=$((attempt + 1))
    done

    echo ""
    echo -e "${RED}$service_name: Timeout aguardando deploy${NC}"
    return 1
}

# Verificar argumento
service="${1:-all}"

case $service in
    "dashboard")
        redeploy_service "$DASHBOARD_SERVICE_ID" "Dashboard"
        wait_for_deploy "$DASHBOARD_SERVICE_ID" "Dashboard"
        ;;
    "api")
        redeploy_service "$API_SERVICE_ID" "API"
        wait_for_deploy "$API_SERVICE_ID" "API"
        ;;
    "all")
        redeploy_service "$DASHBOARD_SERVICE_ID" "Dashboard"
        redeploy_service "$API_SERVICE_ID" "API"
        echo ""
        echo "Aguardando deploys..."
        wait_for_deploy "$DASHBOARD_SERVICE_ID" "Dashboard"
        wait_for_deploy "$API_SERVICE_ID" "API"
        ;;
    *)
        echo "Uso: $0 [dashboard|api|all]"
        echo ""
        echo "Serviços disponíveis:"
        echo "  dashboard - Redeploy do Dashboard (Next.js)"
        echo "  api       - Redeploy da API (Hono/tRPC)"
        echo "  all       - Redeploy de todos os serviços"
        exit 1
        ;;
esac

echo ""
echo "========================================"
echo "       Deploy finalizado!               "
echo "========================================"
