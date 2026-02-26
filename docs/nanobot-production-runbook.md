# Runbook de Produção: Nanobot + Trigger.dev (Mid Poker)

Este runbook é operacional. O objetivo é permitir que qualquer pessoa da equipe faça:
- deploy
- validação pós-deploy
- rollback
- triagem de incidentes

Sem depender de contexto implícito.

Para arquitetura e detalhes técnicos completos:
- `docs/nanobot-integration.md`

## Escopo

Cobertura deste runbook:
- API (`apps/api`)
- Worker de jobs (`packages/jobs` / Trigger.dev)
- Runtime Nanobot (serviço externo/sidecar)
- Redis (registry de orquestração)
- Configuração por time no dashboard

Não cobre:
- deploy da UI em detalhes de infra (somente validações funcionais relacionadas ao agente)

## Serviços Envolvidos (Produção)

### 1. API (`apps/api`)
Responsabilidades:
- `POST /chat`
- adapter de stream Nanobot
- gateway `/nanobot/*`
- callbacks internos de orquestração (`/nanobot/orchestration/*/dispatch`)

### 2. Worker Trigger.dev (`packages/jobs`)
Responsabilidades:
- processar tasks de cron/subagente do Nanobot
- acionar callbacks internos na API
- retries/filas/concurrency

### 3. Runtime Nanobot
Responsabilidades:
- executar o engine do agente
- processar prompt/tool calls
- responder `POST /chat` (stream/JSON)

### 4. Redis
Responsabilidades:
- registry de cron/subagentes:
  - `nanobot:orchestration:cron:*`
  - `nanobot:orchestration:subagent:*`

## Pré-requisitos de Deploy

### Variáveis obrigatórias (API)
```bash
NANOBOT_BASE_URL=https://<nanobot-runtime>
NANOBOT_CHAT_PATH=/api/chat
NANOBOT_API_KEY=<opcional-ou-global>

NANOBOT_ORCHESTRATION_CALLBACK_URL=https://<api-publica>
NANOBOT_ORCHESTRATION_INTERNAL_TOKEN=<segredo-forte>

REDIS_URL=redis://...  # ou rediss://...
```

### Variáveis obrigatórias (Worker Trigger.dev / `packages/jobs`)
```bash
TRIGGER_PROJECT_ID=...
TRIGGER_SECRET_KEY=...

NANOBOT_ORCHESTRATION_CALLBACK_URL=https://<api-publica>
NANOBOT_ORCHESTRATION_INTERNAL_TOKEN=<mesmo token da API>
```

### Variáveis recomendadas (Runtime Nanobot)
- provider/model/api keys suportadas pelo runtime
- acesso à rede para integrações (se canais/gateways forem usados)

## Checklist de Deploy (Ordem Recomendada)

### Fase 1. Preparar infra/segredos
1. Validar `REDIS_URL`.
2. Definir `NANOBOT_ORCHESTRATION_INTERNAL_TOKEN`.
3. Definir `NANOBOT_ORCHESTRATION_CALLBACK_URL` com URL pública da API.
4. Definir `NANOBOT_BASE_URL` e `NANOBOT_CHAT_PATH`.

### Fase 2. Deploy API
1. Deploy da API com novas envs.
2. Validar `/health` e `/nanobot/health`.
3. Confirmar que `GET /nanobot/tools` lista `cron` e `spawn`.

### Fase 3. Deploy Worker Trigger.dev
1. Deploy/restart do worker `packages/jobs`.
2. Confirmar que tasks do Nanobot foram descobertos:
   - `nanobot-cron-dispatch`
   - `nanobot-cron-once-dispatch`
   - `nanobot-subagent-run`
3. Validar conexão do worker com a API (callback URL acessível).

### Fase 4. Validar runtime Nanobot
1. Healthcheck/endpoint do runtime responde.
2. `POST` ao endpoint de chat do runtime funciona.
3. Se usar auth, validar `NANOBOT_API_KEY`.

### Fase 5. Habilitar time piloto
1. Em `Settings > Nanobot`, preencher `baseUrl`/`chatPath`/modelo (se por time).
2. Habilitar Nanobot no time.
3. Testar chat do time piloto.

### Fase 6. Cutover controlado
1. Confirmar `NANOBOT_BASE_URL` e `NANOBOT_CHAT_PATH` no ambiente.
2. Reiniciar API/runtime Nanobot (se necessário).
3. Monitorar logs e erros nas primeiras horas.

## Validação Pós-Deploy (Smoke Tests)

### 1. Health da integração
```bash
curl -sS https://<api>/nanobot/health \
  -H "Authorization: Bearer <api-token>" | jq
```

Conferir:
- `engine = nanobot`
- `nanobot.configured = true`
- `nanobot.orchestration.hasInternalToken = true`
- `tools.total` inclui as tools de orquestração esperadas (`cron` e `spawn`)

### 2. Manifesto de tools
```bash
curl -sS https://<api>/nanobot/tools \
  -H "Authorization: Bearer <api-token>" | jq '.tools[].name'
```

Confirmar presença de:
- `cron`
- `spawn`

### 3. Chat (UX preservada)
Testar no dashboard:
1. enviar mensagem simples
2. acionar tool legada (canvas/artifact)
3. validar status visual (`agent-status`)
4. validar comandos de barra (`/`) e `Nova sessão Nanobot`

### 4. Tool `cron` (produção)
```bash
curl -sS -X POST https://<api>/nanobot/tools/invoke \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "cron",
    "chatId": "ops-smoke",
    "input": {
      "action": "add",
      "message": "smoke cron nanobot",
      "cron_expr": "*/10 * * * *",
      "tz": "UTC"
    }
  }' | jq
```

