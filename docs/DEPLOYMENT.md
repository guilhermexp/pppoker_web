# Guia de Deploy - Mid Poker

Este documento descreve o processo completo de deploy do Mid Poker na plataforma Railway.

## Arquitetura de Deploy

O Mid Poker é composto por múltiplos serviços que são deployados separadamente:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Railway Project                          │
│                         (@midpoker)                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │    Dashboard     │    │       API        │                   │
│  │  (Next.js 16)    │───▶│   (Hono/tRPC)    │                   │
│  │    Port: 3000    │    │    Port: 8080    │                   │
│  └──────────────────┘    └──────────────────┘                   │
│           │                       │                              │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────────────────────────────┐                   │
│  │              Supabase                     │                   │
│  │  (PostgreSQL + Auth + Storage)           │                   │
│  └──────────────────────────────────────────┘                   │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │      Redis       │                                           │
│  │  (Cache/Queue)   │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Serviços Railway

### Dashboard Service
- **Service ID**: `8424a1b8-ccfa-4365-bf9d-0334b4a7ce98`
- **Dockerfile**: `Dockerfile.dashboard`
- **Porta**: 3000
- **Domínio**: `midpokerdashboard-production.up.railway.app`

### API Service
- **Service ID**: `4268ed80-f61d-482c-959c-f64ffea0f816`
- **Dockerfile**: `Dockerfile.api`
- **Porta**: 8080
- **Domínio**: `midpokerapi-production.up.railway.app`

### Ambiente
- **Environment ID**: `710337af-0510-4552-a86d-361c8f2536e8`
- **Project ID**: `ea7050a3-d408-4dfc-9498-fcdb9278084e`

---

## Dockerfiles

### Dockerfile.dashboard

```dockerfile
FROM oven/bun:1.2.22

WORKDIR /app

# Build arguments for Next.js public env vars (must be available at build time)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_ID
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_URL

# Copy everything
COPY . .

# Create .env.production file for Next.js build (NEXT_PUBLIC_* vars must be available at build time)
RUN echo "NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}" > apps/dashboard/.env.production && \
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}" >> apps/dashboard/.env.production && \
    echo "NEXT_PUBLIC_SUPABASE_ID=${NEXT_PUBLIC_SUPABASE_ID}" >> apps/dashboard/.env.production && \
    echo "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" >> apps/dashboard/.env.production && \
    echo "NEXT_PUBLIC_URL=${NEXT_PUBLIC_URL}" >> apps/dashboard/.env.production

# Install dependencies
RUN bun install

# Build the dashboard
RUN bun run --filter=@midpoker/dashboard build

# Expose port
EXPOSE 3000

# Set environment
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_ENV=production

# Start the dashboard
CMD ["bun", "run", "--filter=@midpoker/dashboard", "start"]
```

### Dockerfile.api

```dockerfile
FROM oven/bun:1.2.22

WORKDIR /app

# Copy everything
COPY . .

# Install dependencies
RUN bun install

# Expose port
EXPOSE 8080

# Start the API
CMD ["bun", "run", "--filter=@midpoker/api", "dev"]
```

---

## Variáveis de Ambiente

### Dashboard Service

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase | `eyJhbGciOiJIUzI1NiIs...` |
| `NEXT_PUBLIC_SUPABASE_ID` | ID do projeto Supabase | `jaehnclfpznarbhshrly` |
| `NEXT_PUBLIC_API_URL` | URL da API | `https://midpokerapi-production.up.railway.app` |
| `NEXT_PUBLIC_URL` | URL do Dashboard | `https://midpokerdashboard-production.up.railway.app` |
| `PORT` | Porta do servidor | `3000` |
| `NODE_ENV` | Ambiente | `production` |

> **IMPORTANTE**: Variáveis `NEXT_PUBLIC_*` devem estar disponíveis no **build time** para serem embarcadas no bundle do Next.js. Por isso, elas são passadas como `ARG` no Dockerfile.

### API Service

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `DATABASE_PRIMARY_URL` | URL do PostgreSQL | `postgresql://...` |
| `SUPABASE_URL` | URL do Supabase | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | Chave de serviço do Supabase | `eyJhbGciOiJIUzI1NiIs...` |
| `REDIS_URL` | URL do Redis | `redis://...` |
| `ALLOWED_API_ORIGINS` | Origens permitidas (CORS) | `https://midpokerdashboard-production.up.railway.app` |
| `MIDDAY_DASHBOARD_URL` | URL do Dashboard | `https://midpokerdashboard-production.up.railway.app` |
| `MIDDAY_ENCRYPTION_KEY` | Chave de criptografia (32 chars) | `your-encryption-key-32-chars-long` |
| `OPENAI_API_KEY` | Chave da API OpenAI | `sk-proj-...` |
| `OPENROUTER_API_KEY` | Chave do OpenRouter | `sk-or-v1-...` |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Chave do Google AI | `AIzaSy...` |
| `INVOICE_JWT_SECRET` | Secret para JWT de invoices | `secret` |
| `PORT` | Porta do servidor | `8080` |
| `NODE_ENV` | Ambiente | `production` |
| `LOG_LEVEL` | Nível de log | `info` |

---

## Configuração Railway

### 1. Configurar Build Settings

Para cada serviço, configure nas Settings do Railway:

**Dashboard:**
- Builder: `Dockerfile`
- Dockerfile Path: `Dockerfile.dashboard`
- Watch Paths: `apps/dashboard/**`, `packages/**`

**API:**
- Builder: `Dockerfile`
- Dockerfile Path: `Dockerfile.api`
- Watch Paths: `apps/api/**`, `packages/**`

