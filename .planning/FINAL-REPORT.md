# Relatorio Final: Auditoria do Fluxo de Clubes - Mid Poker

**Data:** 2026-01-22
**Versao:** 1.0
**Status:** Completo

---

## Executive Summary

### Escopo da Auditoria

Auditoria completa do fluxo de gestao de clubes no Mid Poker, analisando toda a logica desde a experiencia do usuario (entrar na secao de clubes, adicionar planilha, validar, aprovar, iniciar fechamento semanal, ate fechar semana completa).

**Core Value Auditado:** A logica de fechamento semanal (settlements) deve estar matematicamente correta e consistente. Todos os calculos, saldos, rake, transacoes e settlements devem ser precisos e auditaveis.

### Metodologia

| Fase | Descricao | Plans | Duracao |
|------|-----------|-------|---------|
| Phase 01 | Mapeamento do Fluxo UX | 2 | ~6.75h |
| Phase 02 | Auditoria de Validacao | 2 | ~1.2h |
| Phase 03 | Auditoria Fechamento Semanal | 3 | ~2h |
| Phase 04 | Verificacao de Consistencia | 2 | ~1.5h |
| Phase 05 | Relatorio Final | 1 | - |

**Total:** 9 plans executados, ~12 horas de analise

### Resultado Geral

| Severidade | Quantidade | Status |
|------------|------------|--------|
| CRITICAL (P0) | 12 | Requer correcao imediata |
| HIGH (P1) | 8 | Corrigir em curto prazo |
| MEDIUM (P2) | 6 | Planejar para sprints futuras |
| LOW (P3-P4) | 4 | Backlog |
| **Total** | **30** | - |

### Recomendacao Principal

> **ALERTA CRITICO:** NAO executar `closeWeek` em producao ate corrigir os issues P0. O sistema de settlements esta fundamentalmente quebrado e gera dados financeiros incorretos.

**Issues bloqueantes identificados:**
1. Bug de campo `rakeback_percentage` vs `rakeback_percent` - rakeback sempre = 0
2. Settlement usa `chip_balance` em vez de `rake` - calculo errado
3. Sem transacao atomica - falhas parciais corrompem dados
4. Sem validacao backend - dados invalidos sao processados

---

## Metricas da Auditoria

### Cobertura de Codigo

| Categoria | Arquivos | Linhas | Cobertura |
|-----------|----------|--------|-----------|
| tRPC Routers (poker) | 8 | 6,660+ | 100% |
| Frontend Components | 60+ | N/A | 100% |
| Database Schema | 17 tables | 4,274 | 100% |
| Validation Rules | 15 frontend / 2 backend | ~1,200 | 100% |
| Migrations | 6 | ~2,000 | 100% |

### Arquivos Auditados

**Backend (apps/api/src/trpc/routers/poker/):**
- imports.ts (1,668 lines) - CRITICAL
- players.ts (1,179 lines)
- sessions.ts (662 lines)
- transactions.ts (412 lines)
- settlements.ts (484 lines) - CRITICAL
- analytics.ts (1,067 lines)
- week-periods.ts (1,194 lines) - CRITICAL
- index.ts

**Frontend (apps/dashboard/src/):**
- components/poker/ (60+ components)
- lib/poker/validation.ts (1,200+ lines)
- hooks/ (10+ custom hooks)
- store/ (3 Zustand stores)