Depois:
- `list` para confirmar registro
- remover o job criado (cleanup)

### 5. Tool `spawn` (produção)
```bash
curl -sS -X POST https://<api>/nanobot/tools/invoke \
  -H "Authorization: Bearer <api-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "spawn",
    "chatId": "ops-smoke",
    "input": {
      "task": "Escreva um resumo curto de verificação operacional",
      "label": "ops-smoke"
    }
  }' | jq
```

Depois:
- consultar `GET /nanobot/orchestration/subagent/:taskId`
- confirmar transição `queued -> running -> completed` (ou erro rastreável)

## Operação Diária (Monitoramento)

### Sinais para acompanhar
- taxa de erro no `/chat`
- latência do `/chat`
- falhas em `/nanobot/orchestration/*/dispatch`
- jobs do Trigger.dev com retries excessivos
- backlog/queue de `nanobot-subagent-run`
- erros de conexão com runtime Nanobot
- erros Redis no registry de orquestração

### Alertas recomendados
1. `GET /nanobot/health` falhando
2. callbacks internos retornando `401` ou `5xx`
3. runtime Nanobot indisponível
4. Trigger worker desconectado/parado
5. Redis indisponível

## Rollback (Procedimento Seguro)

### Rollback operacional (nanobot-only)
1. Desabilitar o time piloto em `Settings > Nanobot` (se a falha for por configuração de time).
2. Corrigir indisponibilidade do runtime (`NANOBOT_BASE_URL`, rede, auth, health).
3. Reiniciar API/runtime e validar `/chat`.

### Rollback de jobs (se necessário)
1. pausar/derrubar worker Trigger.dev temporariamente
2. remover schedulers Nanobot específicos
3. reabilitar jobs apenas após validar health do runtime

Observação:
- não apagar chaves Redis do registry antes de coletar evidências (ajuda no debug)

## Incidentes Comuns e Resposta

### Incidente A: `/chat` falha para todos
Checklist:
1. `GET /nanobot/health`
2. runtime Nanobot responde?
3. logs API mostram timeout/401?
4. se impacto alto: desabilitar time afetado / corrigir runtime antes de reabrir

### Incidente B: `cron` cria mas não executa
Checklist:
1. worker Trigger.dev ativo?
2. task `nanobot-cron-dispatch` descoberto?
3. callback URL correto?
4. callback interno retornando `401` (token diferente)?
5. runtime Nanobot acessível pela API?

### Incidente C: `spawn` fica preso em `queued`
Checklist:
1. worker Trigger.dev rodando
2. fila/concurrency do `nanobot-subagent-run`
3. execução do task no Trigger
4. callback interno `subagent/dispatch`
5. runtime Nanobot aceitando dispatch

### Incidente D: `spawn` vai para `failed`
Checklist:
1. erro salvo no registry (`lastError`)
2. logs API no endpoint `/nanobot/orchestration/subagent/dispatch`
3. resposta do runtime Nanobot (status/body)
4. auth/URL do runtime

### Incidente E: `cron`/`spawn` somem do manifesto
Checklist:
1. versão da API implantada (confirmar commit/release)
2. `GET /nanobot/tools`
3. rota `apps/api/src/rest/routers/nanobot.ts` carregada
4. restart da API

## Debug Profundo (Quando Precisar)

### 1. Inspecionar registry no Redis
Exemplos de chaves:
- `nanobot:orchestration:cron:index:<teamId>`
- `nanobot:orchestration:cron:<teamId>:<jobId>`
- `nanobot:orchestration:subagent:index:<teamId>`
- `nanobot:orchestration:subagent:<teamId>:<taskId>`

### 2. Verificar callbacks manualmente
Teste interno (com token):
```bash
curl -X POST https://<api>/nanobot/orchestration/cron/dispatch \
  -H "Authorization: Bearer <NANOBOT_ORCHESTRATION_INTERNAL_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"teamId":"<teamId>","jobId":"<jobId>"}'
```

### 3. Verificar status de subagente
```bash
curl -sS https://<api>/nanobot/orchestration/subagent/<taskId> \
  -H "Authorization: Bearer <api-token>" | jq
```

## Segurança Operacional

### Segredos
- `NANOBOT_ORCHESTRATION_INTERNAL_TOKEN` deve ser forte e rotacionável
- `NANOBOT_API_KEY` não deve aparecer em logs
- credenciais de gateways (WhatsApp/Telegram/Slack) devem ser tratadas como segredo

### Logs
Evitar logar:
- tokens
- payloads sensíveis de integrações
- mensagens com dados pessoais sem necessidade

## Checklist de Handover (para outro dev/squad)

Antes de passar a operação para outra pessoa, confirmar:
1. Ela sabe onde está a doc técnica: `docs/nanobot-integration.md`
2. Ela sabe onde está este runbook: `docs/nanobot-production-runbook.md`
3. Ela consegue rodar os smoke tests (`/health`, `/tools`, `cron`, `spawn`)
4. Ela sabe executar rollback operacional (nanobot-only)
5. Ela sabe validar Trigger worker + runtime Nanobot + Redis

## Referências de Código

### API
- `apps/api/src/rest/routers/chat.ts`
- `apps/api/src/rest/routers/nanobot.ts`
- `apps/api/src/ai/runtime/nanobot.ts`
- `apps/api/src/ai/runtime/nanobot-orchestration.ts`

### Jobs / Trigger.dev
- `packages/jobs/src/tasks/nanobot/cron-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/cron-once-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/subagent-run.ts`

### Settings / UI
- `apps/dashboard/src/components/nanobot-settings-panel.tsx`
