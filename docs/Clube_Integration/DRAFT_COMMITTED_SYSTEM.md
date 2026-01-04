# Sistema Draft/Committed - Importações de Poker

## Visão Geral

O sistema de importações de poker usa um modelo de **Draft/Committed** para controlar quando os dados aparecem no histórico e relatórios. Dados importados ficam em modo "rascunho" (draft) até que a semana seja fechada, quando então são "commitados" e aparecem no histórico.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE DADOS                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Upload Planilha                                                       │
│        │                                                                │
│        ▼                                                                │
│   ┌─────────┐     ┌───────────┐     ┌───────────┐                      │
│   │ Validar │────▶│ Processar │────▶│ Completed │                      │
│   └─────────┘     └───────────┘     └─────┬─────┘                      │
│                                           │                             │
│                                           │ committed = FALSE           │
│                                           │ (Draft - só no Dashboard)   │
│                                           │                             │
│                                           ▼                             │
│                                    ┌────────────┐                       │
│                                    │   Fechar   │                       │
│                                    │   Semana   │                       │
│                                    └─────┬──────┘                       │
│                                          │                              │
│                                          │ committed = TRUE             │
│                                          │ (Aparece no Histórico)       │
│                                          ▼                              │
│                                    ┌────────────┐                       │
│                                    │ Settlements│                       │
│                                    │  Criados   │                       │
│                                    └────────────┘                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Estrutura do Banco de Dados

### Tabela Principal: `poker_imports`

```sql
CREATE TABLE poker_imports (
  id UUID PRIMARY KEY,
  team_id UUID NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'validating', 'processing', 'completed', 'failed'

  -- Campos de controle Draft/Committed
  committed BOOLEAN DEFAULT FALSE,      -- Se TRUE, dados aparecem no histórico
  committed_at TIMESTAMPTZ,             -- Quando foi commitado
  committed_by_id UUID,                 -- Quem commitou (user_id)

  period_start DATE,                    -- Início do período importado
  period_end DATE,                      -- Fim do período importado
  ...
);
```

### Tabelas com `import_id` (CASCADE DELETE)

Todas essas tabelas têm `import_id` que referencia `poker_imports(id) ON DELETE CASCADE`:

| Tabela | Descrição |
|--------|-----------|
| `poker_players` | Cadastro de jogadores e agentes |
| `poker_sessions` | Sessões/partidas de poker |
| `poker_session_players` | Jogadores por sessão (rake, winnings) |
| `poker_player_summary` | Resumo do jogador por período (aba Geral) |
| `poker_player_detailed` | Detalhes do jogador (aba Detalhado) |
| `poker_agent_rakeback` | Rakeback dos agentes |
| `poker_chip_transactions` | Transações de fichas |
| `poker_week_periods` | Períodos semanais |

**Importante:** Quando um `poker_import` é deletado, TODOS os dados relacionados são deletados automaticamente via CASCADE.

## Como Funciona o Filtro de Committed

### Helper Function

Todos os routers que precisam filtrar por committed usam esta função helper:

```typescript
// apps/api/src/trpc/routers/poker/*.ts

async function getCommittedImportIds(
  supabase: SupabaseClient,
  teamId: string,
  includeDraft: boolean,
): Promise<string[] | null> {
  // Se includeDraft = true, retorna null (sem filtro)
  if (includeDraft) {
    return null;
  }

  // Busca apenas imports que estão completed E committed
  const { data: imports } = await supabase
    .from("poker_imports")
    .select("id")
    .eq("team_id", teamId)
    .eq("status", "completed")
    .eq("committed", true);

  return imports?.map((i) => i.id) ?? [];
}
```

### Uso nas Queries

```typescript
// Exemplo de uso em uma query
const committedImportIds = await getCommittedImportIds(
  supabase,
  teamId,
  includeDraft ?? false, // Default: só committed
);

// Se não há imports committed e não está incluindo draft, retorna vazio
if (committedImportIds !== null && committedImportIds.length === 0) {
  return { data: [], meta: { totalCount: 0 } };
}

// Aplica filtro na query
let query = supabase.from("poker_sessions").select("*").eq("team_id", teamId);

if (committedImportIds !== null) {
  query = query.in("import_id", committedImportIds);
}
```

## Onde o Filtro é Aplicado

### Routers com Filtro de Committed

| Router | Método | O que filtra | Parâmetro |
|--------|--------|--------------|-----------|
| `analytics.ts` | `getDashboardStats` | Estatísticas do dashboard | `includeDraft` |
| `sessions.ts` | `get` | Lista de sessões | `includeDraft` |
| `sessions.ts` | `getStats` | Widgets de estatísticas de sessões | `includeDraft` |
| `transactions.ts` | `get` | Lista de transações | `includeDraft` |
| `transactions.ts` | `getStats` | Widgets de estatísticas de transações | `includeDraft` |
| `players.ts` | `get` | Lista de jogadores/agentes | `includeDraft` |
| `players.ts` | `getAgentStats` | Widgets de estatísticas de agentes | `includeDraft` |

