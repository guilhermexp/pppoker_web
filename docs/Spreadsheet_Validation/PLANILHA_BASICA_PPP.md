# Planilha Basica PPP - Documentacao Completa

> **Ultima atualizacao**: 27/12/2025 (v2 - com campos adicionados)
> **Baseado no codigo**: `apps/dashboard/src/components/poker/import-uploader.tsx` e `apps/api/src/trpc/routers/poker/imports.ts`

---

## Visao Geral

O validador de clubes PPPoker processa arquivos Excel (.xlsx) exportados pelo PPPoker com dados de um **unico clube**. O arquivo contem 7 abas com estruturas diferentes.

### Tabelas do Banco de Dados

| Tabela | Descricao | Origem |
|--------|-----------|--------|
| `poker_players` | Cadastro de jogadores e agentes | Geral, Detalhes do usuario, Partidas |
| `poker_sessions` | Sessoes/partidas de jogo | Partidas |
| `poker_session_players` | Jogadores por sessao (detalhes) | Partidas |
| `poker_player_summary` | Resumo por jogador por periodo | Geral |
| `poker_player_detailed` | Breakdown detalhado por dia | Detalhado |
| `poker_chip_transactions` | Movimentacoes de fichas/credito | Transacoes |
| `poker_agent_rakeback` | Rakeback por agente | Retorno de taxa |
| `poker_demonstrativo` | Histórico de movimentações | Demonstrativo |
| `poker_imports` | Controle de importacoes | Sistema |

---

## Estrutura do Arquivo Excel

| Aba | Colunas | Descricao | Status |
|-----|---------|-----------|--------|
| Geral | 48 (A-AV) | Resumo por jogador com ganhos/rake por tipo de jogo | ✅ Implementado |
| Detalhado | 137 (A-EG) | Breakdown granular por variante de jogo | ✅ Implementado |
| Partidas | Variavel | Sessoes de jogo - estrutura aninhada | ✅ Implementado |
| Transacoes | 21 (A-U) | Movimentacoes de fichas/credito | ⚠️ Parcial |
| Detalhes do usuario | 12 (A-L) | Cadastro de jogadores | ✅ Implementado |
| Retorno de taxa | 7 | Configuracao de rakeback por agente | ✅ Implementado |
| Demonstrativo | 6 | Histórico de movimentações | ✅ Implementado |

---

## ABA GERAL (48 colunas A-AV)

**Fonte**: `parseGeralSheet()` linha 887
**Destino**: `poker_player_summary` + extrai agentes para `poker_players`

### Identificacao do Jogador (A-I)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| A | (indice) | - | - | Ignorado |
| B | ppPokerId | pppoker_id | poker_players | ✅ Salvo |
| C | country | country | poker_players | ✅ Salvo |
| D | nickname | nickname | poker_players | ✅ Salvo |
| E | memoName | memo_name | poker_players | ✅ Salvo |
| F | agentNickname | nickname | poker_players (agent) | ✅ Salvo |
| G | agentPpPokerId | pppoker_id | poker_players (agent) | ✅ Salvo |
| H | superAgentNickname | nickname | poker_players (super_agent) | ✅ Salvo |
| I | superAgentPpPokerId | pppoker_id | poker_players (super_agent) | ✅ Salvo |

### Classificacoes (J-N)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| J | playerWinningsTotal | winnings_total | poker_player_summary | ✅ Salvo (como generalTotal) |
| K | classificationPpsr | classification_ppsr | poker_player_summary | ✅ Salvo |
| L | classificationRing | classification_ring | poker_player_summary | ✅ Salvo |
| M | classificationCustomRing | classification_custom_ring | poker_player_summary | ✅ Salvo |
| N | classificationMtt | classification_mtt | poker_player_summary | ✅ Salvo |

