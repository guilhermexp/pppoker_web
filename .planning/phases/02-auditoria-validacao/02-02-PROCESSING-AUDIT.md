# Auditoria de Processamento de Imports PPPoker

**Data:** 2026-01-22
**Escopo:** Analise completa do fluxo de processamento e transformacao de dados no procedure `imports.process`

---

## Executive Summary

### Visao Geral
- **Total de etapas de processamento:** 13 etapas principais (incluindo pre-scan e sub-etapas)
- **Linhas de codigo analisadas:** ~1,237 linhas (processo completo, linhas 378-1614)
- **Tabelas afetadas:** 10 tabelas do banco de dados
- **Risco geral:** ALTO - Ausencia de transacao atomica, validacao minima pre-processamento

### Resumo de Risco

| Area | Status | Severidade |
|------|--------|------------|
| Atomicidade | SEM TRANSACAO | Critical |
| Error Handling | PARCIAL | High |
| Deduplicacao | IMPLEMENTADA | Low |
| Batch Operations | OK (500 registros) | Low |
| Validacao Pre-Insert | MINIMA | Critical |
| Rollback | INEXISTENTE | Critical |

---

## Parte 1: Mapeamento das 13 Etapas de Processamento

### Fluxo Completo

```
PRE-SCAN: Identificar agents/super_agents
     |
     v
STEP 0: Criar/Atualizar week period
     |
     v
STEP 1: Upsert players (Detalhes do usuario)
     |
     v
STEP 2: Extrair e upsert agents/super_agents
     |
     v
STEP 2.5: Upsert players de summaries (Geral)
     |
     v
STEP 2.6: Upsert players de sessions (Partidas)
     |
     v
STEP 3: Construir player ID map
     |
     v
STEP 3.5: Linkar players a agents
     |
     v
STEP 4: Insert transactions
     |
     v
STEP 5: Upsert sessions
     |
     v
STEP 6: Construir session ID map
     |
     v
STEP 7: Upsert session players
     |
     v
STEP 8: Upsert player summaries
     |
     v
STEP 9: Upsert player detailed
     |
     v
STEP 10: Upsert agent rakeback
     |
     v
STEP 11: Insert demonstrativo
     |
     v
STEP 12: Calculate activity metrics
     |
     v
UPDATE: Finalizar status do import
```

---

### Analise Detalhada por Etapa

#### PRE-SCAN: Identificar agents/super_agents (linhas 479-493)

**Proposito:** Pre-identificar quem sao agents/super_agents para evitar sobrescrever tipo como "player".

**Input:**
- `rawData.summaries[]` (Aba Geral)

**Transformacao:**
```typescript
const preScannedAgents = new Set<string>();
for (const summary of rawData.summaries) {
  if (summary.superAgentPpPokerId) {
    preScannedAgents.add(summary.superAgentPpPokerId);
  }
  if (summary.agentPpPokerId) {
    preScannedAgents.add(summary.agentPpPokerId);
  }
}
```

**Output:**
- `Set<string>` contendo ppPokerId de todos os agents/super_agents

**Dependencias:**
- Nenhuma (primeira etapa)

**Pontos de Falha:**
- [x] Nenhum - operacao em memoria apenas

**Error Handling:**
- Nenhum necessario

**Status:** OK

---

#### STEP 0: Criar/Atualizar week period (linhas 448-475)

**Proposito:** Criar registro do periodo semanal para o import.

**Input:**
- `importRecord.period_start`
- `importRecord.period_end`
- `importId`

**Transformacao:**
```typescript
{
  team_id: teamId,
  week_start: importPeriodStart,
  week_end: importPeriodEnd,
  status: "open",
  import_id: importId,
  updated_at: new Date().toISOString(),
}
```

**Output:**
- Registro em `poker_week_periods`

**Tabela Destino:** `poker_week_periods`

**Conflict Strategy:** `onConflict: "team_id,week_start"`

**Pontos de Falha:**
- [!] Se period_start ou period_end for null, etapa e pulada silenciosamente
- [ ] Erro de upsert e adicionado a processingErrors mas nao interrompe fluxo

**Error Handling:**
```typescript
if (weekPeriodError) {
  processingErrors.push(`Failed to create week period: ${weekPeriodError.message}`);
}
```

**GAP Identificado:** Se week period falha, o processamento continua. Pode gerar dados orfaos sem periodo associado.

**Status:** WARNING - Falha nao-blocking

---

#### STEP 1: Upsert players (Detalhes do usuario) (linhas 501-538)

**Proposito:** Importar todos os membros do clube da aba "Detalhes do usuario".

**Input:**
- `rawData.players[]`
- `preScannedAgents` (para filtrar)

**Transformacao:**
```typescript
// Filtra agents para evitar criar com type="player"
const playersRaw = rawData.players
  .filter((player) => !preScannedAgents.has(player.ppPokerId))
  .map((player) => ({
    team_id: teamId,
    import_id: importId,
    pppoker_id: player.ppPokerId,
    nickname: player.nickname,
    memo_name: player.memoName ?? null,
    country: player.country ?? null,
    type: "player",            // Sempre "player" nesta etapa
    status: "active",
    chip_balance: player.chipBalance ?? 0,
    agent_credit_balance: player.agentCreditBalance ?? 0,
    super_agent_credit_balance: player.superAgentCreditBalance ?? 0,
    last_active_at: player.lastActiveAt ?? null,
    updated_at: new Date().toISOString(),
  }));

// Deduplicacao por pppoker_id
const playersToUpsert = deduplicateByKey(playersRaw, (p) => p.pppoker_id);
```

**Output:**
- Registros em `poker_players`

**Tabela Destino:** `poker_players`

**Conflict Strategy:** `onConflict: "pppoker_id,team_id"`

**Batch Size:** 500 registros

**Deduplicacao:** Sim - por `pppoker_id` (mantem ultima ocorrencia)

