# Guia de Desenvolvimento - Mid Poker

> Este documento serve como contexto para agentes de IA e desenvolvedores entenderem rapidamente onde e como fazer modificacoes no sistema.

---

## Regra de Ouro

**Antes de modificar qualquer coisa, entenda o fluxo completo:**
```
Frontend (dashboard) → tRPC Router (api) → Database (supabase)
```

Qualquer mudanca em um nivel pode quebrar os outros.

---

## Arquitetura Resumida

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  apps/dashboard/src/                                        │
│  ├── app/[locale]/(app)/(sidebar)/  → Paginas              │
│  ├── components/                     → UI Components        │
│  ├── lib/                            → Types, Validation    │
│  └── hooks/                          → React Hooks          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ tRPC calls
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  apps/api/src/                                              │
│  ├── schemas/                        → Zod Schemas          │
│  └── trpc/routers/                   → Business Logic       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Supabase Client
┌─────────────────────────────────────────────────────────────┐
│                        DATABASE                              │
│  packages/db/                                                │
│  └── migrations/                     → SQL Migrations       │
└─────────────────────────────────────────────────────────────┘
```

---

## Onde Fica Cada Coisa

### Modulo Poker (Principal)

| O que | Onde |
|-------|------|
| **Paginas** | `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/` |
| **Componentes** | `apps/dashboard/src/components/poker/` |
| **Validation Tabs** | `apps/dashboard/src/components/poker/validation-tabs/` |
| **Widgets Dashboard** | `apps/dashboard/src/components/widgets/poker/` |
| **Types Frontend** | `apps/dashboard/src/lib/poker/types.ts` |
| **Validacao Frontend** | `apps/dashboard/src/lib/poker/validation.ts` |
| **Hooks** | `apps/dashboard/src/hooks/use-poker-*.ts` |
| **Schemas Backend** | `apps/api/src/schemas/poker/` |
| **Routers Backend** | `apps/api/src/trpc/routers/poker/` |
| **Migrations DB** | `packages/db/migrations/` |

### Arquivos Existentes no Backend

**Schemas** (`apps/api/src/schemas/poker/`):
- `players.ts` - Schemas de jogadores
- `sessions.ts` - Schemas de sessoes
- `settlements.ts` - Schemas de acertos
- `transactions.ts` - Schemas de transacoes
- `imports.ts` - Schemas de importacao
- `team-settings.ts` - Configuracoes do time
- `index.ts` - Exportacoes

**Routers** (`apps/api/src/trpc/routers/poker/`):
- `players.ts` - CRUD de jogadores
- `sessions.ts` - CRUD de sessoes
- `settlements.ts` - CRUD de acertos
- `transactions.ts` - CRUD de transacoes
- `imports.ts` - Processamento de importacao
- `analytics.ts` - Metricas e dashboards
- `index.ts` - Registro dos routers

### Paginas Existentes

| Rota | Arquivo |
|------|---------|
| `/poker` | `poker/page.tsx` (Overview) |
| `/poker/players` | `poker/players/page.tsx` |
| `/poker/agents` | `poker/agents/page.tsx` |
| `/poker/sessions` | `poker/sessions/page.tsx` |
| `/poker/settlements` | `poker/settlements/page.tsx` |
| `/poker/transactions` | `poker/transactions/page.tsx` |
| `/poker/import` | `poker/import/page.tsx` |
| `/poker/league-import` | `poker/league-import/page.tsx` |

### Widgets Existentes

| Widget | Arquivo |
|--------|---------|
| Overview | `overview-widget.tsx` |
| Top Players | `top-players-widget.tsx` |
| Debtors | `debtors-widget.tsx` |
| Gross Rake | `gross-rake-widget.tsx` |
| Bank Result | `bank-result-widget.tsx` |
| Revenue by Game | `revenue-by-game-widget.tsx` |
| Recent Transactions | `recent-transactions-widget.tsx` |
| Sessions by Type | `sessions-by-type-widget.tsx` |
| Rake Trend | `rake-trend-widget.tsx` |

### Hooks Existentes

- `use-poker-player-params.ts`
- `use-poker-session-params.ts`
- `use-poker-settlement-params.ts`
- `use-poker-transaction-params.ts`

### Modulo Liga (Importacao de SuperUnion)

| O que | Onde |
|-------|------|
| **Componentes** | `apps/dashboard/src/components/league/` |
| **Validation Tabs** | `apps/dashboard/src/components/league/validation-tabs/` |
| **Types** | `apps/dashboard/src/lib/league/types.ts` |
| **Validacao** | `apps/dashboard/src/lib/league/validation.ts` |

**Arquivos de Liga:**
- `league-import-uploader.tsx` - Parser e upload
- `league-import-validation-modal.tsx` - Modal de validacao

**Validation Tabs de Liga:**
- `overview-tab.tsx` - Visao geral
- `geral-ppst-tab.tsx` - Aba Geral PPST
- `jogos-ppst-tab.tsx` - Jogos PPST
- `jogos-ppsr-tab.tsx` - Jogos PPSR (pendente)
- `validation-tab.tsx` - Validacao

### Validation Tabs de Clube (15 abas)

| Aba | Arquivo | Descricao |
|-----|---------|-----------|
| Visao Geral | `overview-tab.tsx` | Resumo e estatisticas |
| Cadastro | `cadastro-tab.tsx` | Preview jogadores |
| Resumo | `resumo-tab.tsx` | Aba Geral (48 colunas) |
| Detalhado | `detailed-tab.tsx` | 137 colunas por variante |
| Geral | `general-tab.tsx` | Resumo geral |
| Partidas | `sessions-tab.tsx` | Sessoes de jogo |
| Transacoes | `transactions-tab.tsx` | 21 colunas |
| User Details | `user-details-tab.tsx` | 12 colunas |
| Rakeback | `rakeback-tab.tsx` | 7 colunas |
| Agentes | `agents-tab.tsx` | Hierarquia de agentes |
| Players | `players-tab.tsx` | Lista de jogadores |
| Analytics | `analytics-tab.tsx` | Metricas |
| Validacao | `validation-tab.tsx` | Erros e avisos |
| Avisos | `warnings-tab.tsx` | Alertas |
| Demonstrativo | `demonstrativo-tab.tsx` | Disclaimer |

### UI Compartilhada

| O que | Onde |
|-------|------|
| **Componentes Base** | `packages/ui/src/components/` |
| **Sheets (Modais)** | `apps/dashboard/src/components/sheets/` |
| **Main Menu** | `apps/dashboard/src/components/main-menu.tsx` |
| **Sidebar** | `apps/dashboard/src/components/sidebar.tsx` |

**Sheets de Poker:**
- `poker-player-create-sheet.tsx`
- `poker-player-edit-sheet.tsx`
- `poker-player-detail-sheet.tsx`
- `poker-session-detail-sheet.tsx`
- `global-sheets.tsx`

### Internacionalizacao

| O que | Onde |
|-------|------|
| **Portugues** | `apps/dashboard/src/locales/pt.ts` |
| **Ingles** | `apps/dashboard/src/locales/en.ts` |

---

## Padroes de Codigo

### 1. Adicionar Nova Pagina

```
apps/dashboard/src/app/[locale]/(app)/(sidebar)/MODULO/PAGINA/page.tsx
```

Template:
```typescript
import { Metadata } from "next";
import { getI18n } from "@/locales/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getI18n();
  return { title: t("pagina.titulo") };
}

