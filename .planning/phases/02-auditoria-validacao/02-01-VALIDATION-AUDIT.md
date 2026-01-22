# Auditoria de Validacao de Planilhas PPPoker

**Data:** 2026-01-22
**Escopo:** Analise completa das regras de validacao frontend e backend para importacao de planilhas PPPoker

---

## Executive Summary

### Visao Geral
- **Total de regras frontend auditadas:** 15 regras implementadas (11 structure + 4 integrity)
- **Total de regras backend auditadas:** 2 validacoes explicitas + validacoes implicitas
- **Gaps criticos identificados:** 6
- **Risco geral:** ALTO - Backend possui validacao minima comparada ao frontend

### Resumo de Risco

| Area | Status | Severidade |
|------|--------|------------|
| Paridade Frontend-Backend | GAP CRITICO | Critical |
| Regras de Consistencia | NAO IMPLEMENTADAS | Critical |
| Regras Matematicas | NAO IMPLEMENTADAS | Critical |
| Edge Cases | PARCIALMENTE COBERTOS | High |
| Validacao de Dados | OK no frontend | Medium |

---

## Parte 1: Auditoria de Regras Frontend

### Localizacao
- **Arquivo:** `apps/dashboard/src/lib/poker/validation.ts`
- **Linhas:** ~1,434 linhas
- **Tipos:** `apps/dashboard/src/lib/poker/types.ts`

### Arquitetura de Validacao

O sistema frontend usa uma arquitetura baseada em regras:

```typescript
interface ValidationRule {
  id: string;
  category: CheckCategory;  // "structure" | "integrity" | "consistency" | "math"
  severity: CheckSeverity;  // "critical" | "warning" | "info"
  label: string;
  description: string;
  validate: (data: ParsedImportData) => ValidationRuleResult;
}
```

---

## Categoria 1: STRUCTURE RULES (11 regras)

### Regra 1.1: geral_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `geral_sheet_present` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Aba Geral presente |
| **Descricao** | A aba Geral deve conter dados de jogadores |

**Implementacao:**
```typescript
validate: (data) => {
  const count = data.summaries?.length ?? 0;
  return { passed: count > 0, ... };
}
```

**Inputs:** `data.summaries` (array de ParsedSummary)
**Outputs:** passed/failed com contagem de jogadores
**Edge Cases Cobertos:**
- [x] Array vazio
- [x] Array undefined/null
- [ ] Array com registros invalidos (nao verificado)

**Status:** OK - Regra implementada corretamente

---

### Regra 1.2: geral_columns_complete
| Campo | Valor |
|-------|-------|
| **ID** | `geral_columns_complete` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Colunas da aba Geral completas (48 cols) |
| **Descricao** | A aba Geral deve ter todas as 48 colunas (B-AV) |

**Implementacao:**
- Verifica 26 campos obrigatorios no primeiro registro
- Campos verificados: ppPokerId, nickname, generalTotal, ringGamesTotal, mttSitNGoTotal, feeGeneral, fee, feePpst, feeNonPpst, feePpsr, feeNonPpsr, spinUpBuyIn, spinUpPrize, caribbeanBets, caribbeanPrize, colorGameBets, colorGamePrize, crashBets, crashPrize, luckyDrawBets, luckyDrawPrize, jackpotFee, jackpotPrize, evSplit, ticketDeliveredValue, ticketDeliveredBuyIn

**Inputs:** `data.summaries[0]` (primeiro registro)
**Outputs:** passed/failed com contagem de campos presentes/faltantes
**Edge Cases:**
- [x] Array vazio retorna false
- [ ] Verifica APENAS primeiro registro (se houver registros com campos faltando apos o primeiro, nao detecta)
- [ ] Nao valida TIPO dos valores, apenas existencia

**Gap Identificado:** Valida apenas existencia de campos no primeiro registro, nao consistencia em todos os registros.

**Status:** WARNING - Cobertura incompleta

---

### Regra 1.3: detalhado_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `detalhado_sheet_present` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Aba Detalhado presente |
| **Descricao** | A aba Detalhado deve conter breakdown por tipo de jogo |

**Implementacao:**
```typescript
validate: (data) => {
  const count = data.detailed?.length ?? 0;
  return { passed: count > 0, ... };
}
```

**Status:** OK - Regra implementada corretamente

---

### Regra 1.4: detalhado_columns_complete
| Campo | Valor |
|-------|-------|
| **ID** | `detalhado_columns_complete` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Colunas da aba Detalhado completas (137 cols) |
| **Descricao** | A aba Detalhado deve ter os campos criticos das 137 colunas (A-EG) |

**Implementacao:**
- Verifica 40 campos obrigatorios no primeiro registro
- Threshold: >= 35 de 40 campos (87.5%)
- Campos verificados incluem: identificacao, ganhos NLH/PLO, cassino, totais, classificacoes, taxa total, spinup, jackpot, ev split, fichas, credito, maos