**Pontos de Falha:**
- [!] Se player.ppPokerId for undefined/null, valor invalido sera inserido
- [!] Se player.chipBalance nao for numero, usa 0 (perda de dado)
- [ ] Erro de batch adicionado a processingErrors mas nao interrompe

**Error Handling:**
```typescript
if (error) {
  processingErrors.push(`Failed to upsert players batch: ${error.message}`);
}
```

**GAP Identificado:**
1. Nenhuma validacao de ppPokerId antes de inserir
2. Valores undefined convertidos para null/0 silenciosamente
3. Se um batch falhar, os outros continuam (dados parciais)

**Status:** WARNING - Validacao insuficiente

---

#### STEP 2: Extrair e upsert agents/super_agents (linhas 540-621)

**Proposito:** Criar registros para agents e super_agents com tipo correto.

**Input:**
- `rawData.summaries[]`

**Transformacao:**
```typescript
// Extrai super_agents PRIMEIRO (para existirem antes dos agents)
if (summary.superAgentPpPokerId && !seenAgents.has(summary.superAgentPpPokerId)) {
  seenAgents.add(summary.superAgentPpPokerId);
  agentsRaw.push({
    team_id: teamId,
    import_id: importId,
    pppoker_id: summary.superAgentPpPokerId,
    nickname: summary.superAgentNickname || `Super Agent ${summary.superAgentPpPokerId}`,
    type: "super_agent",  // IMPORTANTE: tipo correto
    status: "active",
    updated_at: new Date().toISOString(),
  });
}

// Depois extrai agents
if (summary.agentPpPokerId && !seenAgents.has(summary.agentPpPokerId)) {
  seenAgents.add(summary.agentPpPokerId);
  agentsRaw.push({
    type: "agent",  // IMPORTANTE: tipo correto
    // ... resto dos campos
  });
}
```

**Outputs:**
1. `playerAgentMap`: Map<ppPokerId, {agentPpPokerId, superAgentPpPokerId}>
2. `seenAgents`: Set<ppPokerId> de todos os agents/super_agents
3. Registros em `poker_players` com type="agent" ou "super_agent"

**Tabela Destino:** `poker_players`

**Conflict Strategy:** `onConflict: "pppoker_id,team_id"`

**Observacoes:**
- Ordem de extracao importante: super_agents primeiro
- Nickname de fallback criado se nao existir

**GAP Identificado:**
1. Se agent tambem aparece como player em "Detalhes do usuario", pode ter dados inconsistentes
2. Nickname pode ser "Agent 12345" se nao vier na planilha

**Status:** OK - Logica correta

---

#### STEP 2.5: Upsert players de summaries (linhas 627-659)

**Proposito:** Garantir que jogadores da aba Geral existam no banco.

**Input:**
- `rawData.summaries[]`
- `seenAgents` (para filtrar)

**Transformacao:**
```typescript
const summaryPlayersRaw = rawData.summaries
  .filter((summary) => !seenAgents.has(summary.ppPokerId))  // Nao sobrescrever agents
  .map((summary) => ({
    team_id: teamId,
    import_id: importId,
    pppoker_id: summary.ppPokerId,
    nickname: summary.nickname,
    memo_name: summary.memoName ?? null,
    country: summary.country ?? null,
    type: "player",
    status: "active",
    updated_at: new Date().toISOString(),
  }));
```

**Status:** OK

---

#### STEP 2.6: Upsert players de sessions (linhas 666-712)

**Proposito:** Garantir que jogadores das partidas existam no banco (podem nao estar em Geral).

**Input:**
- `rawData.sessions[].players[]`
- `seenAgents` (para filtrar)

**Transformacao:**
```typescript
for (const session of rawData.sessions) {
  for (const player of session.players) {
    if (!player.ppPokerId) continue;
    if (seenAgents.has(player.ppPokerId)) continue;

    sessionPlayersRaw.push({
      team_id: teamId,
      import_id: importId,
      pppoker_id: player.ppPokerId,
      nickname: player.nickname || `Player ${player.ppPokerId}`,
      memo_name: player.memoName ?? null,
      type: "player",
      status: "active",
      updated_at: new Date().toISOString(),
    });
  }
}
```

**GAP Identificado:**
- Jogadores em sessions mas nao em Geral podem ter dados incompletos
- Nickname fallback "Player 12345"

**Status:** OK

---

#### STEP 3: Construir player ID map (linhas 718-750)

**Proposito:** Mapear pppoker_id -> UUID do banco para uso nas proximas etapas.

**Input:**
- Todos os players do banco para o team

**Transformacao:**
```typescript
const playerIdMap = new Map<string, string>();

// Usa paginacao para buscar TODOS os players (Supabase limita a 1000)
while (true) {
  const { data: playerBatch } = await supabase
    .from("poker_players")
    .select("id, pppoker_id")
    .eq("team_id", teamId)
    .range(playerOffset, playerOffset + PLAYER_PAGE_SIZE - 1);

  for (const p of playerBatch) {
    playerIdMap.set(p.pppoker_id, p.id);
  }
  // ... paginacao
}
```

**Output:**
- `playerIdMap`: Map<pppoker_id, uuid>

**Observacao Positiva:** Usa paginacao corretamente para times com >1000 jogadores.

**Status:** OK

---

#### STEP 3.5: Linkar players a agents (linhas 755-852)

**Proposito:** Atualizar `agent_id` e `super_agent_id` nos registros de players.

**Input:**
- `playerAgentMap` (do STEP 2)
- `playerIdMap` (do STEP 3)
- `rawData.summaries` (para relacao agent -> super_agent)

**Transformacao:**
```typescript
// Para cada player com agent
for (const [playerPpPokerId, relations] of playerAgentMap) {
  const agentId = playerIdMap.get(relations.agentPpPokerId);
  const superAgentId = playerIdMap.get(relations.superAgentPpPokerId);

  if (agentId || superAgentId) {
    playerUpdates.push({
      pppoker_id: playerPpPokerId,
      agent_id: agentId ?? null,
      super_agent_id: superAgentId ?? null,
    });
  }
}

// Atualiza cada player individualmente (NAO batch update)
for (const update of batch) {
  const { error } = await supabase
    .from("poker_players")
    .update({
      agent_id: update.agent_id,
      super_agent_id: update.super_agent_id,
      updated_at: new Date().toISOString(),
    })
    .eq("pppoker_id", update.pppoker_id)
    .eq("team_id", teamId);
}
```

