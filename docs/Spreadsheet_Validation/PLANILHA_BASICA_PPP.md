# Planilha Basica PPP - Documentacao Atualizada

> Ultima atualizacao: 22/12/2025
> Baseado no codigo implementado em `apps/dashboard/src/components/poker/import-uploader.tsx`

## Visao Geral

O validador de clubes PPPoker processa arquivos Excel (.xlsx) exportados pelo PPPoker com dados de um **unico clube**. O arquivo contem 7 abas com estruturas diferentes.

---

## Estrutura do Arquivo Excel

| Aba | Colunas | Descricao | Status |
|-----|---------|-----------|--------|
| Geral | 48 (A-AV) | Resumo por jogador com ganhos/rake por tipo de jogo | Implementado |
| Detalhado | 137 (A-EG) | Breakdown granular por variante de jogo | Implementado |
| Partidas | Variavel | Sessoes de jogo - estrutura aninhada | Implementado |
| Transacoes | 21 (A-U) | Movimentacoes de fichas/credito | Implementado |
| Detalhes do usuario | 12 (A-L) | Cadastro de jogadores | Implementado |
| Retorno de taxa | 7 | Configuracao de rakeback por agente | Implementado |
| Demonstrativo | 6 | Disclaimer legal (ignorado) | Ignorado |

---

## Aba Geral (48 colunas A-AV)

Implementado em `validation-tabs/general-tab.tsx`

### Identificacao (A-I)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 1 | B | ppPokerId | id |
| 2 | C | country | text |
| 3 | D | nickname | text |
| 4 | E | memoName | text |
| 5 | F | agentNickname | text |
| 6 | G | agentPpPokerId | id |
| 7 | H | superAgentNickname | text |
| 8 | I | superAgentPpPokerId | id |

### Classificacoes (J-N)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 9 | J | playerWinningsTotal | currency |
| 10 | K | classificationPpsr | number |
| 11 | L | classificationRing | number |
| 12 | M | classificationCustomRing | number |
| 13 | N | classificationMtt | number |

### Ganhos do Jogador (O-X)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 14 | O | generalTotal | currency |
| 15 | P | ringGamesTotal | currency |
| 16 | Q | mttSitNGoTotal | currency |
| 17 | R | spinUpTotal | currency |
| 18 | S | caribbeanTotal | currency |
| 19 | T | colorGameTotal | currency |
| 20 | U | crashTotal | currency |
| 21 | V | luckyDrawTotal | currency |
| 22 | W | jackpotTotal | currency |
| 23 | X | evSplitTotal | currency |

### Tickets (Y-AA)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 24 | Y | ticketValueWon | currency |
| 25 | Z | ticketBuyIn | currency |
| 26 | AA | customPrizeValue | currency |

### Taxas (AB-AG)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 27 | AB | feeGeneral | currency |
| 28 | AC | fee | currency |
| 29 | AD | feePpst | currency |
| 30 | AE | feeNonPpst | currency |
| 31 | AF | feePpsr | currency |
| 32 | AG | feeNonPpsr | currency |

### SPINUP & Caribbean (AH-AK)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 33 | AH | spinUpBuyIn | currency |
| 34 | AI | spinUpPrize | currency |
| 35 | AJ | caribbeanBets | currency |
| 36 | AK | caribbeanPrize | currency |

### Ganhos do Clube (AL-AQ)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 37 | AL | colorGameBets | currency |
| 38 | AM | colorGamePrize | currency |
| 39 | AN | crashBets | currency |
| 40 | AO | crashPrize | currency |
| 41 | AP | luckyDrawBets | currency |
| 42 | AQ | luckyDrawPrize | currency |

### Jackpot e Finais (AR-AV)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 43 | AR | jackpotFee | currency |
| 44 | AS | jackpotPrize | currency |
| 45 | AT | evSplit | currency |
| 46 | AU | ticketDeliveredValue | currency |
| 47 | AV | ticketDeliveredBuyIn | currency |

---

## Aba Detalhado (137 colunas A-EG)

Implementado em `validation-tabs/detailed-tab.tsx`

### Categorias de Jogos por Range de Colunas