**Edge Cases:**
- [x] Array vazio retorna false
- [ ] Verifica APENAS primeiro registro
- [ ] Threshold de 87.5% pode permitir dados incompletos

**Status:** WARNING - Threshold pode ser muito permissivo

---

### Regra 1.5: transactions_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `transactions_sheet_present` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Aba Transacoes presente (21 cols) |
| **Descricao** | A aba Transacoes deve ter todas as 21 colunas (A-U) |

**Implementacao:**
- Verifica 21 campos obrigatorios: occurredAt, senderClubId, senderPlayerId, senderNickname, senderMemoName, recipientPlayerId, recipientNickname, recipientMemoName, creditSent, creditRedeemed, creditLeftClub, chipsSent, classificationPpsr, classificationRing, classificationCustomRing, classificationMtt, chipsRedeemed, chipsLeftClub, ticketSent, ticketRedeemed, ticketExpired
- Threshold: >= 18 de 21 campos (85.7%)

**Edge Cases:**
- [x] Array vazio retorna false
- [ ] Threshold pode permitir dados incompletos

**Status:** WARNING - Threshold pode ser muito permissivo

---

### Regra 1.6: user_details_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `user_details_sheet_present` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Aba Detalhes do usuario presente (12 cols) |
| **Descricao** | A aba Detalhes do usuario deve ter todas as 12 colunas (A-L) |

**Implementacao:**
- Verifica 12 campos obrigatorios: lastActiveAt, ppPokerId, country, nickname, memoName, chipBalance, agentNickname, agentPpPokerId, agentCreditBalance, superAgentNickname, superAgentPpPokerId, superAgentCreditBalance
- Threshold: >= 10 de 12 campos (83.3%)

**Status:** WARNING - Threshold pode ser muito permissivo

---

### Regra 1.7: partidas_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `partidas_sheet_present` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Aba Partidas presente |
| **Descricao** | A aba Partidas deve conter dados de sessoes |

**Implementacao:**
```typescript
validate: (data) => {
  const count = data.sessions?.length ?? 0;
  return { passed: count > 0, ... };
}
```

**Status:** OK - Regra implementada corretamente

---

### Regra 1.8: partidas_structure_valid
| Campo | Valor |
|-------|-------|
| **ID** | `partidas_structure_valid` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Estrutura das Partidas valida |
| **Descricao** | Cada sessao deve ter estrutura correta por tipo (CASH 14 cols, MTT/SITNG 8 cols, SPIN 7 cols) |

**Implementacao Detalhada:**
```typescript
for (const session of sessions) {
  const type = session.sessionType?.toLowerCase() || "";
  const hasBasicFields = session.externalId && session.startedAt;

  if (type === "cash_game" || type === "ring" || type.includes("ppsr")) {
    // CASH: precisa de buyIn e hands
    const hasCashFields = "buyIn" in player && "hands" in player;
  } else if (type === "mtt" || type === "sit_n_go" || type === "sng") {
    // MTT/SITNG: precisa de ranking, buyInChips ou buyInTicket
    const hasMttFields = "ranking" in player || "buyInChips" in player || "buyInTicket" in player;
  } else if (type === "spin" || type.includes("spinup")) {
    // SPIN: precisa de ranking, buyInChips ou prize
    const hasSpinFields = "ranking" in player || "buyInChips" in player || "prize" in player;
  }
}
```

**Edge Cases:**
- [x] Sessoes sem players sao aceitas
- [x] Valida campos basicos (externalId, startedAt)
- [ ] Tipos de sessao com case diferente podem falhar (parcialmente tratado com toLowerCase)
- [ ] Logica usa "||" permitindo que qualquer um dos campos exista (pode ser muito permissivo)

**Gap Identificado:** Para MTT/SITNG e SPIN, a validacao usa OR em vez de AND, permitindo registros incompletos.

**Status:** WARNING - Logica de validacao permissiva demais

---

### Regra 1.9: rakeback_sheet_present
| Campo | Valor |
|-------|-------|
| **ID** | `rakeback_sheet_present` |
| **Categoria** | structure |
| **Severidade** | WARNING |
| **Label** | Aba Retorno de taxa presente |
| **Descricao** | A aba Retorno de taxa deve conter dados de agentes |

**Implementacao:**
```typescript
validate: (data) => {
  const count = data.rakebacks?.length ?? 0;
  return { passed: count > 0, ... };
}
```

**Status:** OK - Regra implementada corretamente (warning, nao bloqueia)

---

### Regra 1.10: rakeback_columns_complete
| Campo | Valor |
|-------|-------|
| **ID** | `rakeback_columns_complete` |
| **Categoria** | structure |
| **Severidade** | WARNING |
| **Label** | Colunas da aba Retorno de taxa completas (7 cols) |
| **Descricao** | A aba Retorno de taxa deve ter os 7 campos obrigatorios (B-H) |

