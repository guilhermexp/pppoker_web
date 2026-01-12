#!/bin/bash
# Script para definir variáveis de ambiente no Railway
# Uso: ./scripts/railway-set-env.sh <service> <VAR_NAME> <VAR_VALUE>

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

# Verificar argumentos
if [ $# -lt 3 ]; then
    echo "Uso: $0 <service> <VAR_NAME> <VAR_VALUE>"
    echo ""
    echo "Serviços disponíveis:"
    echo "  dashboard - Dashboard (Next.js)"
    echo "  api       - API (Hono/tRPC)"
    echo ""
    echo "Exemplo:"
    echo "  $0 api ALLOWED_API_ORIGINS https://mydomain.com"
    exit 1
fi

service=$1
var_name=$2
var_value=$3

# Determinar service_id
case $service in
    "dashboard")
        service_id="$DASHBOARD_SERVICE_ID"
        ;;
    "api")
        service_id="$API_SERVICE_ID"
        ;;
    *)
        echo -e "${RED}Serviço desconhecido: $service${NC}"
        echo "Serviços válidos: dashboard, api"
        exit 1
        ;;
esac

echo -e "${YELLOW}Definindo $var_name no serviço $service...${NC}"

# Escapar value para JSON
escaped_value=$(echo "$var_value" | sed 's/"/\\"/g')

result=$(curl -s "https://backboard.railway.app/graphql/v2" \
    -H "Authorization: Bearer $RAILWAY_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"mutation { variableUpsert(input: { projectId: \\\"$PROJECT_ID\\\", environmentId: \\\"$ENV_ID\\\", serviceId: \\\"$service_id\\\", name: \\\"$var_name\\\", value: \\\"$escaped_value\\\" }) }\"}")

success=$(echo "$result" | jq -r '.data.variableUpsert // false')

if [ "$success" = "true" ]; then
    echo -e "${GREEN}Variável $var_name definida com sucesso!${NC}"
    echo ""
    echo -e "${YELLOW}Nota: Faça redeploy do serviço para aplicar a mudança:${NC}"
    echo "  ./scripts/railway-redeploy.sh $service"
else
    echo -e "${RED}Falha ao definir variável${NC}"
    echo "$result" | jq .
    exit 1
fi
