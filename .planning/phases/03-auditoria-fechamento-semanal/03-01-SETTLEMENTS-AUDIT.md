# Auditoria de Settlements (Fechamento Semanal)

**Data:** 2026-01-22
**Fase:** 03 - Auditoria Fechamento Semanal
**Plano:** 01

---

## 1. Executive Summary

### Visao Geral do Sistema

O sistema de settlements gerencia o fechamento semanal de jogadores de poker, calculando:
- **grossAmount:** Saldo de chips acumulado no periodo
- **rakebackAmount:** Desconto baseado em percentual configurado por jogador/agente
- **netAmount:** Valor liquido a ser pago/recebido

Existem **dois pontos de entrada** para criar settlements:
1. `settlements.closeWeek` - Procedure simplificado (deprecated?)
2. `week-periods.close` - Procedure principal com UI completa

### Riscos Identificados

| Severidade | Quantidade | Impacto |
|------------|------------|---------|
| CRITICAL | 5 | Corrupcao de dados, calculos errados |
| HIGH | 6 | Comportamento incorreto, UX ruim |
| MEDIUM | 4 | Melhorias de robustez |
| LOW | 2 | Otimizacoes |

### Impacto no Negocio

**Risco Financeiro:** ALTO
- Settlements incorretos afetam pagamentos reais
- Sem atomicidade, falhas podem gerar duplicatas (2x exposicao)
- Sem validacao de calculos manuais

**Risco Operacional:** MEDIO
- Status pode ser alterado sem validacao
- Sem audit trail de alteracoes
- Re-fechamento pode criar duplicatas

---

## 2. Settlement Procedures

### 2.1 settlements.ts (8 procedures, 483 linhas)

#### Procedure: `get`
| Campo | Valor |
|-------|-------|
| **Linhas** | 18-134 |
| **Proposito** | Listar settlements com paginacao e filtros |
| **Input Schema** | `getPokerSettlementsSchema` - cursor, pageSize, sort, status, playerId, agentId, periodStart, periodEnd |
| **Output** | Paginated data com meta (cursor, hasNextPage, totalCount) |
| **Joins** | player (poker_players), agent (poker_players) |
| **Gaps** | pageSize max=1000 pode causar problemas de memoria |

#### Procedure: `getById`
| Campo | Valor |
|-------|-------|
| **Linhas** | 139-205 |
| **Proposito** | Buscar settlement individual por ID |
| **Input Schema** | `getPokerSettlementByIdSchema` - id (UUID) |
| **Error Handling** | PGRST116 -> NOT_FOUND |
| **Status** | OK |

#### Procedure: `create`
| Campo | Valor |
|-------|-------|
| **Linhas** | 210-244 |
| **Proposito** | Criacao manual de settlement |
| **Input Schema** | `createPokerSettlementSchema` - periodStart, periodEnd, playerId?, agentId?, grossAmount, rakebackAmount?, commissionAmount?, adjustmentAmount?, netAmount, note? |
| **Gaps** | **CRITICAL:** Nao valida que netAmount = grossAmount - rakebackAmount - commission - adjustment |
| **Gaps** | Nao valida ordem de datas (periodStart < periodEnd) |
| **Gaps** | Nao verifica duplicatas no periodo |

#### Procedure: `updateStatus`
| Campo | Valor |
|-------|-------|
| **Linhas** | 249-273 |
| **Proposito** | Atualizar status do settlement |
| **Input Schema** | `updatePokerSettlementStatusSchema` - id, status |
| **Status Values** | pending, partial, completed, disputed, cancelled |
| **Gaps** | **CRITICAL:** Sem validacao de maquina de estados |
| **Gaps** | Permite completed -> pending (retrocesso) |
| **Gaps** | Sem audit trail |

#### Procedure: `markPaid`
| Campo | Valor |
|-------|-------|
| **Linhas** | 278-304 |
| **Proposito** | Marcar settlement como pago |
| **Input Schema** | `markSettlementPaidSchema` - id, paidAmount, paidAt? |
| **Logica** | Sets status = "completed", paid_amount, paid_at |
| **Gaps** | **CRITICAL:** Nao valida paidAmount <= netAmount |
| **Gaps** | Nao suporta pagamento parcial real (sempre completed) |
| **Gaps** | Permite pagar valor positivo em settlement negativo |