**Implementacao:**
- Campos verificados: superAgentPpPokerId, agentPpPokerId, country, agentNickname, memoName, averageRakebackPercent, totalRt
- Threshold: >= 5 de 7 campos
- Se array vazio, retorna TRUE (aba opcional)

**Status:** OK - Comportamento correto para aba opcional

---

### Regra 1.11: period_detected
| Campo | Valor |
|-------|-------|
| **ID** | `period_detected` |
| **Categoria** | structure |
| **Severidade** | CRITICAL |
| **Label** | Periodo identificado |
| **Descricao** | O periodo da planilha deve ser detectado corretamente |

**Implementacao:**
```typescript
validate: (data) => {
  const hasStart = Boolean(data.periodStart);
  const hasEnd = Boolean(data.periodEnd);
  const both = hasStart && hasEnd;

  const start = new Date(data.periodStart!);
  const end = new Date(data.periodEnd!);
  const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  return { passed: days > 0 && days <= 31, ... };
}
```

**Edge Cases:**
- [x] Verifica existencia de periodStart e periodEnd
- [x] Valida que periodo tem entre 1 e 31 dias
- [ ] Nao valida formato da data (assume que Date.parse funcionara)
- [ ] Nao trata datas invalidas (Invalid Date)

**Gap Identificado:** Se periodStart/periodEnd contiverem strings invalidas, `new Date()` retorna Invalid Date mas o codigo continua executando.

**Status:** WARNING - Falta tratamento de datas invalidas

---

## Categoria 2: INTEGRITY RULES (4 regras)

### Regra 2.1: player_ids_valid
| Campo | Valor |
|-------|-------|
| **ID** | `player_ids_valid` |
| **Categoria** | integrity |
| **Severidade** | CRITICAL |
| **Label** | IDs de jogadores validos |
| **Descricao** | Todos os IDs de jogadores devem ser numericos |

**Implementacao:**
```typescript
function collectAllPlayerIds(data: ParsedImportData): string[] {
  const ids: string[] = [];
  for (const p of data.players || []) ids.push(p.ppPokerId);
  for (const s of data.summaries || []) ids.push(s.ppPokerId);
  for (const d of data.detailed || []) ids.push(d.ppPokerId);
  // ... sessions, transactions, demonstrativo

  // Filtra valores invalidos
  const invalidPatterns = ["/", "-", "none", "(none)", "null", "undefined", ""];
  return [...new Set(ids.filter(id => {
    if (!id) return false;
    const normalized = String(id).trim().toLowerCase();
    if (invalidPatterns.includes(normalized)) return false;
    return /\d/.test(id);  // Precisa ter pelo menos um digito
  }))];
}

// Validacao: todos os IDs devem ser apenas digitos
const invalidIds = allIds.filter((id) => !id || !/^\d+$/.test(id));
```

**Edge Cases Cobertos:**
- [x] IDs nulos/undefined
- [x] IDs vazios
- [x] Padroes invalidos conhecidos ("/", "-", "none", etc)
- [x] IDs com caracteres nao-numericos

**Status:** OK - Implementacao robusta

---

### Regra 2.2: numeric_values_valid
| Campo | Valor |
|-------|-------|
| **ID** | `numeric_values_valid` |
| **Categoria** | integrity |
| **Severidade** | CRITICAL |
| **Label** | Valores numericos validos |
| **Descricao** | Todos os valores monetarios devem ser numeros validos |

**Implementacao:** `countNumericErrorsWithDetails(data)`

**Campos Verificados:**
- players: chipBalance, agentCreditBalance
- summaries: generalTotal, feeGeneral
- detailed: totalWinnings
- demonstrativo: amount
- transactions: chipsSent, creditSent
- rakebacks: averageRakebackPercent, totalRt

**Validacao:**
```typescript
if (typeof value !== "number" || isNaN(value)) {
  errors++;
}
```

**Edge Cases:**
- [x] Valores nao-numericos
- [x] NaN
- [ ] Valores negativos (nao validado, mas pode ser valido em alguns casos)
- [ ] Valores extremamente grandes/pequenos

**Status:** OK - Verifica tipo e NaN

---

### Regra 2.3: dates_valid
| Campo | Valor |
|-------|-------|
| **ID** | `dates_valid` |
| **Categoria** | integrity |
| **Severidade** | CRITICAL |
| **Label** | Datas validas |
| **Descricao** | Todas as datas devem poder ser interpretadas |

**Implementacao:** `countDateErrorsWithDetails(data)`

**Campos Verificados:**
- players: lastActiveAt
- transactions: occurredAt
- demonstrativo: occurredAt
- sessions: startedAt, endedAt

**Validacao:**
```typescript
if (field && isNaN(Date.parse(field))) {
  errors++;
}
```

