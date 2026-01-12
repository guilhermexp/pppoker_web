# Scripts de Deploy

Scripts utilitários para gerenciar deploys no Railway.

## Pré-requisitos

1. Obtenha um token do Railway em https://railway.app/account/tokens
2. Exporte o token como variável de ambiente:

```bash
export RAILWAY_TOKEN='rw_...'
```

## Scripts Disponíveis

### railway-check-status.sh

Verifica o status dos deploys e health checks dos serviços.

```bash
./scripts/railway-check-status.sh
```

Output:
- Status do último deploy de cada serviço
- Health check da API
- Health check do Dashboard
- Verificação de CORS

### railway-redeploy.sh

Faz redeploy de um ou mais serviços.

```bash
# Redeploy do Dashboard
./scripts/railway-redeploy.sh dashboard

# Redeploy da API
./scripts/railway-redeploy.sh api

# Redeploy de todos os serviços
./scripts/railway-redeploy.sh all
```

### railway-set-env.sh

Define uma variável de ambiente em um serviço.

```bash
# Sintaxe
./scripts/railway-set-env.sh <service> <VAR_NAME> <VAR_VALUE>

# Exemplos
./scripts/railway-set-env.sh api ALLOWED_API_ORIGINS https://mydomain.com
./scripts/railway-set-env.sh api LOG_LEVEL debug
./scripts/railway-set-env.sh dashboard NEXT_PUBLIC_API_URL https://api.mydomain.com
```

> **Nota**: Após definir uma variável, é necessário fazer redeploy do serviço.

## Configuração dos IDs

Os scripts usam os seguintes IDs por padrão:

| Variável | Valor Padrão | Descrição |
|----------|--------------|-----------|
| `PROJECT_ID` | `ea7050a3-d408-4dfc-9498-fcdb9278084e` | ID do projeto Railway |
| `ENV_ID` | `710337af-0510-4552-a86d-361c8f2536e8` | ID do ambiente (production) |
| `DASHBOARD_SERVICE_ID` | `8424a1b8-ccfa-4365-bf9d-0334b4a7ce98` | ID do serviço Dashboard |
| `API_SERVICE_ID` | `4268ed80-f61d-482c-959c-f64ffea0f816` | ID do serviço API |

Para sobrescrever, exporte as variáveis antes de executar os scripts:

```bash
export PROJECT_ID="outro-project-id"
export ENV_ID="outro-env-id"
./scripts/railway-check-status.sh
```

## Troubleshooting

### "RAILWAY_TOKEN não está definido"

Certifique-se de exportar o token:

```bash
export RAILWAY_TOKEN='rw_...'
```

### "curl: command not found"

Instale o curl:

```bash
# macOS
brew install curl

# Ubuntu/Debian
sudo apt-get install curl
```

### "jq: command not found"

Instale o jq:

```bash
# macOS
brew install jq

# Ubuntu/Debian
sudo apt-get install jq
```