export default async function PaginaPage() {
  return (
    <div>
      {/* Conteudo */}
    </div>
  );
}
```

### 2. Adicionar Novo Router tRPC

1. **Criar schema** em `apps/api/src/schemas/poker/novo.ts`:
```typescript
import { z } from "zod";

export const getNovoSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().optional(),
});

export const createNovoSchema = z.object({
  // campos...
});
```

2. **Criar router** em `apps/api/src/trpc/routers/poker/novo.ts`:
```typescript
import { createAdminClient } from "@api/services/supabase";
import { getNovoSchema, createNovoSchema } from "../../../schemas/poker/novo";
import { createTRPCRouter, protectedProcedure } from "../../init";

export const novoRouter = createTRPCRouter({
  get: protectedProcedure
    .input(getNovoSchema.optional())
    .query(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      // logica...
    }),

  create: protectedProcedure
    .input(createNovoSchema)
    .mutation(async ({ input, ctx: { teamId } }) => {
      const supabase = await createAdminClient();
      // logica...
    }),
});
```

3. **Registrar no index** em `apps/api/src/trpc/routers/poker/index.ts`:
```typescript
import { createTRPCRouter } from "../../init";
import { novoRouter } from "./novo";

export const pokerRouter = createTRPCRouter({
  // existentes...
  novo: novoRouter,
});
```

### 3. Adicionar Nova Coluna no Banco

1. **Criar migration** em `packages/db/migrations/XXXX_nome.sql`:
```sql
ALTER TABLE poker_players ADD COLUMN nova_coluna TEXT;
```

2. **Atualizar types** no frontend se necessario

3. **Aplicar migration** diretamente no Supabase Dashboard ou via CLI do Supabase

> **Nota:** Este projeto nao tem comandos `db:migrate` no package.json. Migrations sao aplicadas manualmente via Supabase Dashboard ou `supabase db push`.

### 4. Adicionar Novo Widget no Dashboard

1. **Criar widget** em `apps/dashboard/src/components/widgets/poker/novo-widget.tsx`

2. **Exportar** em `apps/dashboard/src/components/widgets/poker/index.tsx`:
```typescript
export { NovoWidget } from "./novo-widget";
```

3. **Usar na pagina** `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/page.tsx`

### 5. Adicionar Nova Traducao

1. **Adicionar em PT** (`apps/dashboard/src/locales/pt.ts`):
```typescript
poker: {
  // existentes...
  novaChave: "Texto em portugues",
}
```

2. **Adicionar em EN** (`apps/dashboard/src/locales/en.ts`):
```typescript
poker: {
  // existentes...
  novaChave: "English text",
}
```

---

## Dependencias Entre Modulos

```
┌─────────────────┐     ┌─────────────────┐
│  poker_players  │◄────│ poker_sessions  │
└─────────────────┘     └─────────────────┘
        ▲                       ▲
        │                       │
        │               ┌───────┴───────┐
        │               │               │