**Edge Cases:**
- [x] Datas vazias (puladas)
- [x] Datas que nao podem ser parseadas
- [ ] Datas no futuro (nao validado)
- [ ] Datas muito antigas (nao validado)
- [ ] Formato de data inconsistente entre registros

**Status:** OK - Validacao basica funciona

---

### Regra 2.4: no_duplicate_transactions
| Campo | Valor |
|-------|-------|
| **ID** | `no_duplicate_transactions` |
| **Categoria** | integrity |
| **Severidade** | CRITICAL |
| **Label** | Sem transacoes duplicadas |
| **Descricao** | Nao deve haver transacoes duplicadas |

**Implementacao:**
```typescript
function findDuplicateTransactionsWithDetails(transactions: ParsedTransaction[]) {
  const seen = new Map<string, number>();
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const key = `${t.occurredAt}_${t.senderPlayerId}_${t.recipientPlayerId}_${t.creditSent}_${t.chipsSent}_${t.ticketSent}`;
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.set(key, i);
    }
  }
}
```

**Chave de Duplicacao:** occurredAt + senderPlayerId + recipientPlayerId + creditSent + chipsSent + ticketSent

**Edge Cases:**
- [x] Detecta duplicatas exatas
- [ ] Nao detecta duplicatas com pequenas variacoes (ex: mesmo valor em horarios ligeiramente diferentes)
- [ ] Nao considera chipsRedeemed, creditRedeemed na chave

**Status:** OK - Funciona para duplicatas exatas

---

## Categoria 3: CONSISTENCY RULES (NAO IMPLEMENTADAS)

**STATUS: NAO IMPLEMENTADAS**

```typescript
const CONSISTENCY_RULES: ValidationRule[] = [];
// Comentario no codigo: "TODO: implementar corretamente"
```

**Regras Definidas nos Tipos mas NAO Implementadas:**
- `player_count_consistent` - Contagem de jogadores consistente entre abas
- `player_ids_match_between_sheets` - IDs de jogadores devem existir em todas as abas relevantes
- `win_loss_distribution_valid` - Distribuicao de ganhos/perdas deve ser valida
- `user_details_players_in_geral` - Jogadores em Detalhes do usuario devem estar em Geral
- `agents_have_rakeback` - Agentes devem ter dados de rakeback

**GAP CRITICO:** Nenhuma validacao de consistencia entre abas esta implementada.

---

## Categoria 4: MATH RULES (NAO IMPLEMENTADAS)

**STATUS: NAO IMPLEMENTADAS**

```typescript
const MATH_RULES: ValidationRule[] = [];
// Comentario no codigo: "TODO: implementar corretamente"
```

**Regras Definidas nos Tipos mas NAO Implementadas:**
- `game_totals_sum_to_general` - Soma dos tipos de jogo deve igualar total geral
- `fee_totals_valid` - Soma das taxas deve igualar taxa total
- `partidas_values_valid` - Valores das partidas devem ser matematicamente validos
- `transaction_balances_coherent` - Balancos de transacoes devem ser coerentes

**GAP CRITICO:** Nenhuma validacao matematica esta implementada. Isso significa que:
- Planilhas com totais incorretos serao aceitas
- Inconsistencias numericas nao serao detectadas
- Erros de calculo no PPPoker passarao despercebidos

---

## Parte 2: Auditoria de Validacao Backend

### Localizacao
- **Router:** `apps/api/src/trpc/routers/poker/imports.ts` (~1,667 linhas)
- **Schemas:** `apps/api/src/schemas/poker/imports.ts` (~149 linhas)

### Arquitetura Backend

O backend possui 6 procedures no router `pokerImportsRouter`:

| Procedure | Metodo | Validacao | Descricao |
|-----------|--------|-----------|-----------|
| `get` | query | Nenhuma | Lista imports com paginacao |
| `getById` | query | UUID | Busca import por ID |
| `create` | mutation | Schema basico | Cria registro de import |
| `validate` | mutation | MINIMA | Valida dados do import |
| `process` | mutation | Status check | Processa import validado |
| `cancel` | mutation | Status check | Cancela import pendente |

### Fluxo de Validacao Backend

```
create() -> validate() -> process()
    |           |            |
    v           v            v
rawData:any  2 checks    12 STEPs
             apenas       (DB ops)
```

### Validacoes Explicitas no Backend

#### Procedure: validate

```typescript
validate: protectedProcedure
  .input(validatePokerImportSchema)
  .mutation(async ({ input, ctx: { teamId } }) => {
    // ...

    // Validation checks
    if (totalPlayers === 0 && totalTransactions === 0 && totalSessions === 0) {
      errors.push("No data found in the import file");
    }

    if (newPlayers > 100) {
      warnings.push(`${newPlayers} new players will be created`);
    }

    const validationPassed = errors.length === 0;
  });
```