**GAP CRITICO:**
1. Updates individuais em vez de batch (N queries para N players)
2. Se agent_id nao existir no playerIdMap, silenciosamente seta null
3. Performance: O(n) queries onde n = numero de players com agent

**Status:** WARNING - Performance ruim para grandes volumes

---

#### STEP 4: Insert transactions (linhas 857-924)

**Proposito:** Importar todas as transacoes da aba "Transacoes".

**Input:**
- `rawData.transactions[]`
- `playerIdMap`

**Transformacao:**
```typescript
const transactionsToInsert = rawData.transactions
  .map((tx) => {
    const occurredAt = parseTimestamp(tx.occurredAt);
    if (!occurredAt) return null;  // Skip se data invalida

    return {
      team_id: teamId,
      import_id: importId,
      occurred_at: occurredAt,
      type: tx.creditSent ? "credit_given" : "transfer_in",  // Logica de tipo
      sender_club_id: tx.senderClubId ?? null,
      sender_player_id: playerIdMap.get(tx.senderPlayerId) ?? null,
      recipient_player_id: playerIdMap.get(tx.recipientPlayerId) ?? null,
      sender_nickname: tx.senderNickname ?? null,
      sender_memo_name: tx.senderMemoName ?? null,
      recipient_nickname: tx.recipientNickname ?? null,
      recipient_memo_name: tx.recipientMemoName ?? null,
      credit_sent: tx.creditSent ?? 0,
      credit_redeemed: tx.creditRedeemed ?? 0,
      credit_left_club: tx.creditLeftClub ?? 0,
      chips_sent: tx.chipsSent ?? 0,
      chips_redeemed: tx.chipsRedeemed ?? 0,
      chips_left_club: tx.chipsLeftClub ?? 0,
      chips_ppsr: tx.classificationPpsr ?? 0,
      chips_ring: tx.classificationRing ?? 0,
      chips_custom_ring: tx.classificationCustomRing ?? 0,
      chips_mtt: tx.classificationMtt ?? 0,
      ticket_sent: tx.ticketSent ?? 0,
      ticket_redeemed: tx.ticketRedeemed ?? 0,
      ticket_expired: tx.ticketExpired ?? 0,
      // Calculo do amount
      amount: (tx.creditSent ?? 0) + (tx.chipsSent ?? 0) -
              (tx.creditRedeemed ?? 0) - (tx.chipsRedeemed ?? 0),
    };
  })
  .filter(Boolean);  // Remove nulls (datas invalidas)
```

**Tabela Destino:** `poker_chip_transactions`

**Operacao:** INSERT (nao upsert - duplicatas sao inseridas!)

**GAPs Identificados:**
1. **CRITICO:** INSERT simples - NAO verifica duplicatas!
2. Se player_id nao encontrado no map, seta null (transacao orfã)
3. Logica de `type` simplista: `credit_given` se creditSent, senao `transfer_in`
4. Calculo de `amount` pode estar errado para alguns tipos de transacao

**Calculo de Amount:**
```
amount = creditSent + chipsSent - creditRedeemed - chipsRedeemed
```
- NAO considera credit_left_club, chips_left_club, tickets
- Pode gerar amount incorreto para alguns cenarios

**Status:** CRITICAL - Duplicatas e calculos questionaveis

---

#### STEP 5: Upsert sessions (linhas 929-987)

**Proposito:** Importar sessoes de jogo da aba "Partidas".

**Input:**
- `rawData.sessions[]`
- `playerIdMap`

**Transformacao:**
```typescript
const sessionsRaw = rawData.sessions
  .map((session) => {
    const startedAt = parseTimestamp(session.startedAt);
    if (!startedAt) return null;

    return {
      team_id: teamId,
      import_id: importId,
      external_id: session.externalId,
      table_name: session.tableName ?? null,
      session_type: session.sessionType ?? "cash_game",
      game_variant: session.gameVariant ?? "nlh",
      started_at: startedAt,
      ended_at: parseTimestamp(session.endedAt),
      blinds: session.blinds ?? null,
      buy_in_amount: session.buyInAmount ?? null,
      guaranteed_prize: session.guaranteedPrize ?? null,
      total_rake: session.totalRake ?? 0,
      total_buy_in: session.totalBuyIn ?? 0,
      // Calculo de cash_out
      total_cash_out: (session.totalBuyIn ?? 0) + (session.totalWinnings ?? 0),
      player_count: session.playerCount ?? session.players?.length ?? 0,
      hands_played: session.handsPlayed ?? 0,
      created_by_id: playerIdMap.get(session.createdByPpPokerId) ?? null,
    };
  })
  .filter(Boolean);

// Deduplicacao por external_id
const sessionsToUpsert = deduplicateByKey(sessionsRaw, (s) => s.external_id);
```

**Tabela Destino:** `poker_sessions`

**Conflict Strategy:** `onConflict: "external_id,team_id"`

**Calculo de total_cash_out:**
```
total_cash_out = totalBuyIn + totalWinnings
```
- totalWinnings pode ser negativo (net result)
- Formula correta: buy_in + winnings = cash_out

**Status:** OK - Logica correta

---

#### STEP 6: Construir session ID map (linhas 993-1025)

**Proposito:** Mapear external_id -> UUID do banco para uso nas proximas etapas.

**Input:**
- Todas as sessions do banco para o team

**Transformacao:**
```typescript
const sessionIdMap = new Map<string, string>();
// ... paginacao similar ao STEP 3
```

**Status:** OK

---

#### STEP 7: Upsert session players (linhas 1030-1091)

**Proposito:** Importar participacao de jogadores em cada sessao.

