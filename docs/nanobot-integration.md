# Integração Nanobot no Mid Poker (Arquitetura, Operação e Debug)

Este documento descreve a integração do `nanobot` no projeto `pppoker_web` como uma **refatoração de backend**, preservando a UX/UI existente do chat.

Objetivo:
- manter o frontend e o visual das mensagens
- manter o contrato de `POST /chat` e streaming atual
- trocar o engine/orquestrador de IA para `nanobot`
- reaproveitar `Trigger.dev` para cron, tarefas assíncronas, retries e filas

## Resumo da Arquitetura

### O que permanece igual (UX/UI)
- `POST /chat` continua sendo o ponto de entrada do chat
- frontend continua consumindo stream no formato compatível com AI SDK/UI Message
- componentes de mensagens, canvas/artifacts e status continuam iguais
- slash commands continuam no mesmo menu

### O que mudou (backend do agente)
- o backend do chat passou a suportar engine `nanobot` via adapter
- foi criado um gateway `/nanobot/*` para tools e orquestração
- `cron` e `spawn` do Nanobot agora podem ser executados via `Trigger.dev`
- settings do Nanobot por time foram adicionadas (modelo, soul, memória, skills, automações, gateways)

## Componentes da Integração

### 1. Chat Engine Dispatcher (API)
Responsável por escolher o engine (`legacy` ou `nanobot`) com fallback.

Arquivos:
- `apps/api/src/rest/routers/chat.ts`
- `apps/api/src/ai/runtime/chat-engine.ts`
- `apps/api/src/ai/runtime/nanobot.ts`

### 2. Adapter do Nanobot (compatibilidade de stream)
Converte respostas do runtime Nanobot para o contrato atual da UI.

Compatibilidades preservadas:
- `text`
- `source-url`
- `data-agent-status`
- `data-suggestions`

Arquivo:
- `apps/api/src/ai/runtime/nanobot.ts`

### 3. Gateway de Tools Legadas
Expõe as tools atuais para o Nanobot sem quebrar UX/canvas.

Endpoints:
- `GET /nanobot/tools`
- `POST /nanobot/tools/invoke`

Arquivos:
- `apps/api/src/rest/routers/nanobot.ts`
- `apps/api/src/ai/runtime/legacy-tool-gateway.ts`
- `apps/api/src/ai/tools/registry.ts`

### 4. Orquestração Nanobot com Trigger.dev (cron + subagentes)
Responsável por:
- `cron add/list/remove`
- `spawn` (tarefas em background)
- registry em Redis (listar/remover/debug)
- dispatch via callbacks internos

Arquivos:
- `apps/api/src/ai/runtime/nanobot-orchestration.ts`
- `apps/api/src/rest/routers/nanobot.ts`
- `packages/jobs/src/tasks/nanobot/cron-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/cron-once-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/subagent-run.ts`

## Fluxos Principais

### Fluxo 1: Chat síncrono (`POST /chat`)
1. Frontend envia request para `POST /chat`
2. API monta contexto do usuário/time
3. Dispatcher escolhe `legacy` ou `nanobot`
4. Adapter Nanobot chama runtime externo (`NANOBOT_BASE_URL + NANOBOT_CHAT_PATH`)
5. Adapter converte stream para formato esperado pela UI
6. Frontend renderiza igual ao fluxo antigo

Observação:
- fallback para agente legado pode ser ligado por env e por config

### Fluxo 2: Tool `cron` via Nanobot -> Trigger.dev
1. Nanobot chama `cron(...)` via `/nanobot/tools/invoke`
2. API intercepta `toolName="cron"` e não envia para o gateway legado
3. `nanobot-orchestration.ts` cria registro no Redis
4. Para recorrente:
   - cria `schedules.create(...)` no Trigger.dev (`nanobot-cron-dispatch`)
5. Para one-shot (`at`):
   - cria `tasks.trigger(..., { delay })` (`nanobot-cron-once-dispatch`)
6. Task do Trigger chama callback interno:
   - `POST /nanobot/orchestration/cron/dispatch`
7. API dispara o runtime Nanobot com a mensagem do job e atualiza status no Redis

### Fluxo 3: Tool `spawn` (subagente em background) via Trigger.dev
1. Nanobot chama `spawn(...)` via `/nanobot/tools/invoke`
2. API intercepta `toolName="spawn"`
3. API cria registro da tarefa no Redis (status `queued`)
4. API dispara `tasks.trigger("nanobot-subagent-run", ...)`
5. Task do Trigger chama callback interno:
   - `POST /nanobot/orchestration/subagent/dispatch`