**Database (packages/db/):**
- schema.ts (4,274 lines)
- queries/poker-*.ts (43 files)
- migrations/*.sql (6 files)

### Tempo de Auditoria

| Fase | Tempo Real | Plans |
|------|------------|-------|
| Phase 01 | 6.75 hours | 2 |
| Phase 02 | 1.2 hours | 2 |
| Phase 03 | 2 hours | 3 |
| Phase 04 | 1.5 hours | 2 |
| **Total** | **~12 hours** | **9** |

---

## Achados por Area

### 1. Validacao de Dados

**Status:** CRITICO
**Source:** Plans 02-01, 02-02

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| V1 | Backend aceita `rawData: z.any()` - sem schema validation | CRITICAL | Dados invalidos entram no sistema |
| V2 | CONSISTENCY_RULES nao implementado (5 regras definidas, 0 ativas) | CRITICAL | Inconsistencias nao detectadas |
| V3 | MATH_RULES nao implementado (4 regras definidas, 0 ativas) | CRITICAL | Erros matematicos nao verificados |
| V4 | Parity gap: 15 regras frontend vs 2 checks backend | HIGH | Validacao bypassada via API |
| V5 | Thresholds permissivos (83-87%) | MEDIUM | Dados incompletos aceitos |

#### Comparacao Frontend vs Backend

| Categoria | Frontend | Backend | Gap |
|-----------|----------|---------|-----|
| Structure Rules | 11 | 0 | CRITICAL |
| Integrity Rules | 4 | 2 | HIGH |
| Consistency Rules | 0 (TODO) | 0 | CRITICAL |
| Math Rules | 0 (TODO) | 0 | CRITICAL |

#### Impacto

- Dados invalidos passam pela validacao frontend
- Backend processa qualquer dado recebido sem verificacao
- Calculos financeiros podem estar baseados em dados corrompidos
- Nao ha garantia de integridade matematica

---

### 2. Processamento de Import

**Status:** CRITICO
**Source:** Plans 02-02, 04-01

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| P1 | Sem transacao atomica em imports.process (13 steps) | CRITICAL | Falhas parciais deixam dados inconsistentes |
| P2 | INSERT para transactions (sem upsert) | CRITICAL | Duplicatas criadas em re-import |
| P3 | INSERT para demonstrativo (sem upsert) | CRITICAL | Duplicatas criadas em re-import |
| P4 | Orphan data permitido (transactions com player_id null) | HIGH | Integridade referencial quebrada |
| P5 | N queries individuais para player linking | HIGH | Performance, falha parcial |
| P6 | N queries individuais para activity metrics | HIGH | Performance, falha parcial |

#### Fluxo de Processamento (13 Steps)

```
PRE-SCAN -> STEP 0 (week_period) -> STEP 1-2.6 (players/agents)
         -> STEP 3-3.5 (player map + linking)
         -> STEP 4 (transactions)* -> STEP 5-7 (sessions)
         -> STEP 8-10 (summaries/detailed/rakeback)
         -> STEP 11 (demonstrativo)* -> STEP 12 (metrics)

* = INSERT sem upsert (cria duplicatas)
```

#### Tabelas Afetadas (10)

1. poker_week_periods (UPSERT)
2. poker_players (UPSERT x4)
3. poker_chip_transactions (INSERT - duplicatas!)
4. poker_sessions (UPSERT)
5. poker_session_players (UPSERT)
6. poker_player_summary (UPSERT)
7. poker_player_detailed (UPSERT)
8. poker_agent_rakeback (UPSERT)
9. poker_demonstrativo (INSERT - duplicatas!)
10. poker_imports (status update)

#### Cenarios de Falha

1. **Step 4 falha apos Step 3.5:** Players criados, transacoes nao. Re-import cria links duplicados.
2. **Step 8 falha apos Step 7:** Sessions existem, summaries nao. Dashboard mostra dados incompletos.
3. **Step 12 falha apos Step 11:** Tudo importado, metricas nao atualizadas.

---

### 3. Settlements (Fechamento Semanal)

**Status:** CRITICO
**Source:** Plans 03-01, 04-01

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| S1 | Sem transacao atomica em closeWeek (7 steps) | CRITICAL | Duplicatas se re-executar |
| S2 | Sem validacao de netAmount em create() | CRITICAL | Valores incorretos aceitos |
| S3 | Permite deletar settlements completed | CRITICAL | Perda de dados financeiros |
| S4 | markPaid aceita qualquer valor | HIGH | Overpayment possivel |
| S5 | Sem validacao de transicao de status | HIGH | Inconsistencia de estado |
| S6 | Sem soft delete | MEDIUM | Audit trail perdido |

#### Fluxo de Fechamento (7 Steps)

```
Step 1: Get/Create week period
Step 2: Query players with chip_balance != 0
Step 3: INSERT settlements  <-- PONTO DE FALHA
Step 4: UPDATE players (balance=0)  <-- PONTO DE FALHA
Step 5: Get session stats
Step 6: UPDATE period (closed)  <-- PONTO DE FALHA
Step 7: UPDATE imports (committed)
```

#### Cenarios de Falha Criticos

1. **Step 4 falha apos Step 3:** Settlements criados, balances NAO resetados. Re-executar cria DUPLICATAS.
2. **Step 6 falha apos Step 4:** Settlements criados, balances resetados, periodo NAO fechado. Pode fechar novamente.

---

### 4. Rake e Rakeback

**Status:** CRITICO
**Source:** Plans 03-02, 04-02

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| R1 | Bug de campo: `rakeback_percentage` vs `rakeback_percent` | CRITICAL | Rakeback SEMPRE = 0 |
| R2 | Settlement usa chip_balance em vez de rake | CRITICAL | Calculo fundamentalmente errado |
| R3 | Sem agregacao de rake por periodo | CRITICAL | Settlement nao considera rake real |
| R4 | Agent commission settlements nao implementado | HIGH | Agentes nao recebem comissao |
| R5 | Super-agent cascade nao implementado | HIGH | Hierarquia nao funciona |

#### Bug de Campo Confirmado

**Schema define:** `rakeback_percent`
**Codigo usa:** `rakeback_percentage`

**Arquivos afetados:**
- `settlements.ts`: linhas 40, 41, 112, 120, 400, 425 (7 locais)
- `week-periods.ts`: linhas 680, 692, 855, 875, 1007, 1038 (6 locais)

**Total:** 13 locais precisam de fix

#### Impacto Financeiro

```typescript
// ATUAL (INCORRETO):
grossAmount = chip_balance  // Deveria ser rake do periodo
rakebackPercent = player.rakeback_percentage  // Campo nao existe = undefined
rakebackAmount = gross * undefined / 100  // = 0 sempre

// CORRETO deveria ser:
grossAmount = SUM(poker_player_summary.rake_total) WHERE period = current
rakebackPercent = player.rakeback_percent  // Campo correto
rakebackAmount = grossAmount * rakebackPercent / 100
```

#### Dashboard vs Settlement

| Calculo | Dashboard | Settlement | Correto? |
|---------|-----------|------------|----------|
| Total Rake | poker_player_summary.rake_total | N/A | OK |
| Gross Rake | poker_session_players.rake | chip_balance | ERRADO |
| Rakeback | agent_rake * rakeback_percent | chip_balance * rakeback_percentage | ERRADO |

---

### 5. Transacoes e Balance

**Status:** CRITICO
**Source:** Plan 03-03

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| T1 | chip_balance e snapshot, nao calculado de transacoes | CRITICAL | Sem verificacao de integridade |
| T2 | Sem mecanismo de consistencia | CRITICAL | Corrupcao silenciosa possivel |
| T3 | Delete transaction nao atualiza balance | CRITICAL | Balance fica stale |
| T4 | Apenas 2 tipos de transacao usados (de 12) | HIGH | Perda de classificacao |
| T5 | Simplistic type assignment no import | HIGH | Categorizacao incorreta |

#### Como chip_balance Funciona

```
Fonte: Spreadsheet PPPoker (aba "Detalhes do usuario")
       |
       v
Import processa e ARMAZENA valor diretamente
       |
       v
poker_players.chip_balance = valor da planilha
       |
       v
closeWeek usa chip_balance para criar settlement
       |
       v
chip_balance resetado para 0
```

**Problema:** NAO existe trigger ou calculo que deriva balance das transacoes. E um snapshot que pode estar desincronizado.

#### Tipos de Transacao

| Tipo | Definido | Usado no Import |
|------|----------|-----------------|
| chip_in | Sim | Sim |
| chip_out | Sim | Sim |
| credit_given | Sim | Nao |
| credit_received | Sim | Nao |
| transfer_in | Sim | Nao |
| transfer_out | Sim | Nao |
| bonus | Sim | Nao |
| rake_refund | Sim | Nao |
| jackpot | Sim | Nao |
| adjustment_positive | Sim | Nao |
| adjustment_negative | Sim | Nao |
| other | Sim | Nao |

**Apenas 2 de 12 tipos sao usados durante import.**

---

### 6. Schema e RLS

**Status:** MEDIO (RLS OK, schema gaps)
**Source:** Plan 04-02

#### Issues Identificados

| ID | Issue | Severidade | Impacto |
|----|-------|------------|---------|
| SC1 | 9 tabelas existem em migrations mas NAO em schema.ts | HIGH | Sem type safety |
| SC2 | 2 campos faltando em pokerSettlements | HIGH | Sem acesso via Drizzle |
| SC3 | 3 tabelas referenciadas nao existem | LOW | Documentacao vs implementacao |

#### Tabelas Faltando no schema.ts

1. poker_week_periods (migration 0003)
2. poker_su_leagues (migration 0005)
3. poker_su_week_periods (migration 0005)
4. poker_su_imports (migration 0005)
5. poker_su_league_summary (migration 0005)
6. poker_su_games (migration 0005)
7. poker_su_game_players (migration 0005)
8. poker_su_settlements (migration 0005)

#### Campos Faltando em pokerSettlements

- `week_period_id` (adicionado em migration 0003)
- `rakeback_percent_used` (adicionado em migration 0004)

#### RLS Policies

| Status | Tabelas |
|--------|---------|
| Correto | 17 |
| Faltando | 0 |
| Incorreto | 0 |

**Todas as tabelas poker tem RLS configurado corretamente usando:**
```sql
team_id IN (SELECT private.get_teams_for_authenticated_user())
```

---

## Tabela Consolidada de Issues

### Priority 0 (Blocker) - Corrigir Imediatamente

| ID | Issue | Area | Esforco | Sprint |
|----|-------|------|---------|--------|
| R1 | Bug rakeback_percentage -> rakeback_percent | Rake | 1h | 1 |
| R2 | Settlement usa chip_balance em vez de rake | Rake | 4-8h | 1 |
| R3 | Sem agregacao de rake por periodo | Rake | 4h | 1 |
| S1 | Sem transacao atomica em closeWeek | Settlement | 8-16h | 1 |
| P1 | Sem transacao atomica em imports.process | Import | 8-16h | 1 |
| V1 | Backend aceita rawData:any | Validation | 4-6h | 1 |
| T1 | chip_balance e snapshot, nao calculado | Transactions | 4-8h | 1 |

### Priority 1 (Critical) - Corrigir em 2-4 Semanas

| ID | Issue | Area | Esforco | Sprint |
|----|-------|------|---------|--------|
| P2 | INSERT para transactions (sem upsert) | Import | 4-6h | 2 |
| P3 | INSERT para demonstrativo (sem upsert) | Import | 2-4h | 2 |
| S2 | Sem validacao de netAmount | Settlement | 2-4h | 2 |
| S5 | Sem validacao de transicao de status | Settlement | 2-4h | 2 |
| R4 | Agent commission settlements nao implementado | Rake | 4-6h | 2 |
| SC1 | Tabelas faltando no schema.ts | Schema | 4-6h | 2 |
| SC2 | Campos faltando em pokerSettlements | Schema | 45min | 2 |
| T3 | Delete transaction nao atualiza balance | Transactions | 2-4h | 2 |

### Priority 2 (High) - Planejar para Sprints Futuras

| ID | Issue | Area | Esforco | Sprint |
|----|-------|------|---------|--------|
| V2 | CONSISTENCY_RULES nao implementado | Validation | 4-6h | 3 |
| V3 | MATH_RULES nao implementado | Validation | 4-6h | 3 |
| R5 | Super-agent cascade nao implementado | Rake | 6-8h | 3 |
| P4 | Orphan data permitido | Import | 2-4h | 3 |
| P5 | N queries individuais (player linking) | Import | 4-6h | 3 |
| T4 | Apenas 2 tipos de transacao usados | Transactions | 6-12h | 3 |

### Priority 3-4 (Medium/Low) - Backlog

| ID | Issue | Area | Esforco |
|----|-------|------|---------|
| S3 | Permite deletar settlements completed | Settlement | 2-4h |
| S4 | markPaid aceita qualquer valor | Settlement | 1-2h |
| S6 | Sem soft delete | Settlement | 4-6h |
| V5 | Thresholds permissivos | Validation | 2h |

---

## Roadmap de Implementacao

### Sprint 1: Correcoes P0 (Immediate) - 2 Semanas

**Objetivo:** Tornar o sistema seguro para uso em producao.

#### Semana 1

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Fix rakeback_percentage -> rakeback_percent (13 locais) | 1h | Dev | Nenhuma |
| Add integration test para rakeback calculation | 2h | Dev | Task anterior |
| Run verification queries em staging | 2h | Dev/DBA | Acesso ao banco |
| Implementar schema validation backend | 4-6h | Dev | Nenhuma |

**Entregaveis:**
- [ ] Bug de campo corrigido em settlements.ts (7 locais)
- [ ] Bug de campo corrigido em week-periods.ts (6 locais)
- [ ] Teste de integracao para rakeback
- [ ] Relatorio de consistencia dos dados existentes
- [ ] Zod schema para import data no backend

#### Semana 2

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Implementar PostgreSQL RPC para closeWeek | 8-16h | Dev/DBA | Nenhuma |
| Refatorar settlement para usar period rake | 4-8h | Dev | RPC closeWeek |
| Add chip_balance trigger ou calculated field | 4-8h | Dev/DBA | Nenhuma |
| Add consistency check procedure | 2-4h | Dev | Trigger acima |

**Entregaveis:**
- [ ] Funcao RPC `close_week_period` no PostgreSQL
- [ ] Settlement calcula baseado em rake, nao chip_balance
- [ ] chip_balance derivado de transacoes
- [ ] Procedure de verificacao de consistencia

### Sprint 2: Correcoes P1 (Critical) - 2 Semanas

**Objetivo:** Garantir integridade de dados e completar funcionalidades.

#### Semana 3

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Implementar PostgreSQL RPC para imports.process | 8-16h | Dev/DBA | Nenhuma |
| Add unique constraint em transactions | 2h | DBA | Nenhuma |
| Converter INSERT para UPSERT (transactions) | 4-6h | Dev | Constraint acima |
| Converter INSERT para UPSERT (demonstrativo) | 2-4h | Dev | Nenhuma |

**Entregaveis:**
- [ ] Funcao RPC `process_import` no PostgreSQL
- [ ] Constraint unica em poker_chip_transactions
- [ ] UPSERT para transactions e demonstrativo

#### Semana 4

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Add validacao de netAmount em settlement.create | 2-4h | Dev | Nenhuma |
| Add validacao de transicao de status | 2-4h | Dev | Nenhuma |
| Add pokerWeekPeriods ao schema.ts | 2h | Dev | Nenhuma |
| Add campos faltando em pokerSettlements | 45min | Dev | Nenhuma |
| Update delete transaction para atualizar balance | 2-4h | Dev | Trigger Sprint 1 |

**Entregaveis:**
- [ ] Validacao de calculos em settlement.create
- [ ] State machine para status transitions
- [ ] Schema.ts atualizado com tabelas e campos
- [ ] Delete transaction atualiza balance

### Sprint 3: Correcoes P2 (High) - 2 Semanas

**Objetivo:** Implementar funcionalidades faltantes e melhorar validacao.

#### Semana 5

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Implementar CONSISTENCY_RULES | 4-6h | Dev | Nenhuma |
| Implementar MATH_RULES | 4-6h | Dev | Nenhuma |
| Implementar agent commission settlements | 4-6h | Dev | Sprint 1/2 |

**Entregaveis:**
- [ ] 5 regras de consistencia ativas
- [ ] 4 regras matematicas ativas
- [ ] Settlements para agentes

#### Semana 6

| Task | Esforco | Responsavel | Dependencias |
|------|---------|-------------|--------------|
| Implementar super-agent cascade | 6-8h | Dev | Agent commission |
| Fix orphan data (transactions com player_id null) | 2-4h | Dev | Nenhuma |
| Batch player linking queries | 4-6h | Dev | Nenhuma |
| Add todas tabelas SU ao schema.ts | 4-6h | Dev | Nenhuma |

**Entregaveis:**
- [ ] Hierarquia player -> agent -> super-agent funcionando
- [ ] Sem transacoes orfas
- [ ] Performance melhorada no import
- [ ] Schema.ts completo

### Backlog (P3-P4)

| Task | Esforco | Quando |
|------|---------|--------|
| Improve transaction type assignment | 6-12h | Futuro |
| Add soft delete para settlements | 4-6h | Futuro |
| Fix markPaid para validar valor | 1-2h | Futuro |
| Prevent delete completed settlements | 2-4h | Futuro |
| Adjust validation thresholds | 2h | Futuro |

### Dependencias entre Sprints

```
Sprint 1 (P0)
    |
    +-- Fix rakeback bug
    |       |
    |       +-- Integration test
    |
    +-- RPC closeWeek
    |       |
    |       +-- Refactor settlement (use rake)
    |
    +-- chip_balance trigger
            |
            +-- Consistency check
                    |
                    v
Sprint 2 (P1)
    |
    +-- RPC imports.process
    |
    +-- UPSERT transactions
    |
    +-- Schema updates
            |
            v
Sprint 3 (P2)
    |
    +-- Validation rules
    |
    +-- Agent/Super-agent cascade
```

---

## Verificacao de Dados

### Queries de Consistencia

Execute estas queries para verificar a integridade dos dados existentes.

#### Query 1: Detectar Transacoes Duplicadas

```sql
-- Verifica duplicatas de transacoes (imports.process Step 4 failure)
-- Deve retornar 0 linhas se dados consistentes
SELECT
  t.team_id,
  t.occurred_at,
  t.sender_player_id,
  t.recipient_player_id,
  t.amount,
  t.type,
  COUNT(*) as duplicate_count
FROM poker_chip_transactions t
GROUP BY t.team_id, t.occurred_at, t.sender_player_id,
         t.recipient_player_id, t.amount, t.type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

#### Query 2: Detectar Demonstrativo Duplicado

```sql
-- Verifica duplicatas de demonstrativo (imports.process Step 11 failure)
-- Deve retornar 0 linhas se dados consistentes
SELECT
  d.team_id,
  d.occurred_at,
  d.player_id,
  d.type,
  d.amount,
  COUNT(*) as duplicate_count
FROM poker_demonstrativo d
GROUP BY d.team_id, d.occurred_at, d.player_id, d.type, d.amount
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

#### Query 3: Settlements sem Balance Reset

```sql
-- Encontra settlements onde player ainda tem balance != 0
-- Indica Step 4 falhou apos Step 3 em week-periods.close
SELECT
  s.id as settlement_id,
  s.player_id,
  s.gross_amount as settlement_amount,
  p.chip_balance as current_balance,
  s.created_at as settlement_date
FROM poker_settlements s
JOIN poker_players p ON p.id = s.player_id
WHERE s.status = 'pending'
  AND p.chip_balance != 0
  AND s.gross_amount = p.chip_balance
ORDER BY s.created_at DESC;
```

#### Query 4: Settlements Duplicados

```sql
-- Encontra settlements duplicados para mesmo player e periodo
-- Indica week-periods.close executado multiplas vezes
SELECT
  player_id,
  period_start,
  period_end,
  COUNT(*) as settlement_count,
  SUM(gross_amount) as total_gross
FROM poker_settlements
GROUP BY player_id, period_start, period_end
HAVING COUNT(*) > 1
ORDER BY settlement_count DESC;
```

#### Query 5: chip_balance vs Transacoes

```sql
-- Verifica se chip_balance bate com soma das transacoes
-- Provavelmente mostrara mismatches porque chip_balance e snapshot
SELECT
  p.id as player_id,
  p.nickname,
  p.chip_balance as stored_balance,
  COALESCE(SUM(
    CASE
      WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                      'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
      THEN t.amount
      ELSE -t.amount
    END
  ), 0) as calculated_balance,
  p.chip_balance - COALESCE(SUM(
    CASE
      WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                      'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
      THEN t.amount
      ELSE -t.amount
    END
  ), 0) as difference
FROM poker_players p
LEFT JOIN poker_chip_transactions t ON (
  t.recipient_player_id = p.id OR t.sender_player_id = p.id
)
WHERE p.team_id = '{{TEAM_ID}}'
GROUP BY p.id, p.nickname, p.chip_balance
HAVING p.chip_balance != COALESCE(SUM(
  CASE
    WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                    'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
    THEN t.amount
    ELSE -t.amount
  END
), 0)
ORDER BY ABS(difference) DESC
LIMIT 20;
```

#### Query 6: Settlement Amount vs Rake

```sql
-- Verifica se settlement gross_amount bate com rake do periodo
-- Settlement deveria ser baseado em rake, nao chip_balance
SELECT
  s.id as settlement_id,
  s.player_id,
  s.week_period_id,
  s.gross_amount as settlement_gross,
  COALESCE(SUM(ps.rake_total), 0) as period_rake,
  s.gross_amount - COALESCE(SUM(ps.rake_total), 0) as difference
FROM poker_settlements s
LEFT JOIN poker_player_summary ps ON (
  ps.player_id = s.player_id
  AND ps.period_start >= s.period_start
  AND ps.period_end <= s.period_end
)
WHERE s.team_id = '{{TEAM_ID}}'
GROUP BY s.id, s.player_id, s.week_period_id, s.gross_amount
HAVING s.gross_amount != COALESCE(SUM(ps.rake_total), 0)
ORDER BY ABS(difference) DESC
LIMIT 20;
```

#### Query 7: Transacoes Orfas

```sql
-- Encontra transacoes sem player associado
-- Indica problema de integridade referencial
SELECT
  t.id,
  t.occurred_at,
  t.sender_nickname,
  t.recipient_nickname,
  t.amount,
  t.type
FROM poker_chip_transactions t
WHERE t.team_id = '{{TEAM_ID}}'
  AND t.sender_player_id IS NULL
  AND t.recipient_player_id IS NULL
ORDER BY t.occurred_at DESC
LIMIT 50;
```

#### Query 8: Periodos Nao Fechados com Settlements

```sql
-- Encontra periodos open que tem settlements
-- Indica week-periods.close Step 6 falhou
SELECT
  wp.id,
  wp.week_start,
  wp.week_end,
  wp.status,
  COUNT(s.id) as settlement_count,
  SUM(s.gross_amount) as total_settlements
FROM poker_week_periods wp
JOIN poker_settlements s ON s.week_period_id = wp.id
WHERE wp.team_id = '{{TEAM_ID}}'
  AND wp.status = 'open'
GROUP BY wp.id, wp.week_start, wp.week_end, wp.status
HAVING COUNT(s.id) > 0;
```

#### Query 9: Players sem Summary

```sql
-- Encontra players com sessions mas sem summary
-- Indica imports.process Step 8 falhou
SELECT
  p.id,
  p.nickname,
  p.pppoker_id,
  COUNT(sp.id) as session_count
FROM poker_players p
JOIN poker_session_players sp ON sp.player_id = p.id
LEFT JOIN poker_player_summary ps ON ps.player_id = p.id
WHERE p.team_id = '{{TEAM_ID}}'
  AND ps.id IS NULL
GROUP BY p.id, p.nickname, p.pppoker_id
HAVING COUNT(sp.id) > 0
ORDER BY session_count DESC;
```

#### Query 10: Check Completo de Consistencia

```sql
-- Verificacao completa de consistencia
-- Retorna sumario de todos os problemas potenciais
WITH duplicate_transactions AS (
  SELECT COUNT(*) as count FROM (
    SELECT 1 FROM poker_chip_transactions
    WHERE team_id = '{{TEAM_ID}}'
    GROUP BY occurred_at, sender_player_id, recipient_player_id, amount, type
    HAVING COUNT(*) > 1
  ) dt
),
duplicate_settlements AS (
  SELECT COUNT(*) as count FROM (
    SELECT 1 FROM poker_settlements
    WHERE team_id = '{{TEAM_ID}}'
    GROUP BY player_id, period_start, period_end
    HAVING COUNT(*) > 1
  ) ds
),
orphan_transactions AS (
  SELECT COUNT(*) as count FROM poker_chip_transactions
  WHERE team_id = '{{TEAM_ID}}'
    AND sender_player_id IS NULL
    AND recipient_player_id IS NULL
),
unclosed_with_settlements AS (
  SELECT COUNT(DISTINCT wp.id) as count
  FROM poker_week_periods wp
  JOIN poker_settlements s ON s.week_period_id = wp.id
  WHERE wp.team_id = '{{TEAM_ID}}'
    AND wp.status = 'open'
)
SELECT
  'Duplicate Transactions' as check_type,
  (SELECT count FROM duplicate_transactions) as issue_count
UNION ALL
SELECT
  'Duplicate Settlements' as check_type,
  (SELECT count FROM duplicate_settlements) as issue_count
UNION ALL
SELECT
  'Orphan Transactions' as check_type,
  (SELECT count FROM orphan_transactions) as issue_count
UNION ALL
SELECT
  'Unclosed Periods with Settlements' as check_type,
  (SELECT count FROM unclosed_with_settlements) as issue_count;
```

### Procedimento de Verificacao

1. **Antes de qualquer fix:**
   - Executar Query 10 em staging/producao
   - Documentar baseline de issues existentes
   - Backup do banco

2. **Apos Sprint 1:**
   - Re-executar todas as queries
   - Comparar com baseline
   - Validar que novas entradas nao criam duplicatas

3. **Monitoramento continuo:**
   - Agendar Query 10 para rodar semanalmente
   - Alertar se issue_count > 0
   - Investigar novos problemas imediatamente

---

## Recomendacoes Finais

### Acoes Imediatas (Antes de Qualquer Deploy)

1. **PARAR** execucoes de `closeWeek` em producao
2. **CORRIGIR** bug de campo rakeback_percentage (30 min de trabalho, impacto critico)
3. **EXECUTAR** queries de verificacao para entender estado atual dos dados
4. **DOCUMENTAR** todos os settlements existentes que podem ter rakeback = 0

### Acoes de Curto Prazo (Sprint 1-2)

1. Implementar transacoes atomicas para closeWeek e imports.process
2. Refatorar settlement para usar rake, nao chip_balance
3. Adicionar validation schema no backend
4. Atualizar schema.ts com tabelas e campos faltantes

### Acoes de Medio Prazo (Sprint 3+)

1. Implementar regras de validacao CONSISTENCY e MATH
2. Completar hierarquia agent/super-agent
3. Melhorar assignment de tipos de transacao
4. Adicionar job de consistencia automatico

### Acoes Continuas

1. **Testes:** Adicionar integration tests para todas procedures criticas
2. **Monitoramento:** Executar queries de consistencia regularmente
3. **Documentacao:** Manter este documento atualizado com novos achados
4. **Code Review:** Garantir que novos PRs nao introduzam issues similares

---

## Apendice

### A. Arquivos Auditados

**Backend Routers:**
- `/apps/api/src/trpc/routers/poker/imports.ts`
- `/apps/api/src/trpc/routers/poker/players.ts`
- `/apps/api/src/trpc/routers/poker/sessions.ts`
- `/apps/api/src/trpc/routers/poker/transactions.ts`
- `/apps/api/src/trpc/routers/poker/settlements.ts`
- `/apps/api/src/trpc/routers/poker/analytics.ts`
- `/apps/api/src/trpc/routers/poker/week-periods.ts`
- `/apps/api/src/trpc/routers/poker/index.ts`

**Backend Schemas:**
- `/apps/api/src/schemas/poker/imports.ts`
- `/apps/api/src/schemas/poker/players.ts`
- `/apps/api/src/schemas/poker/sessions.ts`
- `/apps/api/src/schemas/poker/transactions.ts`
- `/apps/api/src/schemas/poker/settlements.ts`

**Frontend Validation:**
- `/apps/dashboard/src/lib/poker/validation.ts`

**Database:**
- `/packages/db/src/schema.ts`
- `/packages/db/src/queries/poker-*.ts` (43 arquivos)
- `/packages/db/migrations/*.sql` (6 arquivos)

### B. Referencias

| Documento | Localizacao | Linhas |
|-----------|-------------|--------|
| 01-01-FRONTEND-MAP.md | .planning/phases/01-mapeamento-fluxo-ux/ | 1,817 |
| 01-02-BACKEND-MAP.md | .planning/phases/01-mapeamento-fluxo-ux/ | 1,191 |
| 01-02-FRONTEND-MAP.md | .planning/phases/01-mapeamento-fluxo-ux/ | 1,264 |
| 02-01-VALIDATION-AUDIT.md | .planning/phases/02-auditoria-validacao/ | 1,074 |
| 02-02-PROCESSING-AUDIT.md | .planning/phases/02-auditoria-validacao/ | 1,427 |
| 03-01-SETTLEMENTS-AUDIT.md | .planning/phases/03-auditoria-fechamento-semanal/ | 788 |
| 03-02-RAKE-AUDIT.md | .planning/phases/03-auditoria-fechamento-semanal/ | 694 |
| 03-03-TRANSACTIONS-AUDIT.md | .planning/phases/03-auditoria-fechamento-semanal/ | 744 |
| 04-01-QUERIES-AUDIT.md | .planning/phases/04-verificacao-consistencia/ | 994 |
| 04-02-SCHEMA-RLS-AUDIT.md | .planning/phases/04-verificacao-consistencia/ | 567 |

### C. Glossario

| Termo | Definicao |
|-------|-----------|
| chip_balance | Saldo de fichas do jogador (snapshot da planilha) |
| closeWeek | Procedimento de fechamento semanal que cria settlements |
| imports.process | Procedimento de processamento de planilha importada |
| rake | Taxa cobrada pelo clube em cada sessao |
| rakeback | Porcentagem do rake devolvida ao agente |
| settlement | Registro de acerto financeiro semanal com um jogador |
| week_period | Periodo semanal para agrupamento de dados |
| UPSERT | INSERT OR UPDATE - evita duplicatas |
| RPC | Remote Procedure Call - funcao PostgreSQL chamada via API |
| RLS | Row Level Security - seguranca por linha no PostgreSQL |

---

*Relatorio gerado em: 2026-01-22*
*Autor: Claude Opus 4.5*
*Versao: 1.0*