### 2. Configurar Domínios

Os domínios são gerados automaticamente pelo Railway. Para configurar o `targetPort`:

```bash
# Dashboard: targetPort deve ser 3000
# API: targetPort deve ser 8080 (ou null para usar PORT env var)
```

### 3. Configurar CORS

A variável `ALLOWED_API_ORIGINS` na API deve incluir o domínio do Dashboard:

```
ALLOWED_API_ORIGINS=https://midpokerdashboard-production.up.railway.app
```

Para múltiplas origens (dev + prod), use vírgula:

```
ALLOWED_API_ORIGINS=https://midpokerdashboard-production.up.railway.app,http://localhost:3000
```

---

## Deploy via Railway CLI

### Pré-requisitos

```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login
railway login

# Linkar projeto
cd /path/to/Mid
railway link
```

### Deploy Manual

```bash
# Deploy do Dashboard
railway up --service dashboard

# Deploy da API
railway up --service api
```

### Verificar Status

```bash
# Ver logs
railway logs --service dashboard
railway logs --service api

# Ver status
railway status
```

---

## Deploy via Railway GraphQL API

Para automação, você pode usar a API GraphQL do Railway:

### Redeploy de Serviço

```bash
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { serviceInstanceRedeploy(environmentId: \"ENV_ID\", serviceId: \"SERVICE_ID\") }"
  }'
```

### Atualizar Variável de Ambiente

```bash
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { variableUpsert(input: { projectId: \"PROJECT_ID\", environmentId: \"ENV_ID\", serviceId: \"SERVICE_ID\", name: \"VAR_NAME\", value: \"VAR_VALUE\" }) }"
  }'
```

### Verificar Status do Deploy

```bash
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { service(id: \"SERVICE_ID\") { deployments(first: 1) { edges { node { id status } } } } }"
  }'
```

---

## Troubleshooting

### Erro 502 "Application failed to respond"

**Causa**: O `targetPort` do domínio não corresponde à porta em que a aplicação está escutando.

**Solução**:
1. Verifique a porta configurada no Dockerfile (`EXPOSE`)
2. Verifique a variável `PORT` no serviço
3. Atualize o `targetPort` do domínio via Railway GraphQL API ou UI

### Erro CORS "No Access-Control-Allow-Origin header"

**Causa**: A variável `ALLOWED_API_ORIGINS` na API não inclui o domínio do Dashboard.

**Solução**:
1. Atualize `ALLOWED_API_ORIGINS` com o domínio correto do Dashboard
2. Redeploy a API

```bash
# Verificar CORS com curl
curl -sI -X OPTIONS "https://midpokerapi-production.up.railway.app/trpc/team.current" \
  -H "Origin: https://midpokerdashboard-production.up.railway.app" \
  -H "Access-Control-Request-Method: GET"
```

Se o header `Access-Control-Allow-Origin` estiver presente, CORS está funcionando.

### Erro Supabase "URL and API key required"

**Causa**: Variáveis `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` não estão disponíveis no build time.

**Solução**:
1. Configure as variáveis como `ARG` no Dockerfile
2. Crie o arquivo `.env.production` durante o build (já implementado no Dockerfile.dashboard)
3. Certifique-se que as variáveis estão configuradas no Railway como "Build Args"

### Build Lento ou Falho

**Causa**: Cache do Docker não está sendo aproveitado.

**Solução**:
1. Ordene as instruções no Dockerfile do menos mutável para o mais mutável
2. Use multi-stage builds se necessário
3. Considere usar `.dockerignore` para excluir arquivos desnecessários

---

## Health Checks

### API Health Endpoints

```bash
# Health básico
curl https://midpokerapi-production.up.railway.app/health

# Health do banco de dados
curl https://midpokerapi-production.up.railway.app/health/db

# Health dos connection pools
curl https://midpokerapi-production.up.railway.app/health/pools
```

### Dashboard

O Dashboard do Next.js não possui health check endpoint por padrão. Basta verificar se a página carrega:

```bash
curl -sI https://midpokerdashboard-production.up.railway.app/ | head -5
```

---

## Rollback

Para fazer rollback para um deploy anterior:

1. Acesse o Railway Dashboard
2. Vá para o serviço desejado
3. Na aba "Deployments", encontre o deploy anterior
4. Clique em "Redeploy" no deploy desejado

Ou via API:

```bash
# Listar deployments
curl -s "https://backboard.railway.app/graphql/v2" \
  -H "Authorization: Bearer $RAILWAY_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "query { service(id: \"SERVICE_ID\") { deployments(first: 10) { edges { node { id status createdAt } } } } }"
  }'
```

---

## Checklist de Deploy

Antes de fazer deploy em produção:

- [ ] Todas as variáveis de ambiente estão configuradas
- [ ] `ALLOWED_API_ORIGINS` inclui o domínio do Dashboard
- [ ] `NEXT_PUBLIC_*` estão configuradas como Build Args
- [ ] Testes locais passaram
- [ ] Build local funciona (`bun run build`)
- [ ] Migrations do banco estão aplicadas
- [ ] Redis está acessível

Após o deploy:

- [ ] Health check da API retorna `200 OK`
- [ ] Dashboard carrega sem erros no console
- [ ] CORS está funcionando (teste preflight)
- [ ] Login/Auth funciona
- [ ] Operações principais funcionam

---

## Referências

- [Railway Docs](https://docs.railway.app/)
- [Railway GraphQL API](https://docs.railway.app/reference/graphql-api)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Hono CORS](https://hono.dev/middleware/builtin/cors)