6. API chama runtime Nanobot em modo background (`runtime.mode="subagent"`)
7. API atualiza status/resultados no Redis

## Endpoints da Integração Nanobot

Todos estes endpoints estão em:
- `apps/api/src/rest/routers/nanobot.ts`

### Gateway/Tools
- `GET /nanobot/health`
  - status da integração
  - engine atual
  - info de fallback
  - info de orquestração Trigger.dev
- `GET /nanobot/tools`
  - manifesto de tools (inclui `cron`, `spawn` e tools legadas)
- `POST /nanobot/tools/invoke`
  - executa:
    - tools legadas (via `legacy-tool-gateway`)
    - `cron` (via Trigger.dev + Redis)
    - `spawn` (via Trigger.dev + Redis)

### Orquestração (uso explícito)
- `POST /nanobot/orchestration/cron`
  - ações `add`, `list`, `remove`
- `POST /nanobot/orchestration/spawn`
  - enfileira tarefa background
- `GET /nanobot/orchestration/subagent/:taskId`
  - consulta status de subagente

### Callbacks internos (Trigger.dev -> API)
- `POST /nanobot/orchestration/cron/dispatch`
- `POST /nanobot/orchestration/subagent/dispatch`

Importante:
- estes callbacks exigem `Authorization: Bearer <NANOBOT_ORCHESTRATION_INTERNAL_TOKEN>`

## Configuração por Time (Settings > Nanobot)

A configuração é salva em:
- `teams.export_settings.nanobot`

Schema backend:
- `apps/api/src/schemas/nanobot.ts`

Router tRPC:
- `apps/api/src/trpc/routers/nanobot.ts`

Tela frontend:
- `apps/dashboard/src/components/nanobot-settings-panel.tsx`

### Seções expostas na UI
- Runtime (enabled, fallback, baseUrl, chatPath, apiKey)
- Configurações de Modelo
- Soul (alma do agente)
- Agent CMD / Instruções Persistentes
- Memória Persistente
- Skills do Nanobot
- Automações / Chrome / Tarefas Agendadas
- Gateways (WhatsApp, Telegram, Slack)
- Tools Legadas (manifesto)

## Variáveis de Ambiente (Operação)

### Engine do chat
```bash
CHAT_AGENT_ENGINE=nanobot
NANOBOT_FALLBACK_TO_LEGACY=true
```

### Runtime Nanobot (fallback/global)
```bash
NANOBOT_BASE_URL=http://localhost:18790
NANOBOT_CHAT_PATH=/api/chat
NANOBOT_API_KEY=
```

Observação:
- `baseUrl`, `chatPath` e `apiKey` também podem ser configurados por time (settings)

### Orquestração Trigger.dev (Nanobot)
```bash
NANOBOT_ORCHESTRATION_CALLBACK_URL=http://localhost:8080
NANOBOT_ORCHESTRATION_INTERNAL_TOKEN=troque-isto
```

### Trigger.dev (worker/jobs)
Configure também as envs do Trigger.dev do projeto (`TRIGGER_PROJECT_ID`, chaves etc.).

## Redis (Registry da Orquestração)

O registry de cron/subagentes usa Redis compartilhado.

Prefixos de chave:
- `nanobot:orchestration:cron:*`
- `nanobot:orchestration:subagent:*`

Usado para:
- listagem de jobs/tarefas
- status (`active`, `queued`, `running`, `completed`, etc.)
- ids do Trigger (`scheduleId`, `runId`)
- timestamps/erros

## Contrato de Tools `cron` e `spawn` (Gateway Nanobot)

### Tool `cron`
Formato compatível com o Nanobot:
- `action`: `add | list | remove`
- `message` (para `add`)
- `every_seconds` (recorrência simples)
- `cron_expr` + `tz`
- `at` (one-shot ISO datetime)
- `job_id` (remove)

Limitação atual:
- `every_seconds` suportado apenas em múltiplos de 60 (integração usa cron/minuto do Trigger.dev)
- para granularidade fina, usar `cron_expr`

### Tool `spawn`
Formato:
- `task` (obrigatório)
- `label` (opcional)

Resultado:
- cria tarefa em background no Trigger.dev
- retorna `taskId` + status inicial

## Como Subir Localmente (integração completa)

### API + Dashboard
Use o fluxo normal do projeto (`bun dev` no root) ou individualmente.

### Worker Trigger.dev (jobs)
Em outra sessão:
```bash
cd packages/jobs
bun run dev
```

### Runtime Nanobot
Suba o runtime/gateway do Nanobot e configure:
- `NANOBOT_BASE_URL`
- `NANOBOT_CHAT_PATH`

## Debug e Troubleshooting