### Schemas (Zod)

Todos os schemas que suportam filtro de committed têm o campo `includeDraft`:

```typescript
// apps/api/src/schemas/poker/sessions.ts
export const getPokerSessionsSchema = z.object({
  // ... outros campos
  includeDraft: z.boolean().optional().openapi({
    description: "Include draft (non-committed) data. Default is false.",
  }),
});

// apps/api/src/schemas/poker/players.ts
export const getPokerPlayersSchema = z.object({
  // ... outros campos
  includeDraft: z.boolean().optional(),
});

// apps/api/src/schemas/poker/transactions.ts
export const getPokerTransactionsSchema = z.object({
  // ... outros campos
  includeDraft: z.boolean().optional(),
});
```

## Comportamento por Página

| Página | Mostra Draft? | Mostra Committed? | Parâmetro |
|--------|---------------|-------------------|-----------|
| `/poker` (Dashboard - Semana Atual) | ✅ Sim | ✅ Sim | `includeDraft: true` |
| `/poker` (Dashboard - Histórico) | ❌ Não | ✅ Sim | `includeDraft: false` |
| `/poker/sessions` | ❌ Não | ✅ Sim | Default `false` |
| `/poker/agents` | ❌ Não | ✅ Sim | Default `false` |
| `/poker/players` | ❌ Não | ✅ Sim | Default `false` |
| `/poker/transactions` | ❌ Não | ✅ Sim | Default `false` |
| Settlements | ❌ Não | ✅ Sim | Default `false` |

**Regra geral:** Todas as páginas exceto o Dashboard em modo "Semana Atual" mostram apenas dados committed.

### Dashboard: Semana Atual vs Histórico

O dashboard tem dois modos controlados por `viewMode`:

```typescript
// apps/dashboard/src/components/widgets/poker/poker-widgets-grid.tsx

// Busca o período aberto (semana atual com dados importados)
const { data: openPeriods } = useQuery(
  trpc.poker.weekPeriods.getOpenPeriods.queryOptions()
);
const currentWeekPeriod = openPeriods?.[0] ?? null;

// Define as datas baseado no modo
const effectiveFrom = viewMode === "current_week" && currentWeekPeriod
  ? currentWeekPeriod.weekStart  // Usa datas do período importado
  : from ?? undefined;           // Usa datas selecionadas pelo usuário

// includeDraft só é true no modo "Semana Atual"
const { data } = useQuery(
  trpc.poker.analytics.getDashboardStats.queryOptions({
    from: effectiveFrom,
    to: effectiveTo,
    includeDraft: viewMode === "current_week", // ← Aqui está a mágica
  })
);
```

## Processo de Fechar Semana

Quando o usuário clica em "Fechar Semana":

```typescript
// apps/api/src/trpc/routers/poker/week-periods.ts

close: protectedProcedure.mutation(async ({ ctx }) => {
  // 1. Busca o período aberto
  const { data: openPeriod } = await supabase
    .from("poker_week_periods")
    .select("*")
    .eq("team_id", teamId)
    .eq("status", "open")
    .single();

  // 2. Marca o período como closed
  await supabase
    .from("poker_week_periods")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", openPeriod.id);

  // 3. Commita todos os imports do período
  await supabase
    .from("poker_imports")
    .update({
      committed: true,
      committed_at: new Date().toISOString(),
      committed_by_id: userId,
    })
    .eq("team_id", teamId)
    .eq("status", "completed")
    .gte("period_start", openPeriod.week_start)
    .lte("period_end", openPeriod.week_end);

  // 4. Cria settlements (acertos financeiros)
  // ... lógica de settlements
});
```

## Debugando Problemas

### Dados não aparecem no Dashboard

1. **Verificar se o import está completed:**
```sql
SELECT id, status, committed, period_start, period_end
FROM poker_imports
WHERE team_id = 'seu-team-id';
```

2. **Verificar se está no modo correto:**
   - "Semana Atual" → mostra draft
   - "Histórico" → só committed

3. **Verificar datas do período:**
```sql
SELECT * FROM poker_week_periods
WHERE team_id = 'seu-team-id'
ORDER BY week_start DESC;
```

### Dados aparecem mesmo sem estar committed

1. **Verificar se a página está passando `includeDraft: false`:**
   - Checar o router correspondente
   - Verificar se o schema tem o campo `includeDraft`

2. **Verificar se a query está filtrando:**
```typescript
// Deve ter isso no código:
if (committedImportIds !== null) {
  query = query.in("import_id", committedImportIds);
}
```

3. **Verificar todas as queries do endpoint:**
   - Algumas queries buscam dados de múltiplas fontes
   - Exemplo: `getAgentStats` busca agentes, managed players E rake
   - TODAS as sub-queries precisam filtrar por `import_id`