#### Procedure: `delete`
| Campo | Valor |
|-------|-------|
| **Linhas** | 309-328 |
| **Proposito** | Remover settlement |
| **Input Schema** | `deletePokerSettlementSchema` - id |
| **Gaps** | **CRITICAL:** Sem validacao de status (pode deletar "completed") |
| **Gaps** | Sem audit trail |
| **Gaps** | Hard delete em vez de soft delete |

#### Procedure: `getStats`
| Campo | Valor |
|-------|-------|
| **Linhas** | 333-372 |
| **Proposito** | Estatisticas agregadas de settlements |
| **Input Schema** | Nenhum |
| **Output** | total, pending, completed, totalGross, totalNet, totalPaid, totalPending |
| **Gaps** | Busca TODOS os settlements (sem paginacao = risco de memoria) |
| **Gaps** | Apenas "pending" e "partial" contados como pending |

#### Procedure: `closeWeek` (settlements.ts)
| Campo | Valor |
|-------|-------|
| **Linhas** | 377-482 |
| **Proposito** | Fechar semana e criar settlements |
| **Input Schema** | Inline z.object { periodStart?, periodEnd?, note? } |
| **Nota** | **DUPLICADO** - Existe versao mais completa em week-periods.ts |
| **Gaps** | Ver analise detalhada abaixo |

---

### 2.2 week-periods.ts (7 procedures, 1,195 linhas)

#### Procedure: `getCurrent`
| Campo | Valor |
|-------|-------|
| **Linhas** | 19-85 |
| **Proposito** | Obter/criar week period atual |
| **Logica** | Usa preferencia week_starts_on_monday do usuario |
| **Auto-create** | Sim, cria se nao existir |
| **Status** | OK |

#### Procedure: `getAll`
| Campo | Valor |
|-------|-------|
| **Linhas** | 90-140 |
| **Proposito** | Listar week periods com paginacao |
| **Filtros** | status (open, closed, all) |
| **Status** | OK |

#### Procedure: `getOpenPeriods`
| Campo | Valor |
|-------|-------|
| **Linhas** | 145-168 |
| **Proposito** | Obter todos os periodos abertos |
| **Gaps** | Sem paginacao (risco de memoria com muitos periodos abertos) |

#### Procedure: `getById`
| Campo | Valor |
|-------|-------|
| **Linhas** | 173-204 |
| **Proposito** | Buscar week period por ID |
| **Error Handling** | PGRST116 -> NOT_FOUND |
| **Status** | OK |

#### Procedure: `getCloseWeekData`
| Campo | Valor |
|-------|-------|
| **Linhas** | 209-780 |
| **Proposito** | Dados completos para modal de fechamento |
| **Complexidade** | ALTA (570+ linhas) |
| **Dados** | sessions, summaries, rakebacks, agents, settlements preview, stats |
| **Gaps** | Muitos console.log em producao |
| **Gaps** | Queries complexas sem otimizacao |

#### Procedure: `previewClose`
| Campo | Valor |
|-------|-------|
| **Linhas** | 785-915 |
| **Proposito** | Preview leve de settlements |
| **Logica** | Mesma que `close`, sem persistir |
| **Status** | OK |

#### Procedure: `close` (PRINCIPAL)
| Campo | Valor |
|-------|-------|
| **Linhas** | 920-1167 |
| **Proposito** | Criar settlements e fechar semana |
| **Input Schema** | `closeWeekSchema` - weekPeriodId?, note?, rakebackOverrides? |
| **Criticidade** | **MAXIMA** - Procedure financeiro principal |
| **Analise Detalhada** | Ver secao 3 |

---

## 3. closeWeek Deep Dive

### 3.1 Fluxo Completo

```
Usuario clica "Fechar Semana" no frontend
         |
         v
[CloseWeekPreviewModal] -> weekPeriods.getCloseWeekData()
         |
         v
Usuario revisa preview e confirma
         |
         v
[weekPeriods.close()]
         |
    +----+----+
    |         |
    v         v
Step 1     Step 2
Week       Players
Period     Query
    |         |
    +----+----+
         |
         v
    Step 3: Create Settlements (INSERT)
         |
         v
    Step 4: Reset Balances (UPDATE)
         |
         v
    Step 5: Get Session Stats (SELECT)
         |
         v
    Step 6: Update Week Period (UPDATE)
         |
         v
    Step 7: Commit Imports (UPDATE)
         |
         v
    RETURN success
```