### 1. Verificar saúde da integração
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/nanobot/health
```

Conferir:
- `engine`
- `nanobot.configured`
- `nanobot.orchestration.callbackUrl`
- `nanobot.orchestration.hasInternalToken`

### 2. Listar manifesto de tools (inclui cron/spawn)
```bash
curl -H "Authorization: Bearer <token>" http://localhost:8080/nanobot/tools
```

Se `cron` e `spawn` não aparecerem:
- checar `apps/api/src/rest/routers/nanobot.ts`
- checar se a API foi reiniciada

### 3. Testar `cron` diretamente
```bash
curl -X POST http://localhost:8080/nanobot/tools/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "cron",
    "chatId": "debug-chat",
    "input": {
      "action": "add",
      "message": "Teste cron Nanobot",
      "cron_expr": "*/5 * * * *",
      "tz": "UTC"
    }
  }'
```

### 4. Testar `spawn` diretamente
```bash
curl -X POST http://localhost:8080/nanobot/tools/invoke \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "toolName": "spawn",
    "chatId": "debug-chat",
    "input": {
      "task": "Resuma os top 5 alerts da semana e prepare um plano de ação",
      "label": "resumo-alertas"
    }
  }'
```

### 5. Callback Trigger falhando (`401 Unauthorized`)
Verifique:
- `NANOBOT_ORCHESTRATION_INTERNAL_TOKEN` no worker `packages/jobs`
- `NANOBOT_ORCHESTRATION_INTERNAL_TOKEN` na API
- ambos precisam ser iguais

### 6. Job criado mas não executa
Checklist:
- worker Trigger.dev (`packages/jobs`) rodando
- task foi descoberto pelo worker
- `NANOBOT_ORCHESTRATION_CALLBACK_URL` aponta para a API correta
- API acessível a partir do worker

### 7. Dispatch executa mas Nanobot não responde
Checklist:
- `NANOBOT_BASE_URL` e `NANOBOT_CHAT_PATH` corretos
- runtime Nanobot ativo
- `apiKey` (global ou por time) correto
- `POST /chat` do runtime Nanobot aceitando payload esperado

### 8. `every_seconds` rejeitado
Esperado se não for múltiplo de 60. Use `cron_expr`.

## Como Melhorar / Evoluir (Roadmap técnico)

### Curto prazo
- materializar config do Nanobot por time em workspace/arquivos (`SOUL.md`, `AGENTS.md`, `MEMORY.md`) no runtime
- fazer o runtime Nanobot usar automaticamente `/nanobot/tools` (cron/spawn + legado)
- emitir `data-nanobot-skills` e `data-nanobot-commands` no stream do runtime

### Médio prazo
- mapear artifacts/canvas completos do Nanobot para o contrato visual atual
- status detalhado de subagentes/cron no stream (`agent-status`)
- retry/cancel/inspect de subagente via UI

### Longo prazo
- mover segredos da config por time para storage seguro (não `export_settings`)
- observabilidade unificada (Nanobot runtime + Trigger.dev + UI devtools)
- testes de contrato do stream (snapshots)

## Arquivos-Chave (Mapa Rápido)

### API / Chat Engine
- `apps/api/src/rest/routers/chat.ts`
- `apps/api/src/ai/runtime/chat-engine.ts`
- `apps/api/src/ai/runtime/nanobot.ts`

### Nanobot Settings / Config
- `apps/api/src/schemas/nanobot.ts`
- `apps/api/src/trpc/routers/nanobot.ts`
- `apps/dashboard/src/components/nanobot-settings-panel.tsx`

### Tools + Orquestração
- `apps/api/src/rest/routers/nanobot.ts`
- `apps/api/src/ai/runtime/legacy-tool-gateway.ts`
- `apps/api/src/ai/runtime/nanobot-orchestration.ts`

### Trigger.dev Tasks (Nanobot)
- `packages/jobs/src/tasks/nanobot/cron-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/cron-once-dispatch.ts`
- `packages/jobs/src/tasks/nanobot/subagent-run.ts`

## Notas Importantes de Manutenção

- A integração foi desenhada para **preservar UX/UI**. Alterações no backend devem manter:
  - contrato de `/chat`
  - formato de stream consumido pelo frontend
  - nomes de tools e payloads importantes
- `cron` e `spawn` agora são ferramentas “híbridas”:
  - expostas no gateway Nanobot
  - executadas por `Trigger.dev`
  - rastreadas em Redis
- Se algo quebrar, debugue sempre nesta ordem:
  1. API (`/nanobot/health`)
  2. worker Trigger.dev
  3. runtime Nanobot
  4. Redis registry
  5. frontend/stream