### Ganhos do Jogador (O-X)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| O | generalTotal | winnings_total, winnings_general | poker_player_summary | ✅ Salvo |
| P | ringGamesTotal | winnings_ring | poker_player_summary | ✅ Salvo |
| Q | mttSitNGoTotal | winnings_mtt_sitgo | poker_player_summary | ✅ Salvo |
| R | spinUpTotal | winnings_spinup | poker_player_summary | ✅ Salvo |
| S | caribbeanTotal | winnings_caribbean | poker_player_summary | ✅ Salvo |
| T | colorGameTotal | winnings_color_game | poker_player_summary | ✅ Salvo |
| U | crashTotal | winnings_crash | poker_player_summary | ✅ Salvo |
| V | luckyDrawTotal | winnings_lucky_draw | poker_player_summary | ✅ Salvo |
| W | jackpotTotal | winnings_jackpot | poker_player_summary | ✅ Salvo |
| X | evSplitTotal | winnings_ev_split | poker_player_summary | ✅ Salvo |

### Tickets (Y-AA)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| Y | ticketValueWon | ticket_value_won | poker_player_summary | ✅ Salvo |
| Z | ticketBuyIn | ticket_buy_in | poker_player_summary | ✅ Salvo |
| AA | customPrizeValue | custom_prize_value | poker_player_summary | ✅ Salvo |

### Taxas (AB-AG)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| AB | feeGeneral | club_earnings_general, rake_total | poker_player_summary | ✅ Salvo |
| AC | fee | rake_total | poker_player_summary | ✅ Salvo (fallback) |
| AD | feePpst | rake_ppst | poker_player_summary | ✅ Salvo |
| AE | feeNonPpst | rake_non_ppst | poker_player_summary | ✅ Salvo |
| AF | feePpsr | rake_ppsr | poker_player_summary | ✅ Salvo |
| AG | feeNonPpsr | rake_non_ppsr | poker_player_summary | ✅ Salvo |

### SPINUP & Caribbean (AH-AK)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| AH | spinUpBuyIn | spinup_buy_in | poker_player_summary | ✅ Salvo |
| AI | spinUpPrize | spinup_prize | poker_player_summary | ✅ Salvo |
| AJ | caribbeanBets | caribbean_bets | poker_player_summary | ✅ Salvo |
| AK | caribbeanPrize | caribbean_prize | poker_player_summary | ✅ Salvo |

### Ganhos do Clube (AL-AQ)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| AL | colorGameBets | color_game_bets | poker_player_summary | ✅ Salvo |
| AM | colorGamePrize | color_game_prize | poker_player_summary | ✅ Salvo |
| AN | crashBets | crash_bets | poker_player_summary | ✅ Salvo |
| AO | crashPrize | crash_prize | poker_player_summary | ✅ Salvo |
| AP | luckyDrawBets | lucky_draw_bets | poker_player_summary | ✅ Salvo |
| AQ | luckyDrawPrize | lucky_draw_prize | poker_player_summary | ✅ Salvo |

### Jackpot e Finais (AR-AV)

| Col | Campo Parsed | Campo DB | Tabela | Status |
|-----|--------------|----------|--------|--------|
| AR | jackpotFee | club_earnings_jackpot | poker_player_summary | ✅ Salvo |
| AS | jackpotPrize | winnings_jackpot | poker_player_summary | ✅ Salvo (fallback) |
| AT | evSplit | ev_split | poker_player_summary | ✅ Salvo |
| AU | ticketDeliveredValue | ticket_delivered_value | poker_player_summary | ✅ Salvo |
| AV | ticketDeliveredBuyIn | ticket_delivered_buy_in | poker_player_summary | ✅ Salvo |

### Resumo Aba Geral

| Categoria | Total Cols | Salvas | Nao Salvas |
|-----------|------------|--------|------------|
| Identificacao (A-I) | 9 | 8 | 1 (indice) |
| Classificacoes (J-N) | 5 | 5 | 0 |
| Ganhos Jogador (O-X) | 10 | 10 | 0 |
| Tickets (Y-AA) | 3 | 3 | 0 |
| Taxas (AB-AG) | 6 | 6 | 0 |
| SPINUP/Caribbean (AH-AK) | 4 | 4 | 0 |
| Ganhos Clube (AL-AQ) | 6 | 6 | 0 |
| Jackpot/Finais (AR-AV) | 5 | 5 | 0 |
| **TOTAL** | **48** | **47** | **1** |

---

## ABA DETALHADO (137 colunas A-EG)

**Fonte**: `parseDetalhadoSheet()` linha 1212
**Destino**: `poker_player_detailed`