| Categoria | Colunas | Jogos |
|-----------|---------|-------|
| NLHoldem | J-R | Regular (J), 3-1 (K), 3-1F (L), 6+ (M), AOF (N), SitNGo (O), SPINUP (P), MTT (Q), MTT 6+ (R) |
| PLO | S-AB | PLO4 (S), PLO5 (T), PLO6 (U), PLO4 H/L (V), PLO5 H/L (W), PLO6 H/L (X), SitNGo (Y), MTT PLO4 (Z), MTT PLO5 (AA), PLO NLH (AB) |
| FLASH | AC-AD | PLO4 (AC), PLO5 (AD) |
| Outros | AE-AF | Mixed Game (AE), OFC (AF) |
| SEKA | AG-AI | 36 (AG), 32 (AH), 21 (AI) |
| TEEN PATTI | AJ-AM | Regular (AJ), AK47 (AK), Hukam (AL), Muflis (AM) |
| Filipinos | AN-AO | Tongits (AN), Pusoy (AO) |
| Cassino | AP-AU | Caribbean+ (AP), Color Game (AQ), Crash (AR), Lucky Draw (AS), Jackpot (AT), Dividir EV (AU) |

### Estrutura Completa de Colunas

```typescript
const ALL_COLUMNS = [
  // Identificacao (A-I)
  { key: "date", label: "Data (A)", group: "Identificacao" },
  { key: "ppPokerId", label: "ID (B)", group: "Identificacao" },
  { key: "country", label: "Pais (C)", group: "Identificacao" },
  { key: "nickname", label: "Apelido (D)", group: "Identificacao" },
  { key: "memoName", label: "Memorando (E)", group: "Identificacao" },
  { key: "agentNickname", label: "Agente (F)", group: "Identificacao" },
  { key: "agentPpPokerId", label: "ID Agente (G)", group: "Identificacao" },
  { key: "superAgentNickname", label: "Superagente (H)", group: "Identificacao" },
  { key: "superAgentPpPokerId", label: "ID Super (I)", group: "Identificacao" },

  // NLH (J-R)
  { key: "nlhRegular", label: "NLH Reg (J)", group: "NLH" },
  { key: "nlhThreeOne", label: "NLH 3-1 (K)", group: "NLH" },
  { key: "nlhThreeOneF", label: "NLH 3-1F (L)", group: "NLH" },
  { key: "nlhSixPlus", label: "NLH 6+ (M)", group: "NLH" },
  { key: "nlhAof", label: "NLH AOF (N)", group: "NLH" },
  { key: "nlhSitNGo", label: "NLH SitNGo (O)", group: "NLH" },
  { key: "nlhSpinUp", label: "NLH SpinUp (P)", group: "NLH" },
  { key: "nlhMtt", label: "NLH MTT (Q)", group: "NLH" },
  { key: "nlhMttSixPlus", label: "NLH MTT 6+ (R)", group: "NLH" },

  // PLO (S-AE)
  { key: "plo4", label: "PLO4 (S)", group: "PLO" },
  { key: "plo5", label: "PLO5 (T)", group: "PLO" },
  { key: "plo6", label: "PLO6 (U)", group: "PLO" },
  { key: "plo4Hilo", label: "PLO4 H/L (V)", group: "PLO" },
  { key: "plo5Hilo", label: "PLO5 H/L (W)", group: "PLO" },
  { key: "plo6Hilo", label: "PLO6 H/L (X)", group: "PLO" },
  { key: "ploSitNGo", label: "PLO SitNGo (Y)", group: "PLO" },
  { key: "ploMttPlo4", label: "MTT PLO4 (Z)", group: "PLO" },
  { key: "ploMttPlo5", label: "MTT PLO5 (AA)", group: "PLO" },
  { key: "ploNlh", label: "PLO NLH (AB)", group: "PLO" },
  { key: "flashPlo4", label: "Flash PLO4 (AC)", group: "PLO" },
  { key: "flashPlo5", label: "Flash PLO5 (AD)", group: "PLO" },
  { key: "mixedGame", label: "Mixed (AE)", group: "PLO" },

  // Outros jogos (AF-AO)
  { key: "ofc", label: "OFC (AF)", group: "Outros" },
  { key: "seka36", label: "36 (AG)", group: "Outros" },
  { key: "seka32", label: "Seka 32 (AH)", group: "Outros" },
  { key: "seka21", label: "Seka 21 (AI)", group: "Outros" },
  { key: "teenPattiRegular", label: "Teen Patti (AJ)", group: "Outros" },
  { key: "teenPattiAk47", label: "AK47 (AK)", group: "Outros" },
  { key: "teenPattiHukam", label: "Hukam (AL)", group: "Outros" },
  { key: "teenPattiMuflis", label: "Muflis (AM)", group: "Outros" },
  { key: "tongits", label: "Tongits (AN)", group: "Outros" },
  { key: "pusoy", label: "Pusoy (AO)", group: "Outros" },

  // Cassino (AP-AU)
  { key: "caribbean", label: "Caribbean (AP)", group: "Cassino" },
  { key: "colorGame", label: "Color (AQ)", group: "Cassino" },
  { key: "crash", label: "Crash (AR)", group: "Cassino" },
  { key: "luckyDraw", label: "Lucky (AS)", group: "Cassino" },
  { key: "jackpot", label: "Jackpot (AT)", group: "Cassino" },
  { key: "evSplitWinnings", label: "EV Split (AU)", group: "Cassino" },

  // Totais (AV)
  { key: "totalWinnings", label: "Total (AV)", group: "Totais" },

  // Classificacoes (AW-AZ)
  { key: "classificationPpsr", label: "PPSR (AW)", group: "Classificacoes" },
  { key: "classificationRing", label: "Ring (AX)", group: "Classificacoes" },
  { key: "classificationCustomRing", label: "RG Pers. (AY)", group: "Classificacoes" },
  { key: "classificationMtt", label: "MTT (AZ)", group: "Classificacoes" },

  // Valores Gerais (BA-BD)
  { key: "generalPlusEvents", label: "Ganhos+Eventos (BA)", group: "Valores" },
  { key: "ticketValueWon", label: "Ticket Ganho (BB)", group: "Valores" },
  { key: "ticketBuyIn", label: "Ticket Buy-in (BC)", group: "Valores" },
  { key: "customPrizeValue", label: "Premio Pers. (BD)", group: "Valores" },

  // Taxa Total (CJ)
  { key: "feeTotal", label: "Taxa Total (CJ)", group: "Taxas" },

  // SPINUP (CK-CL)
  { key: "spinUpBuyIn", label: "SPINUP Buy-in (CK)", group: "SPINUP" },
  { key: "spinUpPrize", label: "SPINUP Premio (CL)", group: "SPINUP" },

  // Jackpot (CM-CN)
  { key: "jackpotFee", label: "Jackpot Taxa (CM)", group: "Jackpot" },
  { key: "jackpotPrize", label: "Jackpot Premio (CN)", group: "Jackpot" },

  // EV Split (CO-CQ)
  { key: "evSplitNlh", label: "EV NLH (CO)", group: "EV Split" },
  { key: "evSplitPlo", label: "EV PLO (CP)", group: "EV Split" },
  { key: "evSplitTotal", label: "EV Total (CQ)", group: "EV Split" },

  // Fichas (CT, CY)
  { key: "chipSent", label: "Fichas Enviadas (CT)", group: "Fichas" },
  { key: "chipRedeemed", label: "Fichas Resgatadas (CY)", group: "Fichas" },

  // Credito (CZ-DB)
  { key: "creditLeftClub", label: "Saiu do Clube (CZ)", group: "Credito" },
  { key: "creditSent", label: "Credito Enviado (DA)", group: "Credito" },
  { key: "creditRedeemed", label: "Credito Resgatado (DB)", group: "Credito" },

  // Maos Total (EG)
  { key: "handsTotal", label: "Total Maos (EG)", group: "Maos" },
];
```