**Input:**
- `rawData.sessions[].players[]`
- `playerIdMap`
- `sessionIdMap`

**Transformacao:**
```typescript
for (const session of rawData.sessions) {
  const sessionId = sessionIdMap.get(session.externalId);
  if (!sessionId || !session.players?.length) continue;

  for (const player of session.players) {
    const playerId = playerIdMap.get(player.ppPokerId);
    if (!playerId) continue;

    sessionPlayersRaw.push({
      team_id: teamId,
      session_id: sessionId,
      player_id: playerId,
      nickname: player.nickname ?? null,
      memo_name: player.memoName ?? null,
      ranking: player.ranking ?? null,
      buy_in_chips: player.buyIn ?? player.buyInChips ?? 0,
      buy_in_ticket: player.buyInTicket ?? 0,
      cash_out: player.winnings ?? player.winningsGeneral ?? 0,
      winnings: player.winnings ?? player.winningsGeneral ?? 0,
      rake: player.rake ?? player.clubWinningsFee ?? 0,
      club_winnings_general: player.clubWinningsGeneral ?? null,
      hands: player.hands ?? null,
      winnings_opponents: player.winningsOpponents ?? null,
      winnings_jackpot: player.winningsJackpot ?? null,
      winnings_ev_split: player.winningsEvSplit ?? null,
      club_winnings_jackpot_fee: player.clubWinningsJackpotFee ?? null,
      club_winnings_jackpot_prize: player.clubWinningsJackpotPrize ?? null,
      club_winnings_ev_split: player.clubWinningsEvSplit ?? null,
      bounty: player.bounty ?? null,
      prize: player.prize ?? null,
    });
  }
}

// Deduplicacao por session_id + player_id
const sessionPlayersToUpsert = deduplicateByKey(
  sessionPlayersRaw,
  (sp) => `${sp.session_id}-${sp.player_id}`
);
```

**Tabela Destino:** `poker_session_players`

**Conflict Strategy:** `onConflict: "session_id,player_id"`

**GAPs Identificados:**
1. Se session nao foi criada (startedAt invalido), seus players sao ignorados
2. Se player nao existe no map, participacao e ignorada silenciosamente
3. Muitos campos com fallback para multiplos nomes (buyIn vs buyInChips)

**Status:** WARNING - Silencioso demais em falhas

---

#### STEP 8: Upsert player summaries (linhas 1096-1216)

**Proposito:** Importar resumo de jogadores da aba "Geral".

**Input:**
- `rawData.summaries[]`
- `rawData.players[]` (para balance data)
- `playerIdMap`
- `importRecord.period_start/period_end`

**Transformacao Complexa:**
```typescript
// 1. Constroi mapa de balances de "Detalhes do usuario"
const playerBalanceMap = new Map();
for (const player of rawData?.players ?? []) {
  playerBalanceMap.set(String(player.ppPokerId), {
    chipBalance: player.chipBalance ?? 0,
    agentCreditBalance: player.agentCreditBalance ?? 0,
    superAgentCreditBalance: player.superAgentCreditBalance ?? 0,
  });
}

// 2. Para cada summary, combina dados
const summariesRaw = rawData.summaries.map((summary) => {
  const playerId = playerIdMap.get(summary.ppPokerId);
  const balanceData = playerBalanceMap.get(String(summary.ppPokerId));

  return {
    team_id: teamId,
    import_id: importId,
    player_id: playerId,
    period_start: periodStart,
    period_end: periodEnd,
    // Balances do "Detalhes do usuario"
    chip_balance: balanceData?.chipBalance ?? 0,
    agent_credit_balance: balanceData?.agentCreditBalance ?? 0,
    super_agent_credit_balance: balanceData?.superAgentCreditBalance ?? 0,
    // Winnings do "Geral"
    winnings_total: summary.generalTotal ?? 0,
    winnings_general: summary.generalTotal ?? 0,
    winnings_ring: summary.ringGamesTotal ?? 0,
    winnings_mtt_sitgo: summary.mttSitNGoTotal ?? 0,
    winnings_spinup: summary.spinUpTotal ?? 0,
    winnings_caribbean: summary.caribbeanTotal ?? 0,
    winnings_color_game: summary.colorGameTotal ?? 0,
    winnings_crash: summary.crashTotal ?? 0,
    winnings_lucky_draw: summary.luckyDrawTotal ?? 0,
    winnings_jackpot: summary.jackpotTotal ?? summary.jackpotPrize ?? 0,
    winnings_ev_split: summary.evSplitTotal ?? 0,
    // Rake
    club_earnings_general: summary.feeGeneral ?? 0,
    rake_total: summary.feeGeneral ?? summary.fee ?? 0,
    rake_ppst: summary.feePpst ?? 0,
    rake_ppsr: summary.feePpsr ?? 0,
    rake_non_ppst: summary.feeNonPpst ?? 0,
    rake_non_ppsr: summary.feeNonPpsr ?? 0,
    club_earnings_jackpot: summary.jackpotFee ?? 0,
    // ... mais 20+ campos
  };
});
```

**Tabela Destino:** `poker_player_summary`

**Conflict Strategy:** `onConflict: "player_id,period_start,period_end"`

**Observacao:** Combina dados de 2 fontes (Geral + Detalhes do usuario).

**GAPs Identificados:**
1. Se player nao tem balance em "Detalhes do usuario", usa 0
2. Muitos campos com fallback (ex: `summary.feeGeneral ?? summary.fee`)
3. Se period_start/period_end for null, toda a etapa e pulada

**Status:** OK - Logica complexa mas correta

---

#### STEP 9: Upsert player detailed (linhas 1221-1426)

**Proposito:** Importar dados detalhados por variante da aba "Detalhado".

**Input:**
- `rawData.detailed[]`
- `playerIdMap`

**Transformacao:** ~200 campos mapeados incluindo:
- Ganhos por variante (NLH, PLO, etc.)
- Taxas por variante
- Maos por variante