### Identificacao (A-I) - 9 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| A | date | date | ✅ Salvo |
| B | ppPokerId | player_id (FK) | ✅ Salvo |
| C | country | - | ❌ NAO SALVO (ja em poker_players) |
| D | nickname | - | ❌ NAO SALVO (ja em poker_players) |
| E | memoName | - | ❌ NAO SALVO (ja em poker_players) |
| F | agentNickname | - | ❌ NAO SALVO |
| G | agentPpPokerId | - | ❌ NAO SALVO |
| H | superAgentNickname | - | ❌ NAO SALVO |
| I | superAgentPpPokerId | - | ❌ NAO SALVO |

### Ganhos NLHoldem (J-R) - 9 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| J | nlhRegular | nlh_regular | ✅ Salvo |
| K | nlhThreeOne | nlh_three_one | ✅ Salvo |
| L | nlhThreeOneF | nlh_three_one_f | ✅ Salvo |
| M | nlhSixPlus | nlh_six_plus | ✅ Salvo |
| N | nlhAof | nlh_aof | ✅ Salvo |
| O | nlhSitNGo | nlh_sitng | ✅ Salvo |
| P | nlhSpinUp | nlh_spinup | ✅ Salvo |
| Q | nlhMtt | nlh_mtt | ✅ Salvo |
| R | nlhMttSixPlus | nlh_mtt_six_plus | ✅ Salvo |

### Ganhos PLO (S-AB) - 10 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| S | plo4 | plo4 | ✅ Salvo |
| T | plo5 | plo5 | ✅ Salvo |
| U | plo6 | plo6 | ✅ Salvo |
| V | plo4Hilo | plo4_hilo | ✅ Salvo |
| W | plo5Hilo | plo5_hilo | ✅ Salvo |
| X | plo6Hilo | plo6_hilo | ✅ Salvo |
| Y | ploSitNGo | plo_sitng | ✅ Salvo |
| Z | ploMttPlo4 | plo_mtt_plo4 | ✅ Salvo |
| AA | ploMttPlo5 | plo_mtt_plo5 | ✅ Salvo |
| AB | ploNlh | plo_nlh | ✅ Salvo |

### FLASH e Outros (AC-AO) - 13 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| AC | flashPlo4 | flash_plo4 | ✅ Salvo |
| AD | flashPlo5 | flash_plo5 | ✅ Salvo |
| AE | mixedGame | mixed_game | ✅ Salvo |
| AF | ofc | ofc | ✅ Salvo |
| AG | seka36 | seka_36 | ✅ Salvo |
| AH | seka32 | seka_32 | ✅ Salvo |
| AI | seka21 | seka_21 | ✅ Salvo |
| AJ | teenPattiRegular | teen_patti_regular | ✅ Salvo |
| AK | teenPattiAk47 | teen_patti_ak47 | ✅ Salvo |
| AL | teenPattiHukam | teen_patti_hukam | ✅ Salvo |
| AM | teenPattiMuflis | teen_patti_muflis | ✅ Salvo |
| AN | tongits | tongits | ✅ Salvo |
| AO | pusoy | pusoy | ✅ Salvo |

### Cassino (AP-AU) - 6 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| AP | caribbean | caribbean | ✅ Salvo |
| AQ | colorGame | color_game | ✅ Salvo |
| AR | crash | crash | ✅ Salvo |
| AS | luckyDraw | lucky_draw | ✅ Salvo |
| AT | jackpot | jackpot | ✅ Salvo |
| AU | evSplitWinnings | ev_split_winnings | ✅ Salvo |

### Total e Classificacoes (AV-AZ) - 5 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| AV | totalWinnings | total_winnings | ✅ Salvo |
| AW | classificationPpsr | classification_ppsr | ✅ Salvo |
| AX | classificationRing | classification_ring | ✅ Salvo |
| AY | classificationCustomRing | classification_custom_ring | ✅ Salvo |
| AZ | classificationMtt | classification_mtt | ✅ Salvo |

### Valores Gerais (BA-BD) - 4 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| BA | generalPlusEvents | general_plus_events | ✅ Salvo |
| BB | ticketValueWon | ticket_value_won | ✅ Salvo |
| BC | ticketBuyIn | ticket_buy_in | ✅ Salvo |
| BD | customPrizeValue | custom_prize_value | ✅ Salvo |