---

## Aba Partidas

Implementado em `validation-tabs/sessions-tab.tsx`

Estrutura **aninhada** complexa. Cada sessao tem:
1. **Linha Header 1**: `Inicio: YYYY/MM/DD HH:MM  By ppNickname(ID)  Fim: YYYY/MM/DD HH:MM`
2. **Linha Header 2**: `ID do jogo: XXX  Nome da mesa: YYY`
3. **Linha Header 3**: `TIPO_JOGO  Buy-in: X+Y  [Premiacao Garantida: Z]`
4. **Linhas de Jogadores**: Dados individuais

### Tipos de Jogo Detectados

| Tipo | Identificacao | Colunas |
|------|---------------|---------|
| **CASH** | PPSR ou sem prefixo + blinds | 14 colunas |
| **MTT** | PPST + Buy-in + Garantido | 8 colunas |
| **SITNG** | PPST + SitNGo | 8 colunas |
| **SPIN** | PPST/SPINUP | 7 colunas |

### Mapeamento CASH/HU (14 colunas)

```
B(1): ID Jogador
C(2): Apelido
D(3): Memorando
E(4): Buy-in
F(5): Maos
G(6): Ganhos Geral (formula)
H(7): De adversarios
I(8): De Jackpot
J(9): De Dividir EV
K(10): Clube Geral (formula)
L(11): Taxa
M(12): Taxa Jackpot
N(13): Premios Jackpot
O(14): Dividir EV
```