**Tabela Destino:** `poker_player_detailed`

**Conflict Strategy:** `onConflict: "player_id,period_start,period_end,date"`

**Status:** OK - Mapeamento extenso mas correto

---

#### STEP 10: Upsert agent rakeback (linhas 1432-1481)

**Proposito:** Importar dados de rakeback de agentes da aba "Retorno de Taxa".

**Input:**
- `rawData.rakebacks[]`
- `playerIdMap`

**Transformacao:**
```typescript
const rakebacksRaw = rawData.rakebacks.map((rb) => {
  const agentId = playerIdMap.get(rb.agentPpPokerId);
  const superAgentId = rb.superAgentPpPokerId
    ? playerIdMap.get(rb.superAgentPpPokerId)
    : null;

  return {
    team_id: teamId,
    import_id: importId,
    period_start: periodStart,
    period_end: periodEnd,
    agent_id: agentId ?? null,
    agent_pppoker_id: rb.agentPpPokerId,
    agent_nickname: rb.agentNickname ?? null,
    memo_name: rb.memoName ?? null,
    country: rb.country ?? null,
    super_agent_id: superAgentId ?? null,
    super_agent_pppoker_id: rb.superAgentPpPokerId ?? null,
    average_rakeback_percent: rb.averageRakebackPercent ?? 0,
    total_rt: rb.totalRt ?? 0,
  };
});
```

**Tabela Destino:** `poker_agent_rakeback`

**Conflict Strategy:** `onConflict: "team_id,agent_pppoker_id,period_start,period_end"`

**Status:** OK

---

#### STEP 11: Insert demonstrativo (linhas 1486-1519)

**Proposito:** Importar dados do demonstrativo (se existir).

**Input:**
- `rawData.demonstrativo[]`
- `playerIdMap`

**Transformacao:**
```typescript
const demonstrativoToInsert = rawData.demonstrativo
  .map((d) => ({
    team_id: teamId,
    occurred_at: parseTimestamp(d.occurredAt),
    player_id: playerIdMap.get(d.ppPokerId) ?? null,
    pppoker_id: d.ppPokerId || null,
    nickname: d.nickname || null,
    memo_name: d.memoName || null,
    type: d.type || null,
    amount: d.amount ?? 0,
    import_id: input.id,
  }))
  .filter((d) => d.occurred_at || d.pppoker_id);  // Filtro flexivel
```

**Tabela Destino:** `poker_demonstrativo`

**Operacao:** INSERT (nao upsert)

**GAPs Identificados:**
1. INSERT simples - pode criar duplicatas
2. Filtro aceita registro se tiver data OU player (muito permissivo)

**Status:** WARNING - Potencial para duplicatas

---

#### STEP 12: Calculate activity metrics (linhas 1524-1578)

**Proposito:** Calcular metricas de atividade para todos os players afetados.

**Input:**
- `playerIdMap` (todos os IDs afetados)

**Transformacao:**
```typescript
const affectedPlayerIds = Array.from(playerIdMap.values());

// Processa em batches de 100
for (let i = 0; i < affectedPlayerIds.length; i += 100) {
  const batchIds = affectedPlayerIds.slice(i, i + 100);
  const metricsMap = await calculateBatchActivityMetrics(supabase, teamId, batchIds);

  // Atualiza cada player
  for (const [playerId, metrics] of metricsMap) {
    await supabase
      .from("poker_players")
      .update({
        last_session_at: metrics.lastSessionAt ?? null,
        sessions_last_4_weeks: metrics.sessionsLast4Weeks ?? 0,
        weeks_active_last_4: metrics.weeksActiveLast4 ?? 0,
        days_since_last_session: metrics.daysSinceLastSession ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId)
      .eq("team_id", teamId);
  }
}
```

**Metricas Calculadas:**
- `last_session_at`: Data da ultima sessao
- `sessions_last_4_weeks`: Sessoes nas ultimas 4 semanas
- `weeks_active_last_4`: Semanas com atividade
- `days_since_last_session`: Dias desde ultima sessao

**Error Handling:**
```typescript
catch (activityError) {
  // Nao falha o import por erro de metricas
  console.error(`Activity metrics calculation error: ${activityError.message}`);
  processingErrors.push(`Warning: Failed to calculate activity metrics`);
}
```

**GAPs Identificados:**
1. Updates individuais (N queries para N players)
2. Erro de metricas nao interrompe import (correto)

**Status:** OK - Logica correta, performance questionavel

---

## Parte 2: Matriz de Transformacao Planilha -> Database

### Mapeamento Completo por Aba

#### Aba "Detalhes do usuario" -> `poker_players`

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| Ultima Atividade | last_active_at | String ISO |
| ID PPPoker | pppoker_id | String |
| Pais | country | String nullable |
| Apelido | nickname | String |
| Nome Memo | memo_name | String nullable |
| Saldo de Fichas | chip_balance | Number (default 0) |
| Apelido Agente | - | Usado para lookup |
| ID Agente | - | Usado em playerAgentMap |
| Saldo Agente | agent_credit_balance | Number (default 0) |
| Apelido Super Agente | - | Usado para lookup |
| ID Super Agente | - | Usado em playerAgentMap |
| Saldo Super Agente | super_agent_credit_balance | Number (default 0) |

**Campos Derivados:**
- `type`: "player" (hardcoded)
- `status`: "active" (hardcoded)
- `team_id`: Do contexto
- `import_id`: Do import atual

---

