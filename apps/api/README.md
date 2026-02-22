# API Mid Poker

Backend do Mid Poker construído com Hono e tRPC.

## Stack

- **Runtime**: Bun
- **Framework**: Hono
- **RPC**: tRPC
- **Database**: PostgreSQL (Drizzle ORM)
- **Cache**: Redis (Upstash)
- **AI**: OpenAI, Mistral, Google Gemini

## Variáveis de Ambiente

### Database
```bash
DATABASE_SESSION_POOLER=postgresql://...
DATABASE_URL=postgresql://...
```

### Redis (Cache)
```bash
# Local (Docker):
REDIS_URL=redis://localhost:6379

# Produção (Upstash):
REDIS_URL=rediss://:password@host:6379
```

### Supabase
```bash
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### IA (Opcional)
```bash
OPENAI_API_KEY=sk-...
MISTRAL_API_KEY=...
GOOGLE_GENERATIVE_AI_API_KEY=...
```

## Desenvolvimento Local

### 1. Inicie o Redis com Docker
```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

### 2. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

### 3. Inicie o servidor
```bash
bun dev
```

O servidor estará disponível em `http://localhost:8080`.

## Estrutura

```
src/
├── ai/              # Agentes e ferramentas de IA
│   ├── agents/      # Definição dos agentes
│   └── tools/       # Ferramentas disponíveis
├── rest/            # Rotas REST (Hono)
│   └── routers/     # Definição das rotas
├── trpc/            # Rotas tRPC
│   ├── middleware/  # Middlewares (auth, permissions)
│   └── routers/     # Definição dos routers
├── schemas/         # Schemas Zod (validação)
└── utils/           # Utilitários
```

## Cache

O sistema usa Redis para cache distribuído:

| Cache | TTL | Descrição |
|-------|-----|-----------|
| `apiKeyCache` | 30 min | Cache de API keys |
| `userCache` | 30 min | Cache de dados do usuário |
| `teamCache` | 30 min | Cache de permissões de team |
| `replicationCache` | 10 sec | Consistência read-after-write |

## Produção

```bash
bun start
```

## Integração Nanobot (Refatoração do Agente)

Documentação técnica completa (arquitetura, endpoints, Trigger.dev, debug e manutenção):

- `docs/nanobot-integration.md`

## Endpoints Principais

- `GET /health` - Status da API
- `POST /trpc/*` - Endpoints tRPC
- `POST /rest/*` - Endpoints REST
- `POST /v1/*` - API pública v1