**Validacoes Backend Explicitas:**
1. **Dados vazios:** Se nao houver players, transactions ou sessions, falha
2. **Muitos novos jogadores:** Warning se > 100 novos jogadores (nao blocking)

**ISSO E TUDO!** O backend nao executa nenhuma das 15 validacoes do frontend.

---

### Validacoes Implicitas (Database/Schema)

#### Zod Schemas (apps/api/src/schemas/poker/imports.ts)

**createPokerImportSchema:**
```typescript
z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  sourceType: pokerImportSourceTypeSchema.optional().default("club"),
  rawData: z.any(), // PROBLEMA: aceita qualquer coisa!
})
```

**Parsed Data Schemas (definidos mas NAO usados para validacao):**
```typescript
parsedPlayerSchema = z.object({
  ppPokerId: z.string(),
  nickname: z.string(),
  memoName: z.string().nullable().optional(),
  // ...
})
```

**GAP CRITICO:** `rawData: z.any()` - O backend aceita QUALQUER estrutura de dados sem validacao.

---

### Analise Detalhada da Procedure `process`

A procedure `process` tem 12 steps de processamento (linhas 378-1614):

| Step | Descricao | Validacao |
|------|-----------|-----------|
| 0 | Criar week period | Nenhuma |
| 1 | Upsert players (Detalhes) | Deduplica por pppoker_id |
| 2 | Extrair agents de summaries | Nenhuma |
| 2.5 | Upsert players de summaries | Deduplica por pppoker_id |
| 2.6 | Upsert players de sessions | Deduplica por pppoker_id |
| 3 | Construir player ID map | Nenhuma |
| 3.5 | Linkar players a agents | Nenhuma |
| 4 | Insert transactions | Filtra timestamps invalidos |
| 5 | Upsert sessions | Filtra timestamps invalidos |
| 6 | Construir session ID map | Nenhuma |
| 7 | Upsert session players | Deduplica por session_id+player_id |
| 8 | Upsert player summaries | Deduplica por player_id |
| 9 | Upsert player detailed | Deduplica por player_id+date |
| 10 | Upsert agent rakeback | Deduplica por agent_pppoker_id |
| 11 | Insert demonstrativo | Filtra registros sem data/player |
| 12 | Calculate activity metrics | Nenhuma |

**Observacoes:**
- Nenhuma validacao de integridade de dados antes de inserir
- Erros de constraint so aparecem durante insercao
- Deduplicacao e feita localmente mas nao valida consistencia

---

### Validacoes de Database (Constraints)

Durante `process`, o backend faz upserts com `onConflict`:

```typescript
// Players
.upsert(batch, { onConflict: "pppoker_id,team_id" })

// Sessions
.upsert(batch, { onConflict: "external_id,team_id" })

// Session players
.upsert(batch, { onConflict: "session_id,player_id" })

// Summaries
.upsert(batch, { onConflict: "player_id,period_start,period_end" })
```

**Validacoes Implicitas via Database:**
- `pppoker_id` + `team_id` devem ser unicos (players)
- `external_id` + `team_id` devem ser unicos (sessions)
- Foreign keys sao verificadas (player_id deve existir)
- NOT NULL constraints

**Problema:** Erros de constraint so aparecem DURANTE o processamento, nao na fase de validacao.

---

## Parte 3: Matriz de Paridade Frontend-Backend

| # | Regra | ID | Frontend | Backend | Paridade | Risco |
|---|-------|-----|----------|---------|----------|-------|
| 1 | Aba Geral presente | geral_sheet_present | CRITICAL | - | **GAP** | CRITICAL |
| 2 | Colunas Geral completas | geral_columns_complete | CRITICAL | - | **GAP** | HIGH |
| 3 | Aba Detalhado presente | detalhado_sheet_present | CRITICAL | - | **GAP** | CRITICAL |
| 4 | Colunas Detalhado completas | detalhado_columns_complete | CRITICAL | - | **GAP** | HIGH |
| 5 | Aba Transacoes presente | transactions_sheet_present | CRITICAL | - | **GAP** | CRITICAL |
| 6 | Aba Detalhes usuario presente | user_details_sheet_present | CRITICAL | - | **GAP** | CRITICAL |
| 7 | Aba Partidas presente | partidas_sheet_present | CRITICAL | - | **GAP** | CRITICAL |
| 8 | Estrutura Partidas valida | partidas_structure_valid | CRITICAL | - | **GAP** | HIGH |
| 9 | Aba Rakeback presente | rakeback_sheet_present | WARNING | - | **GAP** | MEDIUM |
| 10 | Colunas Rakeback completas | rakeback_columns_complete | WARNING | - | **GAP** | LOW |
| 11 | Periodo identificado | period_detected | CRITICAL | - | **GAP** | HIGH |
| 12 | IDs validos | player_ids_valid | CRITICAL | - | **GAP** | CRITICAL |
| 13 | Valores numericos | numeric_values_valid | CRITICAL | - | **GAP** | CRITICAL |
| 14 | Datas validas | dates_valid | CRITICAL | - | **GAP** | HIGH |
| 15 | Sem duplicatas | no_duplicate_transactions | CRITICAL | - | **GAP** | HIGH |
| 16 | Dados nao vazios | - | - | CHECK | Backend-only | LOW |
| 17 | Muitos novos jogadores | - | - | WARNING | Backend-only | INFO |