### Mapeamento MTT/SITNG (8 colunas)

```
B(1): ID Jogador
C(2): Apelido
D(3): Memorando
E(4): Ranking
F(5): Buy-in fichas
G(6): Buy-in ticket
H(7): Ganhos
I(8): Taxa
```

### Mapeamento SPIN (7 colunas, SEM Taxa)

```
B(1): ID Jogador
C(2): Apelido
D(3): Memorando
E(4): Ranking
F(5): Buy-in fichas
G(6): Premio (sorteado)
H(7): Ganhos
```

### Organizadores

| Organizador | Tipo de Sessao | Descricao |
|-------------|----------------|-----------|
| PPST | MTT, SITNG, SPIN | Torneios Oficiais |
| PPSR | CASH | Ring Games Oficiais |
| Liga | CASH, MTT, SITNG, SPIN | Jogos Internos do Clube |

---

## Aba Transacoes (21 colunas A-U)

Implementado em `validation-tabs/transactions-tab.tsx`

### Geral (A)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 0 | A | occurredAt | datetime |

### Remetente (B-E)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 1 | B | senderClubId | id |
| 2 | C | senderPlayerId | id |
| 3 | D | senderNickname | text |
| 4 | E | senderMemoName | text |

### Destinatario (F-H)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 5 | F | recipientPlayerId | id |
| 6 | G | recipientNickname | text |
| 7 | H | recipientMemoName | text |

### Credito (I-K)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 8 | I | creditSent | currency |
| 9 | J | creditRedeemed | currency |
| 10 | K | creditLeftClub | currency |

### Fichas (L-R)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 11 | L | chipsSent | currency |
| 12 | M | classificationPpsr | number |
| 13 | N | classificationRing | number |
| 14 | O | classificationCustomRing | number |
| 15 | P | classificationMtt | number |
| 16 | Q | chipsRedeemed | currency |
| 17 | R | chipsLeftClub | currency |

### Ticket (S-U)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 18 | S | ticketSent | currency |
| 19 | T | ticketRedeemed | currency |
| 20 | U | ticketExpired | currency |

---

## Aba Detalhes do Usuario (12 colunas A-L)

Implementado em `validation-tabs/user-details-tab.tsx`

### Identificacao (A-E)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 0 | A | lastActiveAt | datetime |
| 1 | B | ppPokerId | id |
| 2 | C | country | text |
| 3 | D | nickname | text |
| 4 | E | memoName | text |

### Saldo (F)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 5 | F | chipBalance | currency |

### Agente (G-I)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 6 | G | agentNickname | text |
| 7 | H | agentPpPokerId | id |
| 8 | I | agentCreditBalance | currency |

### Superagente (J-L)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 9 | J | superAgentNickname | text |
| 10 | K | superAgentPpPokerId | id |
| 11 | L | superAgentCreditBalance | currency |

---

## Aba Retorno de Taxa (7 colunas)

Implementado em `validation-tabs/rakeback-tab.tsx`

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 1 | B | superAgentPpPokerId | id |
| 2 | C | agentPpPokerId | id |
| 3 | D | country | text |
| 4 | E | agentNickname | text |
| 5 | F | memoName | text |
| 6 | G | averageRakebackPercent | number |
| 7 | H | totalRt | currency |

---

## Abas do Modal de Validacao

O modal de validacao exibe 10 abas para revisar os dados parseados:

| Aba | Fonte | Descricao |
|-----|-------|-----------|
| **Resumo** | - | Visao geral com estatisticas e qualidade do arquivo |
| **Geral** | Aba Geral do Excel | 48 colunas, resumo por jogador |
| **Detalhado** | Aba Detalhado do Excel | 137 colunas, breakdown por variante |
| **Partidas** | Aba Partidas do Excel | Sessoes de jogo com jogadores |
| **Transacoes** | Aba Transacoes do Excel | Movimentacoes de fichas/credito |
| **Demonstrativo** | Aba Demonstrativo do Excel | Disclaimer (ignorado) |
| **Detalhes do usuario** | Aba Detalhes do usuario do Excel | Cadastro de jogadores |
| **Retorno de taxa** | Aba Retorno de taxa do Excel | Rakeback por agente |
| **Cadastro** | Extrai de Geral | Entidades para cadastro em batch |
| **Validacao** | - | Resultados das regras de validacao |