### 3.2 Diagrama de Estados

```
WEEK PERIOD STATUS:
==================

  [open] ----close()----> [closed]
    |
    +--- Nao existe transicao para reabrir!

SETTLEMENT STATUS:
==================

                    +---> [disputed]
                    |
  [pending] ---+----+---> [partial]
               |          |
               +----+-----+---> [completed]
                    |
                    +---> [cancelled]

PROBLEMA: Transicoes revertas sao permitidas:
  [completed] -> [pending]  (VALIDO NO CODIGO!)
  [cancelled] -> [pending]  (VALIDO NO CODIGO!)
```

### 3.3 Calculos Matematicos

#### Formula Implementada

```javascript
// week-periods.ts, linha 1028-1042
grossAmount = player.chip_balance ?? 0

rakebackPercent = agentOverride?.rakebackPercent
                  ?? player.rakeback_percentage
                  ?? 0

rakebackAmount = grossAmount > 0
  ? (grossAmount * rakebackPercent) / 100
  : 0

netAmount = grossAmount - rakebackAmount
```

#### Analise de Cenarios

| Cenario | chip_balance | rakeback_% | gross | rakeback | net | Observacao |
|---------|-------------|------------|-------|----------|-----|------------|
| Saldo positivo | 1000 | 10% | 1000 | 100 | 900 | Correto |
| Saldo negativo | -1000 | 10% | -1000 | 0 | -1000 | **ASSIMETRICO** |
| Zero rakeback | 500 | 0% | 500 | 0 | 500 | Correto |
| Null rakeback | 500 | null | 500 | 0 | 500 | Usa 0% |
| Override agente | 1000 | 10%->20% | 1000 | 200 | 800 | Override funciona |
| Valor fracionario | 1001 | 12.5% | 1001 | 125.125 | 875.875 | **SEM ARREDONDAMENTO** |

#### Problemas Identificados

1. **Rakeback assimetrico em saldos negativos**
   - Jogador perde: rakeback = 0 (paga divida integral)
   - Jogador ganha: rakeback aplicado (paga menos)
   - Questao: Isso e intencional ou bug?

2. **Precisao decimal**
   - Sem arredondamento explicito
   - JavaScript usa IEEE 754 floating point
   - Pode acumular erros em muitas operacoes

3. **Valores null/undefined**
   - `chip_balance ?? 0` - correto
   - `rakeback_percentage ?? 0` - correto
   - Nao ha logging de valores default usados

### 3.4 Edge Cases

#### EC1: Player sem rakeback_percent definido
```
Entrada: player.rakeback_percentage = null
Comportamento: Usa 0%
Problema: Silencioso, deveria logar warning
```

#### EC2: Player com chip_balance = 0
```
Entrada: player.chip_balance = 0
Comportamento: Excluido pela query (neq 0)
Status: CORRETO
```

#### EC3: Agente com multiplos players
```
Comportamento: Cada player gera settlement individual com agent_id
Problema: Nao existe settlement agregado por agente
Impacto: Agente precisa somar manualmente
```

#### EC4: Re-fechamento de semana
```
Entrada: weekPeriod.status = 'closed'
Comportamento: throw BAD_REQUEST
Status: CORRETO
```

#### EC5: Dados importados apos close
```
Cenario: Semana X fechada, usuario importa dados da semana X
Comportamento: Importacao aceita, vai para semana atual
Problema: Dados historicos perdidos, sem warning
```

#### EC6: Falha parcial durante close
```
Cenario: INSERT settlements OK, UPDATE balances FAIL
Comportamento: Settlements criados, balances NAO resetados
Risco: Re-execucao cria DUPLICATAS
Severidade: CRITICAL
```

---

## 4. Verificacao Matematica

### 4.1 Formula Correta vs Implementada

| Formula | Correta | Implementada | Status |
|---------|---------|--------------|--------|
| grossAmount | chip_balance | chip_balance ?? 0 | OK |
| rakebackPercent | player.% ou override | agentOverride ?? player.% ?? 0 | OK |
| rakebackAmount | gross * % / 100 | gross > 0 ? (gross * % / 100) : 0 | **ASSIMETRICO** |
| netAmount | gross - rakeback | gross - rakeback | OK |