#### Aba "Geral" -> `poker_player_summary`

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| ID PPPoker | player_id | Lookup via playerIdMap |
| Ganhos Total | winnings_total | generalTotal ?? 0 |
| Ring Games | winnings_ring | ringGamesTotal ?? 0 |
| MTT/SitNGo | winnings_mtt_sitgo | mttSitNGoTotal ?? 0 |
| SpinUp | winnings_spinup | spinUpTotal ?? 0 |
| Caribbean | winnings_caribbean | caribbeanTotal ?? 0 |
| Color Game | winnings_color_game | colorGameTotal ?? 0 |
| Crash | winnings_crash | crashTotal ?? 0 |
| Lucky Draw | winnings_lucky_draw | luckyDrawTotal ?? 0 |
| Jackpot | winnings_jackpot | jackpotTotal ?? jackpotPrize ?? 0 |
| EV Split | winnings_ev_split | evSplitTotal ?? 0 |
| Taxa Geral | club_earnings_general | feeGeneral ?? 0 |
| Taxa Total | rake_total | feeGeneral ?? fee ?? 0 |
| Taxa PPST | rake_ppst | feePpst ?? 0 |
| Taxa PPSR | rake_ppsr | feePpsr ?? 0 |
| Taxa Nao-PPST | rake_non_ppst | feeNonPpst ?? 0 |
| Taxa Nao-PPSR | rake_non_ppsr | feeNonPpsr ?? 0 |
| Taxa Jackpot | club_earnings_jackpot | jackpotFee ?? 0 |
| ... | ... | ~30 mais campos |

**Campos Combinados (de "Detalhes do usuario"):**
- `chip_balance`
- `agent_credit_balance`
- `super_agent_credit_balance`

---

#### Aba "Partidas" -> `poker_sessions` + `poker_session_players`

**poker_sessions:**

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| ID Externo | external_id | String |
| Nome Mesa | table_name | String nullable |
| Tipo | session_type | sessionType ?? "cash_game" |
| Variante | game_variant | gameVariant ?? "nlh" |
| Inicio | started_at | parseTimestamp() |
| Fim | ended_at | parseTimestamp() nullable |
| Blinds | blinds | String nullable |
| Buy-in | buy_in_amount | Number nullable |
| Premiacao | guaranteed_prize | Number nullable |
| Rake Total | total_rake | totalRake ?? 0 |
| Buy-in Total | total_buy_in | totalBuyIn ?? 0 |
| Cash-out Total | total_cash_out | totalBuyIn + totalWinnings |
| Jogadores | player_count | playerCount ?? players.length ?? 0 |
| Maos | hands_played | handsPlayed ?? 0 |

**poker_session_players:**

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| ID PPPoker | player_id | Lookup via playerIdMap |
| Ranking | ranking | Number nullable |
| Buy-in Fichas | buy_in_chips | buyIn ?? buyInChips ?? 0 |
| Buy-in Ticket | buy_in_ticket | buyInTicket ?? 0 |
| Cash-out | cash_out | winnings ?? winningsGeneral ?? 0 |
| Ganhos | winnings | winnings ?? winningsGeneral ?? 0 |
| Rake | rake | rake ?? clubWinningsFee ?? 0 |
| ... | ... | ~10 mais campos |

---

#### Aba "Transacoes" -> `poker_chip_transactions`

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| Data/Hora | occurred_at | parseTimestamp() |
| ID Clube Sender | sender_club_id | String nullable |
| ID Sender | sender_player_id | Lookup via playerIdMap |
| Apelido Sender | sender_nickname | String nullable |
| Nome Memo Sender | sender_memo_name | String nullable |
| ID Recipient | recipient_player_id | Lookup via playerIdMap |
| Apelido Recipient | recipient_nickname | String nullable |
| Nome Memo Recipient | recipient_memo_name | String nullable |
| Credito Enviado | credit_sent | Number (default 0) |
| Credito Resgatado | credit_redeemed | Number (default 0) |
| Credito Saiu | credit_left_club | Number (default 0) |
| Fichas Enviadas | chips_sent | Number (default 0) |
| Fichas PPSR | chips_ppsr | classificationPpsr ?? 0 |
| Fichas Ring | chips_ring | classificationRing ?? 0 |
| Fichas Custom Ring | chips_custom_ring | classificationCustomRing ?? 0 |
| Fichas MTT | chips_mtt | classificationMtt ?? 0 |
| Fichas Resgatadas | chips_redeemed | Number (default 0) |
| Fichas Sairam | chips_left_club | Number (default 0) |
| Ticket Enviado | ticket_sent | Number (default 0) |
| Ticket Resgatado | ticket_redeemed | Number (default 0) |
| Ticket Expirado | ticket_expired | Number (default 0) |

**Campos Calculados:**
- `type`: "credit_given" se creditSent, senao "transfer_in"
- `amount`: creditSent + chipsSent - creditRedeemed - chipsRedeemed

---

#### Aba "Retorno de Taxa" -> `poker_agent_rakeback`

| Campo Planilha | Campo DB | Transformacao |
|----------------|----------|---------------|
| ID Super Agente | super_agent_pppoker_id | String nullable |
| ID Agente | agent_pppoker_id | String |
| Pais | country | String nullable |
| Apelido Agente | agent_nickname | String nullable |
| Nome Memo | memo_name | String nullable |
| % Rakeback Medio | average_rakeback_percent | Number (default 0) |
| Total RT | total_rt | Number (default 0) |

**Campos Derivados:**
- `agent_id`: Lookup via playerIdMap
- `super_agent_id`: Lookup via playerIdMap

---

## Parte 3: Calculos Matematicos

### Calculo 1: amount em transactions

```typescript
amount = (creditSent ?? 0) + (chipsSent ?? 0) - (creditRedeemed ?? 0) - (chipsRedeemed ?? 0)
```

**Analise:**
- Considera apenas envio e resgate
- NAO considera: credit_left_club, chips_left_club, tickets
- Pode estar incorreto para transacoes de saida do clube

**Risco:** MEDIUM - Pode gerar relatorios com totais incorretos

---

### Calculo 2: total_cash_out em sessions

```typescript
total_cash_out = (totalBuyIn ?? 0) + (totalWinnings ?? 0)
```

**Analise:**
- totalWinnings e o resultado liquido (pode ser negativo)
- Formula correta: buy_in + net_result = cash_out

**Risco:** LOW - Formula correta

---

### Calculo 3: Activity Metrics