### Analise de Gaps

**GAPS CRITICOS (Risco de dados corrompidos):**

1. **Nenhuma validacao frontend e replicada no backend**
   - Se um cliente malicioso pular o frontend, pode enviar dados invalidos diretamente
   - O backend aceita `rawData: z.any()` sem verificacao
   - **Vetor de ataque:** Chamada direta a API com dados malformados

2. **Validacoes de consistencia nao existem**
   - Jogadores podem estar em uma aba mas nao em outras
   - Nenhuma verificacao de integridade referencial antes do processamento
   - **Exemplo:** Player em sessions mas nao em summaries passa despercebido

3. **Validacoes matematicas nao existem**
   - Totais podem nao bater
   - Rake pode nao corresponder aos jogos
   - Saldos podem estar errados
   - **Impacto financeiro:** Settlements calculados incorretamente

4. **Ordem de execucao vulneravel**
   - Frontend valida ANTES de enviar para backend
   - Backend NAO revalida ao receber
   - Se frontend for alterado/bypassed, dados invalidos entram no sistema

### Diagramas de Fluxo de Validacao

**Frontend:**
```
Upload → Parse → 15 validacoes → hasBlockingErrors? → Preview → Approve → API
                      ↓
              [STRUCTURE: 11]
              [INTEGRITY: 4]
              [CONSISTENCY: 0] ← TODO
              [MATH: 0] ← TODO
```

**Backend:**
```
create(rawData:any) → validate(2 checks) → process(12 steps)
                            ↓                    ↓
                      [vazio?]              [DB errors]
                      [>100 new?]           [late catch]
```

---

## Parte 4: Edge Cases Nao Cobertos

### 4.1 Edge Cases de Estrutura

| Edge Case | Coberto? | Impacto |
|-----------|----------|---------|
| Planilha com aba extra desconhecida | Sim (ignorada) | Baixo |
| Aba com nome ligeiramente diferente | Nao | Alto - falha silenciosa |
| Colunas em ordem diferente | Depende do parser | Medio |
| Valores com espacos em branco | Nao | Medio |
| Unicode em nomes | Parcial | Baixo |

### 4.2 Edge Cases de Dados

| Edge Case | Coberto? | Impacto |
|-----------|----------|---------|
| ID com zeros a esquerda | Nao | Alto - "00123" != "123" |
| Valores monetarios com virgula | Nao | Alto - parsing incorreto |
| Datas em formatos diferentes | Parcial | Medio |
| Valores negativos onde nao deveriam | Nao | Medio |
| Valores extremamente grandes | Nao | Baixo |
| Caracteres especiais em memos | Nao | Baixo |

### 4.3 Edge Cases de Integridade

| Edge Case | Coberto? | Impacto |
|-----------|----------|---------|
| Jogador em Geral mas nao em Detalhes | NAO (regra de consistencia ausente) | Alto |
| Transacao referenciando jogador inexistente | Parcial (falha no processamento) | Alto |
| Sessao com data futura | Nao | Medio |
| Rake maior que ganhos | Nao | Alto |
| Saldo negativo | Nao | Medio |

---

## Parte 5: Gaps Identificados (Priorizados)

### CRITICAL - Devem ser corrigidos imediatamente

#### Gap C1: Backend nao valida estrutura de dados
**Descricao:** O schema Zod usa `rawData: z.any()`, aceitando qualquer estrutura.
**Impacto:** Dados malformados podem corromper o banco de dados.
**Recomendacao:** Implementar validacao Zod completa para rawData no backend.

#### Gap C2: Regras de consistencia nao implementadas
**Descricao:** Nenhuma das 5 regras de consistencia definidas esta implementada.
**Impacto:** Dados inconsistentes entre abas serao aceitos.
**Recomendacao:** Implementar todas as regras de consistencia no frontend E backend.

#### Gap C3: Regras matematicas nao implementadas
**Descricao:** Nenhuma das 4 regras matematicas definidas esta implementada.
**Impacto:** Planilhas com totais errados serao aceitas, gerando calculos financeiros incorretos.
**Recomendacao:** Implementar validacoes matematicas criticas.

#### Gap C4: Paridade frontend-backend inexistente
**Descricao:** 15 regras no frontend, 2 no backend, nenhuma em comum.
**Impacto:** Seguranca comprometida - validacao pode ser bypassed.
**Recomendacao:** Replicar validacoes criticas no backend.

### HIGH - Devem ser corrigidos em breve