┌───────┴───────┐  ┌────┴────┐  ┌──────┴──────┐
│ poker_settle  │  │ poker_  │  │ poker_      │
│    ments      │  │ chip_   │  │ session_    │
│               │  │ trans   │  │ players     │
└───────────────┘  └─────────┘  └─────────────┘
```

**Regras:**
- `sessions` depende de `players` (criador, jogadores)
- `chip_transactions` depende de `players` (remetente, destinatario)
- `settlements` depende de `players` (jogador do acerto)
- `session_players` depende de `sessions` e `players`

**Nunca delete um player que tem:**
- Sessoes vinculadas
- Transacoes vinculadas
- Acertos pendentes

---

## Migrations Existentes

| Arquivo | Descricao |
|---------|-----------|
| `0001_poker_club_management.sql` | Schema principal do poker |
| `0002_poker_team_settings.sql` | Configuracoes por time |

---

## Checklist Antes de Commitar

### Mudanca no Frontend
- [ ] Tipos atualizados em `lib/poker/types.ts`?
- [ ] Traducoes adicionadas em `locales/pt.ts` e `locales/en.ts`?
- [ ] Componente exportado corretamente?
- [ ] Build passa? (`bun run build`)

### Mudanca no Backend
- [ ] Schema Zod criado/atualizado em `schemas/poker/`?
- [ ] Router registrado no `poker/index.ts`?
- [ ] Usa `createTRPCRouter` e `protectedProcedure` de `../../init`?
- [ ] TypeScript compila? (`bun run typecheck`)

### Mudanca no Banco
- [ ] Migration criada com nome descritivo?
- [ ] Migration e reversivel (tem DROP se necessario)?
- [ ] RLS policies atualizadas?
- [ ] Indexes necessarios criados?

### Mudanca de Importacao
- [ ] Parser atualizado em `import-uploader.tsx`?
- [ ] Validacao atualizada em `validation.ts`?
- [ ] Types atualizados em `types.ts`?
- [ ] Aba do modal criada/atualizada em `validation-tabs/`?

---

## Erros Comuns e Solucoes

### "Cannot find module"
**Causa:** Import incorreto ou arquivo nao exportado
**Solucao:** Verificar se o arquivo existe e esta exportado no index

### "Type 'X' is not assignable to type 'Y'"
**Causa:** Tipos desatualizados entre frontend e backend
**Solucao:** Sincronizar tipos em `lib/poker/types.ts` com schemas em `api/src/schemas/`

### "RLS policy violation"
**Causa:** Tentando acessar dados de outro team
**Solucao:** Verificar se `team_id` esta sendo passado corretamente

### "Invalid input" no tRPC
**Causa:** Dados nao batem com schema Zod
**Solucao:** Verificar schema em `api/src/schemas/` e dados enviados

### Importacao falha silenciosamente
**Causa:** Parser nao reconhece formato da planilha
**Solucao:** Verificar logs do console, ajustar parser em `import-uploader.tsx`

### Widget nao aparece
**Causa:** Nao exportado ou nao importado na pagina
**Solucao:** Verificar exports em `widgets/poker/index.tsx`

---

## Fluxo de Dados - Importacao

```
1. Upload .xlsx
   └── apps/dashboard/src/components/poker/import-uploader.tsx
       └── parseGeralSheet(), parseDetalhadoSheet(), etc.