### Widgets mostram dados mas lista está vazia

Isso geralmente significa que:
- A query de listagem (`get`) está filtrando corretamente
- A query de estatísticas (`getStats`) NÃO está filtrando

**Solução:** Verificar se `getStats` também usa `getCommittedImportIds`.

### Dados não são deletados quando import é removido

1. **Verificar se a tabela tem `import_id` com CASCADE:**
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE kcu.column_name = 'import_id'
  AND tc.constraint_type = 'FOREIGN KEY';
```

2. **Adicionar CASCADE se necessário:**
```sql
ALTER TABLE nome_da_tabela
ADD COLUMN import_id UUID REFERENCES poker_imports(id) ON DELETE CASCADE;
```

## Arquivos Importantes

```
apps/api/src/
├── schemas/poker/
│   ├── sessions.ts          # Schema com includeDraft
│   ├── players.ts           # Schema com includeDraft
│   └── transactions.ts      # Schema com includeDraft
│
├── trpc/routers/poker/
│   ├── analytics.ts         # getDashboardStats com filtro
│   ├── sessions.ts          # get, getStats com filtro
│   ├── players.ts           # get, getAgentStats com filtro
│   ├── transactions.ts      # get, getStats com filtro
│   ├── week-periods.ts      # close() commita imports
│   └── imports.ts           # Processamento de importação (cria dados com import_id)
│
apps/dashboard/src/
├── components/widgets/poker/
│   └── poker-widgets-grid.tsx  # Lógica de viewMode e includeDraft
```

## Importação: Como os Dados São Criados

Durante o processamento da importação (`imports.ts`), todos os registros são criados com `import_id`:

```typescript
// STEP 1: Players (aba Detalhes do usuário)
const playersRaw = rawData.players.map((player) => ({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  pppoker_id: player.ppPokerId,
  // ...
}));

// STEP 2: Agents/Super Agents (extraídos dos summaries)
agentsRaw.push({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  pppoker_id: summary.agentPpPokerId,
  type: "agent",
  // ...
});

// STEP 2.5: Players from summaries (aba Geral)
const summaryPlayersRaw = rawData.summaries.map((summary) => ({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  pppoker_id: summary.ppPokerId,
  // ...
}));

// STEP 2.6: Players from sessions (aba Partidas)
sessionPlayersRaw.push({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  pppoker_id: player.ppPokerId,
  // ...
});

// STEP 4: Transactions (aba Transações)
const transactionsToInsert = rawData.transactions.map((tx) => ({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  occurred_at: tx.occurredAt,
  // ...
}));

// STEP 5: Sessions (aba Partidas)
const sessionsRaw = rawData.sessions.map((session) => ({
  team_id: teamId,
  import_id: importId,  // ← Vincula ao import
  external_id: session.externalId,
  // ...
}));
```

**Importante:** Todos os dados criados pela importação são vinculados via `import_id`. Isso permite:
1. Filtrar dados por status committed do import
2. Deletar TODOS os dados quando o import é removido (CASCADE DELETE)

## Migrations Relacionadas

1. **Adicionar `committed` ao `poker_imports`:**
```sql
ALTER TABLE poker_imports
ADD COLUMN committed BOOLEAN DEFAULT FALSE,
ADD COLUMN committed_at TIMESTAMPTZ,
ADD COLUMN committed_by_id UUID REFERENCES users(id);
```

2. **Adicionar `import_id` às tabelas:**
```sql
-- Transações
ALTER TABLE poker_chip_transactions
ADD COLUMN import_id UUID REFERENCES poker_imports(id) ON DELETE CASCADE;
CREATE INDEX idx_poker_chip_transactions_import_id ON poker_chip_transactions(import_id);

-- Jogadores
ALTER TABLE poker_players
ADD COLUMN import_id UUID REFERENCES poker_imports(id) ON DELETE CASCADE;
CREATE INDEX idx_poker_players_import_id ON poker_players(import_id);
```

## Checklist para Adicionar Novo Endpoint

Ao criar um novo endpoint que busca dados de poker:

- [ ] Adicionar `includeDraft` ao schema (se aplicável)
- [ ] Importar/criar `getCommittedImportIds` helper
- [ ] Chamar `getCommittedImportIds` no início da query
- [ ] Retornar dados vazios se `committedImportIds.length === 0`
- [ ] Aplicar filtro `query.in("import_id", committedImportIds)` em TODAS as sub-queries
- [ ] Testar com dados draft (antes de fechar semana)
- [ ] Testar com dados committed (após fechar semana)

## Resumo

- **Draft** = `committed = false` → só aparece no Dashboard "Semana Atual"
- **Committed** = `committed = true` → aparece em todas as páginas e histórico
- **Fechar Semana** = marca imports como committed + cria settlements
- **Deletar Import** = CASCADE DELETE remove todos os dados relacionados
- **`includeDraft` param** = controla se queries incluem dados draft (default: `false`)