### 4.2 Exemplo Numerico Completo

**Entrada:**
- 3 jogadores com saldos: 1000, -500, 750
- Todos com rakeback_percentage = 10%

**Calculo Atual:**

| Player | chip_balance | rakeback_% | gross | rakeback | net |
|--------|-------------|------------|-------|----------|-----|
| A | 1000 | 10 | 1000 | 100 | 900 |
| B | -500 | 10 | -500 | 0 | -500 |
| C | 750 | 10 | 750 | 75 | 675 |
| **Total** | **1250** | - | **1250** | **175** | **1075** |

**Se rakeback fosse simetrico:**

| Player | chip_balance | rakeback_% | gross | rakeback | net |
|--------|-------------|------------|-------|----------|-----|
| A | 1000 | 10 | 1000 | 100 | 900 |
| B | -500 | 10 | -500 | -50 | -450 |
| C | 750 | 10 | 750 | 75 | 675 |
| **Total** | **1250** | - | **1250** | **125** | **1125** |

**Diferenca:** R$ 50 a mais para a operacao no modelo assimetrico.

### 4.3 Casos de Arredondamento

```javascript
// Cenario problematico
grossAmount = 999
rakebackPercent = 12.5

// Resultado JavaScript
rakebackAmount = (999 * 12.5) / 100
               = 12487.5 / 100
               = 124.875

// Problema: valor nao arredondado para 2 casas decimais
// Armazenado: 124.875
// Exibido: R$ 124.88 ou R$ 124.87?
```

**Recomendacao:** Implementar arredondamento explicito:
```javascript
rakebackAmount = Math.round(grossAmount * rakebackPercent) / 100
// ou
rakebackAmount = Number((grossAmount * rakebackPercent / 100).toFixed(2))
```

---

## 5. Status Tracking

### 5.1 Maquina de Estados - Week Period

```
Estados: open, closed
Transicoes validas:
  open -> closed (via close())

Transicoes AUSENTES:
  closed -> open (reabrir)
```

### 5.2 Maquina de Estados - Settlement

```
Estados: pending, partial, completed, disputed, cancelled

Transicoes ESPERADAS (business logic):
  pending -> partial (pagamento parcial)
  pending -> completed (pagamento total)
  pending -> disputed (contestacao)
  pending -> cancelled (cancelamento)
  partial -> completed (saldo pago)
  partial -> disputed (contestacao)
  disputed -> pending (resolvido, reprocessar)
  disputed -> cancelled (encerrado sem pagamento)

Transicoes IMPLEMENTADAS:
  ANY -> ANY (sem validacao!)
```

### 5.3 Gaps de Status

| Gap | Impacto | Severidade |
|-----|---------|------------|
| Sem validacao de transicoes | Permite completed -> pending | CRITICAL |
| Sem audit trail | Nao rastreia quem alterou | HIGH |
| Sem timestamp de transicao | Nao rastreia quando alterou | MEDIUM |
| Sem historico | Perde estados anteriores | MEDIUM |

---

## 6. Gaps Identificados

### 6.1 CRITICAL (5)

| ID | Gap | Arquivo | Linha | Impacto |
|----|-----|---------|-------|---------|
| C1 | Sem transacao atomica em close() | week-periods.ts | 920-1167 | Falha parcial = duplicatas |
| C2 | Sem validacao de calculo em create() | settlements.ts | 210-244 | netAmount incorreto aceito |
| C3 | Permite deletar settlement pago | settlements.ts | 309-328 | Perda de dados financeiros |
| C4 | markPaid sem validar valor | settlements.ts | 278-304 | Pagamento > divida |
| C5 | Sem validacao de transicoes de status | settlements.ts | 249-273 | Estados inconsistentes |

### 6.2 HIGH (6)