### Taxa por Variante (BE-CJ) - 34 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| BE-CJ | fee* (34 campos) | - | ❌ NAO SALVO (apenas feeTotal em CJ) |
| CJ | feeTotal | fee_total | ✅ Salvo |

### SPINUP (CK-CL) - 2 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CK | spinUpBuyIn | spinup_buy_in | ✅ Salvo |
| CL | spinUpPrize | spinup_prize | ✅ Salvo |

### Jackpot (CM-CN) - 2 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CM | jackpotFee | jackpot_fee | ✅ Salvo |
| CN | jackpotPrize | jackpot_prize | ✅ Salvo |

### EV Split (CO-CQ) - 3 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CO | evSplitNlh | ev_split_nlh | ✅ Salvo |
| CP | evSplitPlo | ev_split_plo | ✅ Salvo |
| CQ | evSplitTotal | ev_split_total | ✅ Salvo |

### Ticket Entregue (CR) - 1 coluna

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CR | ticketDeliveredValue | - | ❌ NAO SALVO |

### Fichas (CS-CY) - 7 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CS | chipTicketBuyIn | - | ❌ NAO SALVO |
| CT | chipSent | chip_sent | ✅ Salvo |
| CU | chipClassPpsr | - | ❌ NAO SALVO |
| CV | chipClassRing | - | ❌ NAO SALVO |
| CW | chipClassCustomRing | - | ❌ NAO SALVO |
| CX | chipClassMtt | - | ❌ NAO SALVO |
| CY | chipRedeemed | chip_redeemed | ✅ Salvo |

### Credito (CZ-DC) - 4 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| CZ | creditLeftClub | credit_left_club | ✅ Salvo |
| DA | creditSent | credit_sent | ✅ Salvo |
| DB | creditRedeemed | credit_redeemed | ✅ Salvo |
| DC | creditLeftClub2 | - | ❌ NAO SALVO (duplicado) |

### Maos por Variante (DD-EG) - 36 colunas

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| DD-EF | hands* (35 campos) | - | ❌ NAO SALVO |
| EG | handsTotal | hands_total | ✅ Salvo |

### Resumo Aba Detalhado

| Categoria | Total Cols | Salvas | Nao Salvas |
|-----------|------------|--------|------------|
| Identificacao (A-I) | 9 | 2 | 7 |
| Ganhos NLH (J-R) | 9 | 9 | 0 |
| Ganhos PLO (S-AB) | 10 | 10 | 0 |
| FLASH/Outros (AC-AO) | 13 | 13 | 0 |
| Cassino (AP-AU) | 6 | 6 | 0 |
| Total/Class (AV-AZ) | 5 | 5 | 0 |
| Valores Gerais (BA-BD) | 4 | 4 | 0 |
| Taxa por Variante (BE-CI) | 33 | 0 | 33 |
| Taxa Total (CJ) | 1 | 1 | 0 |
| SPINUP (CK-CL) | 2 | 2 | 0 |
| Jackpot (CM-CN) | 2 | 2 | 0 |
| EV Split (CO-CQ) | 3 | 3 | 0 |
| Ticket Entregue (CR) | 1 | 0 | 1 |
| Fichas (CS-CY) | 7 | 2 | 5 |
| Credito (CZ-DC) | 4 | 3 | 1 |
| Maos (DD-EF) | 35 | 0 | 35 |
| Maos Total (EG) | 1 | 1 | 0 |
| **TOTAL** | **137** | **63** | **74** |

---

## ABA PARTIDAS (Estrutura Aninhada)

**Fonte**: `parsePartidasSheet()` linha 295
**Destino**: `poker_sessions` + `poker_session_players`

### Estrutura de uma Sessao

```
Linha N:   [UTC] | Inicio: YYYY/MM/DD HH:MM | By ppNickname(ID) | Fim: YYYY/MM/DD HH:MM
Linha N+1: [vazio] | ID do jogo: XXX | Nome da mesa: YYY
Linha N+2: [vazio] | TIPO/VARIANTE Buy-in: X+Y Premiacao Garantida: Z
Linha N+3+: [vazio] | ID | Apelido | Memorando | [dados jogador...]
```