```typescript
// Sessoes nas ultimas 4 semanas
sessionsLast4Weeks = sessions?.length ?? 0;

// Semanas com atividade
weeksActiveLast4 = Set(sessions.map(s => `${year}-${week}`)).size;

// Dias desde ultima sessao
daysSinceLastSession = Math.floor((now - lastSessionDate) / (24 * 60 * 60 * 1000));
```

**Analise:** Calculos corretos

**Risco:** LOW

---

## Parte 4: Integridade de Dados

### 4.1 Referential Integrity

| Relacao | Verificacao Pre-Insert | Comportamento se Invalido |
|---------|------------------------|---------------------------|
| transaction.sender_player_id | Lookup em playerIdMap | Seta null |
| transaction.recipient_player_id | Lookup em playerIdMap | Seta null |
| session_player.player_id | Lookup em playerIdMap | Skip registro |
| session_player.session_id | Lookup em sessionIdMap | Skip registro |
| summary.player_id | Lookup em playerIdMap | Skip registro |
| detailed.player_id | Lookup em playerIdMap | Skip registro |
| rakeback.agent_id | Lookup em playerIdMap | Seta null |

**GAP CRITICO:** Transacoes com player_id null sao inseridas, criando dados orfaos.

---

### 4.2 Consistency Checks

| Check | Implementado | Risco |
|-------|--------------|-------|
| Player existe antes de referencia | Parcial | HIGH |
| Session existe antes de session_player | Sim (via map) | LOW |
| Period_start < period_end | Nao | MEDIUM |
| Timestamps validos | Parcial (parseTimestamp) | MEDIUM |
| Valores numericos validos | Nao | HIGH |
| IDs duplicados no input | Sim (deduplicateByKey) | LOW |

---

### 4.3 Atomicity Analysis

**PROBLEMA CRITICO: Nao ha transacao envolvendo todas as operacoes.**

```
STEP 0: Sucesso
STEP 1: Sucesso
STEP 2: Sucesso
STEP 3: FALHA  <-- Processamento continua!
STEP 4: Sucesso
...
```

Se qualquer etapa falha:
1. Erro e adicionado a `processingErrors`
2. Proximas etapas continuam executando
3. Status final e "failed" mas dados parciais estao no banco
4. NAO ha rollback automatico

**Impacto:**
- Dados parcialmente importados
- Estado inconsistente do banco
- Dificil identificar o que foi importado
- Re-importar pode criar duplicatas (transactions, demonstrativo)

---

## Parte 5: Problemas Identificados (Priorizados)

### CRITICAL

#### C1: Ausencia de transacao atomica
**Descricao:** Todas as operacoes sao feitas individualmente sem transacao.
**Impacto:** Dados parciais em caso de falha, estado inconsistente.
**Linha:** 445-1591 (todo o bloco try)
**Recomendacao:** Usar transacao do Supabase ou implementar saga pattern.

#### C2: Transactions sem verificacao de duplicatas
**Descricao:** STEP 4 usa INSERT simples, permitindo duplicatas.
**Impacto:** Re-importar cria transacoes duplicadas.
**Linha:** 914 (`supabase.from("poker_chip_transactions").insert(batch)`)
**Recomendacao:** Implementar upsert com chave de duplicacao ou verificacao pre-insert.

#### C3: Demonstrativo sem verificacao de duplicatas
**Descricao:** STEP 11 usa INSERT simples.
**Impacto:** Re-importar cria registros duplicados.
**Linha:** 1509 (`supabase.from("poker_demonstrativo").insert(batch)`)
**Recomendacao:** Implementar upsert ou verificacao pre-insert.

#### C4: Dados orfaos permitidos
**Descricao:** Transacoes com sender_player_id/recipient_player_id null sao inseridas.
**Impacto:** Transacoes que nao podem ser associadas a jogadores.
**Linha:** 869-874
**Recomendacao:** Validar que pelo menos um player_id existe.

---

### HIGH

#### H1: Updates individuais no STEP 3.5
**Descricao:** Atualiza cada player individualmente para linkar a agent.
**Impacto:** Performance ruim para grandes volumes (N queries).
**Linha:** 814-830
**Recomendacao:** Usar batch update com SQL raw ou Supabase RPC.

#### H2: Updates individuais no STEP 12
**Descricao:** Atualiza metricas de cada player individualmente.
**Impacto:** Performance ruim (N queries para N players).
**Linha:** 1547-1567
**Recomendacao:** Usar batch update.

#### H3: Calculo de transaction.type simplista
**Descricao:** `type = creditSent ? "credit_given" : "transfer_in"`
**Impacto:** Tipo de transacao pode estar incorreto para varios cenarios.
**Linha:** 867
**Recomendacao:** Implementar logica de tipo baseada em multiplos campos.

#### H4: Calculo de transaction.amount incompleto
**Descricao:** Nao considera todos os campos financeiros.
**Impacto:** Relatorios com totais potencialmente incorretos.
**Linha:** 897-899
**Recomendacao:** Revisar formula com regras de negocio.

---

### MEDIUM

#### M1: Erros nao interrompem processamento
**Descricao:** Erros sao adicionados a array mas processamento continua.
**Impacto:** Usuario pode nao perceber que dados estao incompletos.
**Linha:** Multiplas (todos os catch blocks)
**Recomendacao:** Adicionar flag para interromper em erro critico.

#### M2: Muitos fallbacks para campos
**Descricao:** Ex: `player.buyIn ?? player.buyInChips ?? 0`
**Impacto:** Dificil saber de onde veio o valor, debug complexo.
**Linha:** 1049-1053
**Recomendacao:** Padronizar nomes no parser ou documentar precedencia.

#### M3: Logging insuficiente
**Descricao:** Apenas `console.error` em alguns pontos.
**Impacto:** Dificil debugar problemas em producao.
**Linha:** 1563, 1572
**Recomendacao:** Usar Pino logger estruturado.

---

### LOW