| ID | Gap | Arquivo | Linha | Impacto |
|----|-----|---------|-------|---------|
| H1 | Rakeback assimetrico (so positivos) | week-periods.ts | 1038-1041 | Calculo questionavel |
| H2 | Sem audit trail | settlements.ts | varios | Nao rastreia alteracoes |
| H3 | Duplicidade de closeWeek | settlements.ts + week-periods.ts | - | Comportamento inconsistente |
| H4 | getStats sem paginacao | settlements.ts | 333-372 | Risco de memoria |
| H5 | getOpenPeriods sem paginacao | week-periods.ts | 145-168 | Risco de memoria |
| H6 | Sem soft delete | settlements.ts | 309-328 | Perda permanente |

### 6.3 MEDIUM (4)

| ID | Gap | Arquivo | Linha | Impacto |
|----|-----|---------|-------|---------|
| M1 | Sem arredondamento decimal | week-periods.ts | 1038-1041 | Precisao financeira |
| M2 | console.log em producao | week-periods.ts | varios | Performance, logs poluidos |
| M3 | Sem warning para rakeback null | week-periods.ts | 1037 | Debug dificil |
| M4 | Sem validacao de datas | settlements.ts | create | periodStart > periodEnd aceito |

### 6.4 LOW (2)

| ID | Gap | Arquivo | Linha | Impacto |
|----|-----|---------|-------|---------|
| L1 | Session stats usa session_date | week-periods.ts | 1102-1107 | Pode nao existir no schema |
| L2 | Import commit usa >= e <= | week-periods.ts | 1152-1153 | Pode perder imports que cruzam semanas |

---

## 7. Recomendacoes

### 7.1 Correcoes Urgentes (Sprint 1)

#### R1: Implementar transacao atomica em close()
```typescript
// Usar Supabase RPC ou transacao manual
const { error } = await supabase.rpc('close_week_atomic', {
  p_team_id: teamId,
  p_week_period_id: weekPeriodId,
  p_user_id: userId,
  p_settlements: settlements,
  p_note: note
})
```

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION close_week_atomic(
  p_team_id UUID,
  p_week_period_id UUID,
  p_user_id UUID,
  p_settlements JSONB,
  p_note TEXT
) RETURNS JSONB AS $$
BEGIN
  -- All operations in single transaction
  -- INSERT settlements
  -- UPDATE chip_balances
  -- UPDATE week_period
  -- UPDATE imports

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql;
```

#### R2: Validar calculo em create()
```typescript
// Antes de inserir
const calculatedNet = input.grossAmount
  - (input.rakebackAmount ?? 0)
  - (input.commissionAmount ?? 0)
  - (input.adjustmentAmount ?? 0)

if (Math.abs(calculatedNet - input.netAmount) > 0.01) {
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: `netAmount invalido. Esperado: ${calculatedNet}, Recebido: ${input.netAmount}`
  })
}
```

#### R3: Validar transicoes de status
```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['partial', 'completed', 'disputed', 'cancelled'],
  partial: ['completed', 'disputed'],
  completed: [], // Nao pode retroceder
  disputed: ['pending', 'cancelled'],
  cancelled: [] // Estado final
}

function validateTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}
```

### 7.2 Melhorias de Robustez (Sprint 2)

#### R4: Implementar audit trail
```sql
CREATE TABLE poker_settlement_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settlement_id UUID REFERENCES poker_settlements(id),
  action TEXT NOT NULL, -- 'created', 'status_changed', 'paid', 'deleted'
  old_values JSONB,
  new_values JSONB,
  changed_by_id UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_settlement_audit_settlement ON poker_settlement_audit(settlement_id);
```

#### R5: Implementar soft delete
```typescript
// Em vez de DELETE
await supabase
  .from('poker_settlements')
  .update({
    deleted_at: new Date().toISOString(),
    deleted_by_id: userId
  })
  .eq('id', settlementId)
```

#### R6: Adicionar arredondamento
```typescript
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

rakebackAmount = roundCurrency(
  grossAmount > 0 ? (grossAmount * rakebackPercent / 100) : 0
)
```

### 7.3 Validacoes Adicionais (Sprint 3)

#### R7: Validar paidAmount em markPaid
```typescript
// Buscar settlement atual
const { data: settlement } = await supabase
  .from('poker_settlements')
  .select('net_amount, status')
  .eq('id', input.id)
  .single()

if (settlement.status === 'completed') {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Settlement ja esta pago'
  })
}

if (input.paidAmount > settlement.net_amount) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Valor pago (${input.paidAmount}) excede valor devido (${settlement.net_amount})`
  })
}
```