### Dados da Sessao -> `poker_sessions`

| Campo Parsed | DB Column | Status |
|--------------|-----------|--------|
| externalId | external_id | ✅ Salvo |
| tableName | table_name | ✅ Salvo |
| sessionType | session_type | ✅ Salvo |
| gameVariant | game_variant | ✅ Salvo |
| startedAt | started_at | ✅ Salvo |
| endedAt | ended_at | ✅ Salvo |
| blinds | blinds | ✅ Salvo |
| buyInAmount | buy_in_amount | ✅ Salvo |
| guaranteedPrize | guaranteed_prize | ✅ Salvo |
| totalRake | total_rake | ✅ Salvo |
| totalBuyIn | total_buy_in | ✅ Salvo |
| totalWinnings | total_cash_out | ✅ Salvo (calculado) |
| playerCount | player_count | ✅ Salvo |
| handsPlayed | hands_played | ✅ Salvo |
| createdByPpPokerId | created_by_id | ✅ Salvo (FK) |
| rakePercent | - | ❌ NAO SALVO |
| rakeCap | - | ❌ NAO SALVO |
| timeLimit | - | ❌ NAO SALVO |
| createdByNickname | - | ❌ NAO SALVO |

### Dados do Jogador por Sessao -> `poker_session_players`

#### Tipo CASH (14 colunas)

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| B | ppPokerId | player_id (FK) | ✅ Salvo |
| C | nickname | - | ❌ NAO SALVO (ja em poker_players) |
| D | memoName | - | ❌ NAO SALVO (ja em poker_players) |
| E | buyIn | buy_in_chips | ✅ Salvo |
| F | hands | hands | ✅ Salvo |
| G | winningsGeneral | winnings | ✅ Salvo (calculado) |
| H | winningsOpponents | winnings_opponents | ✅ Salvo |
| I | winningsJackpot | winnings_jackpot | ✅ Salvo |
| J | winningsEvSplit | winnings_ev_split | ✅ Salvo |
| K | clubWinningsGeneral | - | ❌ NAO SALVO (calculavel) |
| L | clubWinningsFee | rake | ✅ Salvo |
| M | clubWinningsJackpotFee | club_winnings_jackpot_fee | ✅ Salvo |
| N | clubWinningsJackpotPrize | club_winnings_jackpot_prize | ✅ Salvo |
| O | clubWinningsEvSplit | club_winnings_ev_split | ✅ Salvo |

#### Tipo MTT/SITNG (8 colunas)

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| B | ppPokerId | player_id (FK) | ✅ Salvo |
| C | nickname | - | ❌ NAO SALVO |
| D | memoName | - | ❌ NAO SALVO |
| E | ranking | ranking | ✅ Salvo |
| F | buyInChips | buy_in_chips | ✅ Salvo |
| G | buyInTicket | buy_in_ticket | ✅ Salvo |
| H | winnings | winnings | ✅ Salvo |
| I | rake | rake | ✅ Salvo |

#### Tipo SPIN (7 colunas)

| Col | Campo | DB Column | Status |
|-----|-------|-----------|--------|
| B | ppPokerId | player_id (FK) | ✅ Salvo |
| C | nickname | - | ❌ NAO SALVO |
| D | memoName | - | ❌ NAO SALVO |
| E | ranking | ranking | ✅ Salvo |
| F | buyInChips | buy_in_chips | ✅ Salvo |
| G | prize | prize | ✅ Salvo |
| H | winnings | winnings | ✅ Salvo |

### Colunas em `poker_session_players` (Atualizadas)

Novas colunas adicionadas e preenchidas na importacao:

| DB Column | Tipo | Descricao | Status |
|-----------|------|-----------|--------|
| hands | integer | Maos jogadas | ✅ PREENCHIDO |
| winnings_opponents | numeric | Ganhos contra oponentes | ✅ PREENCHIDO |
| winnings_jackpot | numeric | Ganhos de jackpot | ✅ PREENCHIDO |
| winnings_ev_split | numeric | Ganhos de EV split | ✅ PREENCHIDO |
| club_winnings_jackpot_fee | numeric | Taxa jackpot clube | ✅ PREENCHIDO |
| club_winnings_jackpot_prize | numeric | Premio jackpot clube | ✅ PREENCHIDO |
| club_winnings_ev_split | numeric | EV split clube | ✅ PREENCHIDO |
| bounty | numeric | Bounty (PKO) | ✅ PREENCHIDO |
| prize | numeric | Premio (SPIN) | ✅ PREENCHIDO |
| rake_ppst | numeric | Rake PPST | ⚠️ Disponivel mas nao mapeado |
| rake_ppsr | numeric | Rake PPSR | ⚠️ Disponivel mas nao mapeado |