#### L1: Nickname fallback generico
**Descricao:** Players sem nickname recebem "Player 12345" ou "Agent 12345".
**Impacto:** UX ruim, dificil identificar jogador.
**Linha:** 681, 576, 594
**Recomendacao:** Usar memoName como fallback antes de ID.

#### L2: Period null pula etapas silenciosamente
**Descricao:** Se period_start/end for null, STEPs 8-10 sao pulados.
**Impacto:** Summaries, detailed e rakeback nao sao importados.
**Linha:** 1121, 1225, 1436
**Recomendacao:** Adicionar warning explicito.

---

## Parte 6: Recomendacoes

### Recomendacao 1: Implementar Transacao Atomica

**Prioridade:** CRITICAL
**Esforco:** Alto (2-3 dias)

**Opcoes:**
1. **Supabase RPC com transacao:**
```sql
CREATE OR REPLACE FUNCTION process_import(import_id uuid, team_id uuid, raw_data jsonb)
RETURNS void AS $$
BEGIN
  -- Todas as operacoes dentro da transacao
  -- Se qualquer erro, rollback automatico
END;
$$ LANGUAGE plpgsql;
```

2. **Saga Pattern com compensacao:**
- Registrar cada operacao bem-sucedida
- Em caso de erro, executar compensacoes em ordem reversa

---

### Recomendacao 2: Upsert para Transactions

**Prioridade:** CRITICAL
**Esforco:** Medio (1 dia)

**Implementacao:**
```typescript
// Adicionar chave unica na tabela
// ALTER TABLE poker_chip_transactions ADD CONSTRAINT ... UNIQUE (...)

// Usar upsert no codigo
const { error } = await supabase
  .from("poker_chip_transactions")
  .upsert(batch, {
    onConflict: "team_id,occurred_at,sender_player_id,recipient_player_id,credit_sent,chips_sent"
  });
```

---

### Recomendacao 3: Batch Updates

**Prioridade:** HIGH
**Esforco:** Medio (1-2 dias)

**Implementacao para STEP 3.5:**
```typescript
// Usar SQL raw ou RPC
const { error } = await supabase.rpc('batch_update_player_agents', {
  updates: playerUpdates,
  team_id: teamId
});
```

---

### Recomendacao 4: Validacao Pre-Processamento

**Prioridade:** HIGH
**Esforco:** Medio (1-2 dias)

**Implementacao:**
```typescript
// Antes de processar, validar integridade
function validateBeforeProcess(rawData: any): ValidationResult {
  const errors: string[] = [];

  // Verificar IDs existem
  for (const tx of rawData.transactions ?? []) {
    if (!tx.senderPlayerId && !tx.recipientPlayerId) {
      errors.push(`Transaction at ${tx.occurredAt} has no player IDs`);
    }
  }

  // Verificar periods
  if (!rawData.periodStart || !rawData.periodEnd) {
    errors.push('Period dates are required for summaries');
  }

  return { valid: errors.length === 0, errors };
}
```

---

### Recomendacao 5: Logging Estruturado

**Prioridade:** MEDIUM
**Esforco:** Baixo (0.5 dia)

**Implementacao:**
```typescript
import { logger } from '@api/utils/logger';

// Em vez de console.error
logger.error({
  step: 'STEP 4',
  operation: 'insert_transactions',
  error: error.message,
  batch_size: batch.length,
  import_id: importId,
});
```

---

## Apendice A: Helper Functions

### deduplicateByKey
```typescript
const deduplicateByKey = <T>(array: T[], keyFn: (item: T) => string): T[] => {
  const map = new Map<string, T>();
  for (const item of array) {
    map.set(keyFn(item), item);  // Mantem ULTIMA ocorrencia
  }
  return Array.from(map.values());
};
```

### parseTimestamp
```typescript
const parseTimestamp = (value: string | null | undefined): string | null => {
  if (!value || value === "") return null;
  return value;  // Apenas verifica se vazio, NAO valida formato!
};
```

**GAP:** parseTimestamp nao valida se a string e uma data valida.

### chunkArray
```typescript
const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};
```

---

## Apendice B: Tabelas Afetadas

| Tabela | Operacao | Conflict Strategy |
|--------|----------|-------------------|
| poker_week_periods | UPSERT | team_id,week_start |
| poker_players | UPSERT | pppoker_id,team_id |
| poker_chip_transactions | INSERT | - |
| poker_sessions | UPSERT | external_id,team_id |
| poker_session_players | UPSERT | session_id,player_id |
| poker_player_summary | UPSERT | player_id,period_start,period_end |
| poker_player_detailed | UPSERT | player_id,period_start,period_end,date |
| poker_agent_rakeback | UPSERT | team_id,agent_pppoker_id,period_start,period_end |
| poker_demonstrativo | INSERT | - |

---

## Conclusao

A auditoria do processamento revela **problemas criticos de atomicidade e duplicacao** que podem levar a dados inconsistentes no banco.

**Principais descobertas:**
1. Nenhuma transacao atomica - falhas parciais deixam dados inconsistentes
2. INSERT simples para transactions e demonstrativo - duplicatas possiveis
3. Performance ruim em updates individuais (STEP 3.5 e 12)
4. Validacao pre-processamento praticamente inexistente

**Combinando com a auditoria 02-01:**
- Backend nao valida estrutura de dados (02-01)
- Backend nao valida antes de processar (02-02)
- Resultado: dados invalidos podem ser inseridos no banco

**Risco para o negocio:** CRITICO
- Re-imports criam duplicatas
- Falhas parciais corrompem estado
- Calculos financeiros podem estar incorretos
- Dificil auditar o que foi importado

**Proximos passos recomendados:**
1. [URGENTE] Implementar transacao atomica ou saga
2. [URGENTE] Adicionar upsert para transactions e demonstrativo
3. [ALTO] Validar dados antes de processar
4. [MEDIO] Otimizar updates em batch
5. [MEDIO] Melhorar logging

---

*Documento gerado em: 2026-01-22*
*Autor: Auditoria Automatizada de Processamento*
*Versao: 1.0*