#### R8: Proteger delete de settlements pagos
```typescript
// Verificar status antes de deletar
const { data: settlement } = await supabase
  .from('poker_settlements')
  .select('status')
  .eq('id', input.id)
  .single()

if (settlement.status === 'completed') {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Nao e possivel deletar settlement pago'
  })
}
```

---

## 8. Apendice

### 8.1 Codigo Critico: close() - week-periods.ts

```typescript
// Linhas 1023-1080: Criacao de settlements
if (players && players.length > 0) {
  const rakebackOverrides = input?.rakebackOverrides ?? [];

  const settlements = players.map((player) => {
    const grossAmount = player.chip_balance ?? 0;

    // Check if there's an override for this player's agent
    const agentOverride = player.agent_id
      ? rakebackOverrides.find((o) => o.agentId === player.agent_id)
      : null;

    // Use override % if exists, otherwise use player's configured %
    const rakebackPercent =
      agentOverride?.rakebackPercent ?? player.rakeback_percentage ?? 0;

    const rakebackAmount =
      grossAmount > 0 ? (grossAmount * rakebackPercent) / 100 : 0;
    const netAmount = grossAmount - rakebackAmount;

    totalGross += grossAmount;
    totalNet += netAmount;

    return {
      team_id: teamId,
      period_start: weekPeriod.week_start,
      period_end: weekPeriod.week_end,
      week_period_id: weekPeriodId,
      player_id: player.id,
      agent_id: player.agent_id,
      gross_amount: grossAmount,
      rakeback_amount: rakebackAmount,
      rakeback_percent_used: rakebackPercent,
      commission_amount: 0,
      adjustment_amount: 0,
      net_amount: netAmount,
      created_by_id: userId,
      note: input?.note ?? `Fechamento semana: ${weekPeriod.week_start} a ${weekPeriod.week_end}`,
      status: "pending",
    };
  });

  // INSERT sem transacao - PONTO DE FALHA
  const { data: createdSettlements, error: insertError } = await supabase
    .from("poker_settlements")
    .insert(settlements)
    .select("id");

  if (insertError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: insertError.message,
    });
  }

  settlementsCreated = createdSettlements?.length ?? 0;

  // UPDATE sem transacao - PONTO DE FALHA
  const playerIds = players.map((p) => p.id);
  const { error: updateError } = await supabase
    .from("poker_players")
    .update({
      chip_balance: 0,
      updated_at: new Date().toISOString(),
    })
    .in("id", playerIds)
    .eq("team_id", teamId);

  if (updateError) {
    // Se falhar aqui, settlements ja foram criados!
    // Re-execucao criara DUPLICATAS
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: updateError.message,
    });
  }
}
```

### 8.2 Schema de Status (settlements.ts)

```typescript
export const pokerSettlementStatusSchema = z.enum([
  "pending",   // Criado, aguardando pagamento
  "partial",   // Parcialmente pago
  "completed", // Totalmente pago
  "disputed",  // Em disputa
  "cancelled", // Cancelado
]);
```

### 8.3 Schema de Week Period (week-periods.ts)

```typescript
export const pokerWeekPeriodStatusSchema = z.enum([
  "open",   // Semana ativa
  "closed"  // Semana fechada
]);
```

### 8.4 Relacao com Phase 2 Findings

| Finding Phase 2 | Impacto em Settlements |
|-----------------|------------------------|
| Backend usa rawData:any | Settlements podem ser criados com dados de import invalidos |
| Sem transacao atomica no import | Chip balances podem estar incorretos antes do close |
| CONSISTENCY_RULES nao implementadas | Dados inconsistentes geram settlements incorretos |
| MATH_RULES nao implementadas | Totais nao verificados antes de gerar settlements |

---

## 9. Proximos Passos

1. **Imediato:** Implementar transacao atomica em close()
2. **Curto prazo:** Adicionar validacoes de calculo e transicoes
3. **Medio prazo:** Implementar audit trail completo
4. **Longo prazo:** Revisar logica de rakeback assimetrico com stakeholders

---

*Documento gerado em: 2026-01-22*
*Autor: Claude (AI Assistant)*
*Fase: 03-auditoria-fechamento-semanal*
*Plano: 01*