---

## ABA TRANSACOES (21 colunas A-U)

**Fonte**: `parseTransacoesSheet()` linha 1483
**Destino**: `poker_chip_transactions`

| Col | Campo Parsed | DB Column | Status |
|-----|--------------|-----------|--------|
| A | occurredAt | occurred_at | ✅ Salvo |
| B | senderClubId | sender_club_id | ✅ Salvo |
| C | senderPlayerId | sender_player_id | ✅ Salvo (FK) |
| D | senderNickname | - | ❌ NAO SALVO (ja em poker_players) |
| E | senderMemoName | - | ❌ NAO SALVO (ja em poker_players) |
| F | recipientPlayerId | recipient_player_id | ✅ Salvo (FK) |
| G | recipientNickname | - | ❌ NAO SALVO (ja em poker_players) |
| H | recipientMemoName | - | ❌ NAO SALVO (ja em poker_players) |
| I | creditSent | credit_sent | ✅ Salvo |
| J | creditRedeemed | credit_redeemed | ✅ Salvo |
| K | creditLeftClub | credit_left_club | ✅ Salvo |
| L | chipsSent | chips_sent | ✅ Salvo |
| M | classificationPpsr | chips_ppsr | ✅ Salvo |
| N | classificationRing | chips_ring | ✅ Salvo |
| O | classificationCustomRing | chips_custom_ring | ✅ Salvo |
| P | classificationMtt | chips_mtt | ✅ Salvo |
| Q | chipsRedeemed | chips_redeemed | ✅ Salvo |
| R | chipsLeftClub | chips_left_club | ✅ Salvo |
| S | ticketSent | ticket_sent | ✅ Salvo |
| T | ticketRedeemed | ticket_redeemed | ✅ Salvo |
| U | ticketExpired | ticket_expired | ✅ Salvo |

### Resumo Aba Transacoes

| Total Cols | Salvas | Nao Salvas |
|------------|--------|------------|
| 21 | 17 | 4 (nicknames/memos redundantes) |

---

## ABA DETALHES DO USUARIO (12 colunas A-L)

**Fonte**: `parseUserDetailsSheet()` linha 1411
**Destino**: `poker_players`

| Col | Campo Parsed | DB Column | Status |
|-----|--------------|-----------|--------|
| A | lastActiveAt | last_active_at | ✅ Salvo |
| B | ppPokerId | pppoker_id | ✅ Salvo |
| C | country | country | ✅ Salvo |
| D | nickname | nickname | ✅ Salvo |
| E | memoName | memo_name | ✅ Salvo |
| F | chipBalance | chip_balance | ✅ Salvo |
| G | agentNickname | - | ❌ NAO SALVO (usado p/ relacionar) |
| H | agentPpPokerId | agent_id | ✅ Salvo (FK) |
| I | agentCreditBalance | agent_credit_balance | ✅ Salvo |
| J | superAgentNickname | - | ❌ NAO SALVO |
| K | superAgentPpPokerId | super_agent_id | ✅ Salvo (FK) |
| L | superAgentCreditBalance | - | ❌ NAO SALVO |

### Resumo Aba Detalhes do Usuario

| Total Cols | Salvas | Nao Salvas |
|------------|--------|------------|
| 12 | 9 | 3 |

---

## ABA RETORNO DE TAXA (7 colunas B-H)

**Fonte**: `parseRakebackSheet()` linha 1585
**Destino**: `poker_agent_rakeback`