2. Validacao Frontend
   └── apps/dashboard/src/lib/poker/validation.ts
       └── validateImportData()

3. Modal de Preview
   └── apps/dashboard/src/components/poker/import-validation-modal.tsx
       └── 15 abas: Overview, Cadastro, Resumo, Detalhado, etc.

4. Aprovacao do Usuario
   └── Clica em "Processar"

5. Backend Processing
   └── apps/api/src/trpc/routers/poker/imports.ts
       └── process mutation (8 steps)
           ├── Step 1: Upsert players (Detalhes do usuario)
           ├── Step 2: Upsert summary players (aba Geral)
           ├── Step 3: Map player IDs
           ├── Step 4: Insert transactions
           ├── Step 5: Upsert sessions
           ├── Step 6: Map session IDs
           ├── Step 7: Upsert session_players
           └── Step 8: Upsert player_summary
```

---

## Fluxo de Dados - CRUD Padrao

```
1. Usuario clica em "Criar/Editar/Deletar"
   └── Componente React

2. Chama hook do tRPC
   └── trpc.poker.players.create.useMutation()

3. Request vai para API
   └── apps/api/src/trpc/routers/poker/players.ts

4. Validacao Zod
   └── apps/api/src/schemas/poker/players.ts

5. Execucao no Banco
   └── Supabase client com RLS

6. Retorno para Frontend
   └── Invalidate queries, atualiza UI
```

---

## Estrutura de Tabelas Principais

### poker_players
```sql
- id: UUID (PK)
- team_id: UUID (FK teams, RLS filter)
- pppoker_id: TEXT (UNIQUE per team)
- nickname, memo_name, country
- type: 'player' | 'agent'
- status: 'active' | 'inactive' | 'suspended' | 'blacklisted'
- agent_id, super_agent_id: UUID (FK self, hierarquia)
- chip_balance, credit_limit, current_balance
- risk_score, is_vip, is_shark
```

### poker_sessions
```sql
- id: UUID (PK)
- team_id: UUID (FK teams, RLS filter)
- external_id: TEXT (UNIQUE per team, ID do PPPoker)
- session_type: 'cash_game' | 'mtt' | 'sit_n_go' | 'spin'
- game_variant: 'nlh' | 'plo4' | 'plo5' | etc.
- started_at, ended_at
- total_rake, total_buy_in, total_cash_out
- player_count, hands_played
```

### poker_chip_transactions
```sql
- id: UUID (PK)
- team_id: UUID (FK teams, RLS filter)
- type: 'buy_in' | 'cash_out' | 'credit_given' | etc.
- sender_player_id, recipient_player_id: UUID (FK players)
- credit_sent, credit_redeemed, chips_sent, etc.
- amount: NUMERIC (valor total calculado)
- occurred_at: TIMESTAMPTZ
```

### poker_settlements
```sql
- id: UUID (PK)
- team_id: UUID (FK teams, RLS filter)
- player_id: UUID (FK players)
- status: 'pending' | 'partial' | 'completed' | 'disputed' | 'cancelled'
- period_start, period_end
- amount, paid_amount
- payment_method, payment_reference
```

---

## Comandos Uteis

```bash
# Desenvolvimento
bun run dev              # Docker + dashboard + api (usa docker-compose.yml)
bun run dev:no-docker    # Sem docker, apenas dashboard + api
bun run dev:dashboard    # Apenas dashboard (porta 9000)
bun run dev:api          # Apenas api (porta 8080)

# Build
bun run build            # Build completo via turbo
bun run typecheck        # Verifica tipos TypeScript

# Linting (usa Biome, NAO ESLint/Prettier)
bun run lint             # Biome lint + manypkg check
bun run format           # Biome format

# Testes
bun run test             # Roda testes via turbo
```

> **Importante:** Nao existem comandos `db:migrate`, `db:generate` ou `db:studio` neste projeto. Migrations sao gerenciadas via Supabase Dashboard.

---

## Contato e Suporte

Se algo quebrar e voce nao conseguir resolver:
1. Verifique os logs do console (frontend e backend)
2. Verifique o Supabase Dashboard para erros de RLS
3. Rode `bun run typecheck` para erros de tipo
4. Consulte este guia na secao "Erros Comuns"

---

## Versionamento da Documentacao

| Data | Mudanca |
|------|---------|
| 2025-12-22 | Criacao inicial com dados verificados do codigo |