---

## Regras de Validacao

Implementadas em `apps/dashboard/src/lib/poker/validation.ts`

### Regras de Estrutura (Criticas)

| ID | Descricao |
|----|-----------|
| `geral_sheet_present` | Aba Geral deve ter >= 1 jogador |
| `geral_columns_complete` | 26 campos criticos presentes |
| `detalhado_sheet_present` | Aba Detalhado deve ter dados |
| `transactions_sheet_present` | Aba Transacoes deve ter >= 18 campos |
| `user_details_sheet_present` | Aba Detalhes do usuario >= 10 campos |
| `partidas_sheet_present` | Aba Partidas deve ter >= 1 sessao |
| `rakeback_sheet_present` | Aba Retorno de taxa (warning se ausente) |
| `period_detected` | Periodo valido (<= 31 dias) |

### Regras de Integridade (Criticas)

| ID | Descricao |
|----|-----------|
| `player_ids_valid` | IDs numericos (regex `/^\d+$/`) |
| `numeric_values_valid` | Valores monetarios sao numeros validos |
| `dates_valid` | Datas podem ser parseadas |
| `no_duplicate_transactions` | Sem duplicatas (chave: data+sender+recipient+valor) |

### Regras de Consistencia (TODO)

- Desabilitadas no codigo atual

### Regras Matematicas (TODO)

- Desabilitadas no codigo atual

---

## Tipos TypeScript

Definidos em `apps/dashboard/src/lib/poker/types.ts`:

- `ParsedPlayer` - Jogador da aba Detalhes do usuario
- `ParsedTransaction` - Transacao
- `ParsedSession` - Sessao com array de jogadores
- `ParsedSummary` - Resumo da aba Geral (48 campos)
- `ParsedDetailed` - Breakdown detalhado (137 campos)
- `ParsedDemonstrativo` - Demonstrativo
- `ParsedRakeback` - Rakeback de agente
- `ParsedImportData` - Container principal
- `ValidationResult` - Resultado da validacao

---

## Fluxo de Importacao

```
1. Upload arquivo .xlsx
2. Parser XLSX processa cada aba:
   - parseGeralSheet() -> summaries[]
   - parseDetalhadoSheet() -> detailed[]
   - parsePartidasSheet() -> sessions[]
   - parseTransacoesSheet() -> transactions[]
   - parseUsuariosSheet() -> players[]
   - parseRakebackSheet() -> rakebacks[]
3. validateImportData() executa todas as regras
4. Modal de validacao com 10 abas:
   - Resumo, Geral, Detalhado, Partidas
   - Transacoes, Demonstrativo, Detalhes do usuario
   - Retorno de taxa, Cadastro, Validacao
5. Usuario aprova/rejeita
6. Processamento no backend via tRPC (8 steps)
```

---

## Arquivos de Codigo

| Arquivo | Descricao |
|---------|-----------|
| `components/poker/import-uploader.tsx` | Parser e upload |
| `components/poker/import-validation-modal.tsx` | Modal de validacao |
| `lib/poker/types.ts` | Tipos TypeScript |
| `lib/poker/validation.ts` | Engine de validacao |
| `components/poker/validation-tabs/resumo-tab.tsx` | Aba Resumo |
| `components/poker/validation-tabs/general-tab.tsx` | Aba Geral |
| `components/poker/validation-tabs/detailed-tab.tsx` | Aba Detalhado |
| `components/poker/validation-tabs/sessions-tab.tsx` | Aba Partidas |
| `components/poker/validation-tabs/transactions-tab.tsx` | Aba Transacoes |
| `components/poker/validation-tabs/demonstrativo-tab.tsx` | Aba Demonstrativo |
| `components/poker/validation-tabs/user-details-tab.tsx` | Aba Detalhes do usuario |
| `components/poker/validation-tabs/rakeback-tab.tsx` | Aba Retorno de taxa |
| `components/poker/validation-tabs/cadastro-tab.tsx` | Aba Cadastro |
| `components/poker/validation-tabs/validation-tab.tsx` | Aba Validacao |