| Col | Campo Parsed | DB Column | Status |
|-----|--------------|-----------|--------|
| A | (vazio) | - | Ignorado |
| B | superAgentPpPokerId | super_agent_pppoker_id, super_agent_id | ✅ Salvo |
| C | agentPpPokerId | agent_pppoker_id, agent_id | ✅ Salvo |
| D | country | country | ✅ Salvo |
| E | agentNickname | agent_nickname | ✅ Salvo |
| F | memoName | memo_name | ✅ Salvo |
| G | averageRakebackPercent | average_rakeback_percent | ✅ Salvo |
| H | totalRt | total_rt | ✅ Salvo |

### Resumo Aba Retorno de Taxa

| Total Cols | Salvas | Nao Salvas |
|------------|--------|------------|
| 7 | 7 | 0 |

---

## ABA DEMONSTRATIVO (6 colunas)

**Fonte**: `parseDemonstrativoSheet()` linha 1556
**Destino**: `poker_demonstrativo`

| Col | Campo Parsed | DB Column | Status |
|-----|--------------|-----------|--------|
| A | occurredAt | occurred_at | ✅ Salvo |
| B | ppPokerId | pppoker_id, player_id (FK) | ✅ Salvo |
| C | nickname | nickname | ✅ Salvo |
| D | memoName | memo_name | ✅ Salvo |
| E | type | type | ✅ Salvo |
| F | amount | amount | ✅ Salvo |

### Resumo Aba Demonstrativo

| Total Cols | Salvas | Nao Salvas |
|------------|--------|------------|
| 6 | 6 | 0 |

---

## RESUMO GERAL DE MAPEAMENTO

### Por Aba

| Aba | Total Cols | Salvas | % Salvo |
|-----|------------|--------|---------|
| Geral | 48 | 47 | 98% |
| Detalhado | 137 | 134 | **98%** |
| Partidas (sessao) | 14 | 14 | 100% |
| Partidas (jogador CASH) | 14 | 13 | **93%** |
| Partidas (jogador MTT) | 8 | 6 | 75% |
| Partidas (jogador SPIN) | 7 | 6 | 86% |
| Transacoes | 21 | 17 | 81% |
| Detalhes do usuario | 12 | 9 | 75% |
| Retorno de taxa | 7 | 7 | 100% |
| Demonstrativo | 6 | 6 | 100% |

### Campos NAO salvos (redundantes)

| Campo | Aba | Motivo |
|-------|-----|--------|
| nickname/memoName | Varios | Ja armazenados em poker_players (FK player_id) |
| agentNickname/agentPpPokerId | Detalhado | Ja em poker_players via agent_id |
| creditLeftClub2 | Detalhado | Duplicado de creditLeftClub |

---

## FLUXO DE IMPORTACAO

```
1. Upload arquivo .xlsx

2. Parser XLSX processa cada aba:
   - parseGeralSheet() -> summaries[]
   - parseDetalhadoSheet() -> detailed[]
   - parsePartidasSheet() -> sessions[] (com players[])
   - parseTransacoesSheet() -> transactions[]
   - parseUserDetailsSheet() -> players[]
   - parseRakebackSheet() -> rakebacks[]
   - parseDemonstrativoSheet() -> demonstrativo[] (ignorado)

3. validateImportData() executa regras de validacao

4. Modal exibe 10 abas para revisao

5. Usuario aprova -> tRPC imports.process()

6. Backend processa em 11 steps:
   - STEP 1: Upsert jogadores (de players[])
   - STEP 2: Extrair e upsert agentes (de summaries[])
   - STEP 2.5: Upsert jogadores (de summaries[])
   - STEP 2.6: Upsert jogadores (de sessions[].players[])
   - STEP 3: Criar mapa playerIdMap
   - STEP 3.5: Linkar jogadores aos agentes
   - STEP 4: Inserir transacoes
   - STEP 5: Upsert sessoes
   - STEP 6: Criar mapa sessionIdMap
   - STEP 7: Upsert session_players
   - STEP 8: Upsert player_summary (de summaries[])
   - STEP 9: Upsert player_detailed (de detailed[])
   - STEP 10: Upsert agent_rakeback (de rakebacks[])
   - STEP 11: Inserir demonstrativo (de demonstrativo[])
```

---

## PROBLEMAS CONHECIDOS

### 1. Limite de 1000 Linhas do Supabase

**Status**: ✅ CORRIGIDO em 27/12/2025

Queries que buscam todos os registros precisam de `.limit(50000)` para evitar o limite padrao de 1000 linhas do Supabase.