#### Gap H1: Validacao apenas do primeiro registro
**Descricao:** Regras de colunas verificam apenas o primeiro registro.
**Impacto:** Registros posteriores podem ter dados incompletos.
**Recomendacao:** Validar todos os registros ou pelo menos amostra significativa.

#### Gap H2: Threshold de campos muito permissivo
**Descricao:** Aceita 83-87% dos campos como "completo".
**Impacto:** Dados parciais passam como validos.
**Recomendacao:** Aumentar threshold ou listar campos obrigatorios vs opcionais.

#### Gap H3: Tratamento de datas invalidas
**Descricao:** Regra period_detected nao trata Invalid Date corretamente.
**Impacto:** Periodo pode ser calculado incorretamente.
**Recomendacao:** Adicionar verificacao isNaN apos criacao de Date.

### MEDIUM - Melhorias recomendadas

#### Gap M1: Validacao de tipo de sessao permissiva
**Descricao:** Usa OR em vez de AND para campos de sessao.
**Impacto:** Sessoes com dados incompletos passam validacao.
**Recomendacao:** Revisar logica para exigir todos os campos relevantes.

#### Gap M2: Chave de duplicacao de transacoes incompleta
**Descricao:** Nao inclui chipsRedeemed, creditRedeemed na chave.
**Impacto:** Duplicatas parciais podem nao ser detectadas.
**Recomendacao:** Expandir chave de duplicacao.

### LOW - Nice-to-have

#### Gap L1: IDs com zeros a esquerda
**Descricao:** "00123" e "123" sao tratados como IDs diferentes.
**Impacto:** Possivel duplicacao de jogadores.
**Recomendacao:** Normalizar IDs antes de validacao.

---

## Parte 6: Recomendacoes Detalhadas

### Recomendacao 1: Implementar Validacao Backend Completa

**Prioridade:** CRITICAL
**Esforco:** Alto (2-3 dias)

**Acoes:**
1. Substituir `rawData: z.any()` por schema Zod tipado
2. Criar funcao `validateImportData` no backend similar ao frontend
3. Executar validacao completa na procedure `validate`
4. Retornar erros detalhados como o frontend

**Codigo Sugerido:**
```typescript
// apps/api/src/schemas/poker/imports.ts
export const rawDataSchema = z.object({
  players: z.array(parsedPlayerSchema).optional(),
  transactions: z.array(parsedTransactionSchema).optional(),
  sessions: z.array(parsedSessionSchema).optional(),
  summaries: z.array(parsedSummarySchema).optional(),
  rakebacks: z.array(parsedRakebackSchema).optional(),
  periodStart: z.string().nullable().optional(),
  periodEnd: z.string().nullable().optional(),
});

export const createPokerImportSchema = z.object({
  fileName: z.string(),
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  sourceType: pokerImportSourceTypeSchema.optional().default("club"),
  rawData: rawDataSchema, // Agora tipado!
});
```

### Recomendacao 2: Implementar Regras de Consistencia

**Prioridade:** CRITICAL
**Esforco:** Medio (1-2 dias)

**Regras a implementar:**

```typescript
// player_ids_match_between_sheets
const summaryIds = new Set(data.summaries?.map(s => s.ppPokerId) || []);
const playerIds = new Set(data.players?.map(p => p.ppPokerId) || []);
const detailedIds = new Set(data.detailed?.map(d => d.ppPokerId) || []);

// Verificar que todos os IDs em summaries existem em players
const missingInPlayers = [...summaryIds].filter(id => !playerIds.has(id));

// user_details_players_in_geral
const playersNotInGeral = [...playerIds].filter(id => !summaryIds.has(id));

// agents_have_rakeback
const agentIds = new Set(data.summaries?.map(s => s.agentPpPokerId).filter(Boolean) || []);
const rakebackAgentIds = new Set(data.rakebacks?.map(r => r.agentPpPokerId) || []);
const agentsWithoutRakeback = [...agentIds].filter(id => !rakebackAgentIds.has(id));
```

### Recomendacao 3: Implementar Regras Matematicas

**Prioridade:** CRITICAL
**Esforco:** Medio (1-2 dias)

**Regras a implementar:**

```typescript
// game_totals_sum_to_general
for (const summary of data.summaries || []) {
  const calculatedTotal =
    summary.ringGamesTotal +
    summary.mttSitNGoTotal +
    summary.spinUpTotal +
    summary.caribbeanTotal +
    summary.colorGameTotal +
    summary.crashTotal +
    summary.luckyDrawTotal +
    summary.jackpotTotal +
    summary.evSplitTotal;

  // Tolerar diferenca de centavos (arredondamento)
  const diff = Math.abs(calculatedTotal - summary.generalTotal);
  if (diff > 0.01) {
    errors.push(`Jogador ${summary.ppPokerId}: soma (${calculatedTotal}) != geral (${summary.generalTotal})`);
  }
}

// fee_totals_valid
for (const summary of data.summaries || []) {
  const calculatedFee = summary.fee + summary.feePpst + summary.feeNonPpst + summary.feePpsr + summary.feeNonPpsr;
  // ... validar contra feeGeneral
}
```

### Recomendacao 4: Melhorar Mensagens de Erro

**Prioridade:** MEDIUM
**Esforco:** Baixo (0.5 dia)

**Problema atual:** Mensagens como "Faltando 5 campos" nao ajudam o usuario.

**Melhoria:**
```typescript
// Antes
details: `Faltando ${missingFields.length} campos`

// Depois
details: `Faltando campos obrigatorios: ${missingFields.slice(0, 5).join(', ')}${missingFields.length > 5 ? '...' : ''}`
suggestedAction: `Verifique se a planilha esta no formato correto do PPPoker v4.x`
```

### Recomendacao 5: Adicionar Testes para Validacao

**Prioridade:** HIGH
**Esforco:** Alto (2-3 dias)

**Situacao atual:** Nenhum teste para validation.ts

**Recomendacao:** Criar suite de testes com:
- Casos de sucesso (planilha valida)
- Cada regra falhando individualmente
- Edge cases identificados
- Dados malformados

---

## Apendice A: Fluxo de Validacao Atual

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Dashboard)                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario faz upload da planilha                              │
│  2. Parser converte Excel -> ParsedImportData                   │
│  3. validateImportData() executa 15 regras                      │
│  4. Se hasBlockingErrors = true, bloqueia                       │
│  5. Usuario vê preview e pode aprovar/rejeitar                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Se aprovado
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (API tRPC)                            │
├─────────────────────────────────────────────────────────────────┤
│  1. imports.create() - salva rawData SEM validacao              │
│  2. imports.validate() - APENAS verifica se vazio               │
│  3. imports.process() - processa dados no banco                 │
│     - Erros de constraint aparecem AQUI                         │
└─────────────────────────────────────────────────────────────────┘
```

**Problema:** Se alguem chamar a API diretamente (bypass frontend), pode enviar dados invalidos.

---

## Apendice B: Codigo Relevante

### Frontend: Funcao Principal de Validacao

```typescript
// apps/dashboard/src/lib/poker/validation.ts (linhas 763-815)
export function runValidations(data: ParsedImportData): ValidationCheck[] {
  const allRules: { rules: ValidationRule[]; category: ValidationCheck["category"] }[] = [
    { rules: STRUCTURE_RULES, category: "structure" },
    { rules: INTEGRITY_RULES, category: "integrity" },
    { rules: CONSISTENCY_RULES, category: "consistency" },  // VAZIO!
    { rules: MATH_RULES, category: "math" },               // VAZIO!
  ];

  const checks: ValidationCheck[] = [];

  for (const { rules, category } of allRules) {
    for (const rule of rules) {
      try {
        const result = rule.validate(data);
        checks.push({
          id: rule.id as ValidationCheckId,
          label: rule.label,
          description: rule.description,
          status: result.passed ? "passed" : rule.severity === "critical" ? "failed" : "warning",
          details: result.details,
          count: result.count,
          category,
          severity: rule.severity as ValidationCheck["severity"],
          debug: result.debug,
        });
      } catch (error) {
        // Erros de validacao sao tratados como falha
      }
    }
  }

  return checks;
}
```

### Backend: Validacao Minima

```typescript
// apps/api/src/trpc/routers/poker/imports.ts (linhas 319-332)
// Validation checks
if (totalPlayers === 0 && totalTransactions === 0 && totalSessions === 0) {
  errors.push("No data found in the import file");
}

if (newPlayers > 100) {
  warnings.push(`${newPlayers} new players will be created`);
}

const validationPassed = errors.length === 0;
```

---

## Conclusao

A auditoria revela uma **disparidade critica** entre a validacao frontend (robusta mas incompleta) e backend (praticamente inexistente).

**Principais descobertas:**
1. Frontend tem 15 regras implementadas, backend tem 2
2. Regras de consistencia e matematicas estao definidas mas nao implementadas
3. Backend aceita `rawData: z.any()` sem nenhuma validacao de estrutura
4. Edge cases importantes nao estao cobertos

**Risco para o negocio:** Alto. Dados financeiros corrompidos podem gerar:
- Calculos de settlements incorretos
- Pagamentos errados a agentes
- Disputas com jogadores
- Perda de confianca no sistema

**Proximos passos recomendados:**
1. [URGENTE] Implementar validacao backend completa
2. [URGENTE] Implementar regras de consistencia
3. [ALTO] Implementar regras matematicas
4. [MEDIO] Adicionar testes automatizados
5. [MEDIO] Melhorar mensagens de erro

---

*Documento gerado em: 2026-01-22*
*Autor: Auditoria Automatizada de Validacao*
*Versao: 1.0*