Arquivos corrigidos:
- `apps/api/src/trpc/routers/poker/imports.ts` (STEP 3 e STEP 6)
- `apps/api/src/trpc/routers/poker/analytics.ts`
- `apps/api/src/trpc/routers/poker/sessions.ts`
- `apps/api/src/trpc/routers/poker/players.ts`

### 2. Campos Adicionados (v2)

**Status**: ✅ CORRIGIDO em 27/12/2025

Migracao `add_missing_poker_import_columns` adicionou campos faltantes:

**poker_session_players:**
- hands, winnings_opponents, winnings_jackpot, winnings_ev_split
- club_winnings_jackpot_fee, club_winnings_jackpot_prize, club_winnings_ev_split
- bounty (PKO), prize (SPIN)

**poker_player_summary:**
- classification_ppsr, classification_ring, classification_custom_ring, classification_mtt
- ticket_value_won, ticket_buy_in, custom_prize_value
- spinup_buy_in, spinup_prize, caribbean_bets, caribbean_prize
- color_game_bets, color_game_prize, crash_bets, crash_prize
- lucky_draw_bets, lucky_draw_prize, ev_split
- ticket_delivered_value, ticket_delivered_buy_in, rake_non_ppsr

**poker_chip_transactions:**
- chips_left_club, ticket_sent, ticket_redeemed, ticket_expired

**poker_demonstrativo (NOVA TABELA):**
- occurred_at, player_id, pppoker_id, nickname, memo_name, type, amount, import_id

### 3. Campos Granulares Adicionados (v3)

**Status**: ✅ CORRIGIDO em 27/12/2025

Migracao `add_all_missing_detailed_columns` adicionou campos granulares:

**poker_player_detailed (74 novas colunas):**

*Taxa por variante (33 colunas BE-CI):*
- fee_nlh_regular, fee_nlh_three_one, fee_nlh_three_one_f, fee_nlh_six_plus, fee_nlh_aof
- fee_nlh_sitng, fee_nlh_spinup, fee_nlh_mtt, fee_nlh_mtt_six_plus
- fee_plo4, fee_plo5, fee_plo6, fee_plo4_hilo, fee_plo5_hilo, fee_plo6_hilo
- fee_plo_sitng, fee_plo_mtt_plo4, fee_plo_mtt_plo5
- fee_flash_nlh, fee_flash_plo4, fee_flash_plo5, fee_mixed_game, fee_ofc
- fee_seka_36, fee_seka_32, fee_seka_21
- fee_teen_patti_regular, fee_teen_patti_ak47, fee_teen_patti_hukam, fee_teen_patti_muflis
- fee_tongits, fee_pusoy

*Maos por variante (35 colunas DD-EF):*
- hands_nlh_regular, hands_nlh_three_one, hands_nlh_three_one_f, hands_nlh_six_plus, hands_nlh_aof
- hands_plo4, hands_plo5, hands_plo6, hands_plo4_hilo, hands_plo5_hilo, hands_plo6_hilo
- hands_flash_nlh, hands_flash_plo4, hands_flash_plo5, hands_mixed_game, hands_ofc
- hands_seka_36, hands_seka_32, hands_seka_21
- hands_teen_patti_regular, hands_teen_patti_ak47, hands_teen_patti_hukam, hands_teen_patti_muflis
- hands_tongits, hands_pusoy, hands_caribbean, hands_color_game, hands_crash, hands_lucky_draw

*Outros campos:*
- ticket_delivered_value, chip_ticket_buy_in
- chip_class_ppsr, chip_class_ring, chip_class_custom_ring, chip_class_mtt

**poker_session_players:**
- club_winnings_general

---

## ARQUIVOS DE CODIGO

| Arquivo | Descricao |
|---------|-----------|
| `components/poker/import-uploader.tsx` | Parser principal (todas as funcoes parse*) |
| `components/poker/import-validation-modal.tsx` | Modal de validacao |
| `lib/poker/types.ts` | Tipos TypeScript |
| `lib/poker/validation.ts` | Engine de validacao |
| `api/trpc/routers/poker/imports.ts` | Backend de processamento |
| `components/poker/validation-tabs/*.tsx` | Abas do modal |
