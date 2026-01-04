# Planilha Liga PPP - Documentacao Atualizada

> Ultima atualizacao: 22/12/2025
> Baseado no codigo implementado em `apps/dashboard/src/components/league/league-import-uploader.tsx`

## Visao Geral

O validador de ligas PPPoker processa arquivos Excel (.xlsx) exportados pelo PPPoker contendo dados de **multiplas ligas/clubes** na mesma SuperUnion. O arquivo contem 4 abas (2 implementadas).

---

## Estrutura do Arquivo Excel

| Aba | Descricao | Status |
|-----|-----------|--------|
| Geral do PPST | Resumo por liga (torneios) | **Implementado** |
| Jogos PPST | Detalhes de cada torneio | **Implementado** |
| Geral do PPSR | Resumo por liga (cash) | Pendente |
| Jogos PPSR | Detalhes de cada cash game | Pendente |

---

## Aba Geral do PPST

### Estrutura por Blocos

A aba e dividida em **blocos**, cada um com:
1. **Linha de Contexto** (amarela): `Liga|SuperUnion ID Taxa de cambio das fichas 1:X`
2. **Linha de Periodo**: `YYYY/MM/DD - YYYY/MM/DD UTC -0500`
3. **Header de Colunas**: ID da SuperUnion, Nome da Liga, etc.
4. **Linhas de Dados**: Uma por liga
5. **Linha Total**: Soma do bloco

### Mapeamento de Colunas (15 colunas)

| Idx | Col | Campo | Tipo |
|-----|-----|-------|------|
| 0 | A | periodo | string (YYYY/MM/DD - YYYY/MM/DD) |
| 1 | B | superUnionId | number ou "/" |
| 2 | C | ligaNome | string |
| 3 | D | ligaId | number |
| 4 | E | ganhosJogador | number |
| 5 | F | valorTicketGanho | number |
| 6 | G | buyinTicket | number |
| 7 | H | valorPremioPersonalizado | number |
| 8 | I | ganhosLigaGeral | number |
| 9 | J | ganhosLigaTaxa | number |
| 10 | K | buyinSpinup | number |
| 11 | L | premiacaoSpinup | number |
| 12 | M | valorTicketEntregue | number |
| 13 | N | buyinTicketLiga | number |
| 14 | O | gapGarantido | number (celula mesclada) |

### Estrutura de Dados

```typescript
type ParsedLeagueGeralPPSTBloco = {
  contexto: {
    entidadeTipo: "Liga" | "SuperUnion";
    entidadeId: number;
    taxaCambio: string; // e.g., "1:5", "1:40"
  };
  periodo: {
    dataInicio: string; // YYYY-MM-DD
    dataFim: string;
    timezone: string; // e.g., "UTC -0500"
  };
  ligas: ParsedLeagueGeralPPST[];
  total: {
    ganhosJogador: number;
    valorTicketGanho: number;
    buyinTicket: number;
    valorPremioPersonalizado: number;
    ganhosLigaGeral: number;
    ganhosLigaTaxa: number;
    buyinSpinup: number;
    premiacaoSpinup: number;
    valorTicketEntregue: number;
    buyinTicketLiga: number;
    gapGarantido: number;
  };
};
```

---

## Aba Jogos PPST

### Estrutura por Jogo

Cada jogo tem 3 linhas de header + linhas de jogadores:

1. **Linha 1**: `Inicio: YYYY/MM/DD HH:MM  By ppNickname(ID)  Fim: YYYY/MM/DD HH:MM`
2. **Linha 2**: `ID do jogo: XXX  Nome da mesa: YYY`
3. **Linha 3**: `TIPO_JOGO  Buy-in: X+Y+Z  [Premiacao Garantida: N]`
4. **Linhas de Jogadores**: Dados individuais por jogador

### Tipos de Jogo Suportados

| Tipo | Buy-in | Campos Extras |
|------|--------|---------------|
| `PPST/NLH` | base+taxa | buyinTicket, taxa, gapGarantido |
| `PPST/SPINUP` | base | premio (sorteado) |
| `PPST/NLH PKO` | base+bounty+taxa | recompensa |
| `PPST/NLH MKO` | base+bounty+taxa | recompensa |
| `PPST/PLO5 PKO` | base+bounty+taxa | recompensa |
| `PPST/OFC` | base+taxa | buyinTicket, taxa |
| `PPST/SHORT` | base+taxa | buyinTicket, taxa |
| `MTT/6+` | base+taxa | buyinTicket, taxa |
| Satellite | base+taxa | nomeTicket, valorTicket |

### Mapeamento de Colunas por Tipo

#### NLH Regular (14 colunas)
```
A(0): superUnionId ou periodo
B(1): "/" separador
C(2): ligaId
D(3): clubeId
E(4): clubeNome
F(5): jogadorId
G(6): apelido
H(7): nomeMemorado
I(8): ranking
J(9): buyinFichas
K(10): buyinTicket
L(11): ganhos
M(12): taxa
N(13): gapGarantido
```

#### SPINUP (12 colunas, SEM taxa)
```
A-H: Igual NLH
I(8): ranking
J(9): buyinFichas
K(10): premio (sorteado)
L(11): ganhos
```

#### PKO/MKO (15 colunas)
```
A-L: Igual NLH
M(12): recompensa
N(13): taxa
O(14): gapGarantido
```

#### Satellite (16 colunas)
```
A-L: Igual NLH
M(12): nomeTicket
N(13): valorTicket
O(14): taxa
P(15): gapGarantido
```

### Estrutura de Dados

```typescript
type ParsedLeagueJogoPPST = {
  metadata: {
    dataInicio: string;
    horaInicio: string;
    dataFim: string;
    horaFim: string;
    idJogo: string;
    nomeMesa: string;
    tipoJogo: LeagueTipoJogo;
    subtipo: "satellite" | "regular" | "knockout";
    buyInBase: number;
    buyInBounty?: number; // Só para PKO/MKO
    buyInTaxa: number;
    premiacaoGarantida: number | null;
    criadorId: string;
    criadorNome: string;
  };
  jogadores: ParsedLeagueJogadorPPST[];
  totaisPorLiga: ParsedLeagueTotalLiga[];
  totalGeral: ParsedLeagueTotalGeral;
};

type ParsedLeagueJogadorPPST = {
  superUnionId: number | null;
  ligaId: number;
  clubeId: number;
  clubeNome: string;
  jogadorId: number;
  apelido: string;
  nomeMemorado: string;
  ranking: number;
  buyinFichas: number;
  ganhos: number;
  // Campos especificos por tipo
  buyinTicket?: number;      // NLH regular
  taxa?: number;             // NLH, PKO, Satellite
  gapGarantido?: number;     // Jogos com garantido
  premio?: number;           // SPINUP
  recompensa?: number;       // PKO/MKO
  nomeTicket?: string;       // Satellite
  valorTicket?: number;      // Satellite
};
```

---

## Regras de Validacao

Implementadas em `apps/dashboard/src/lib/league/validation.ts`

### Regras de Estrutura

| ID | Severidade | Descricao |
|----|------------|-----------|
| `geral_ppst_sheet_present` | critical | Aba Geral PPST deve ter >= 1 liga |
| `jogos_ppst_sheet_present` | critical | Aba Jogos PPST deve ter >= 1 jogo |
| `geral_ppsr_sheet_present` | warning | Aba Geral PPSR (nao implementado) |
| `jogos_ppsr_sheet_present` | warning | Aba Jogos PPSR (nao implementado) |
| `period_detected` | critical | Periodo valido (<= 31 dias) |
| `unknown_game_formats` | warning | Formatos de torneio nao mapeados |

### Regras de Integridade

| ID | Severidade | Descricao |
|----|------------|-----------|
| `liga_ids_valid` | critical | IDs de liga sao numeros positivos |
| `clube_ids_valid` | critical | IDs de clube sao numeros positivos |
| `jogador_ids_valid` | critical | IDs de jogador entre 1M e 99M |
| `numeric_values_valid` | critical | Valores monetarios nao sao NaN |
| `rankings_valid` | warning | Rankings sao numeros positivos |

### Regras de Consistencia

| ID | Severidade | Descricao |
|----|------------|-----------|
| `ligas_in_geral_match_jogos` | warning | Ligas do Geral aparecem nos Jogos |
| `totais_liga_match_jogadores` | warning | Soma dos jogadores = total da liga |

### Regras Matematicas

| ID | Severidade | Descricao |
|----|------------|-----------|
| `geral_totals_sum_correct` | warning | Soma das ligas = Total do bloco |
| `jogos_totals_sum_correct` | warning | Soma dos jogadores = Total do jogo |

---

## Tipos TypeScript

Definidos em `apps/dashboard/src/lib/league/types.ts`:

### Tipos Principais
- `ParsedLeagueGeralPPST` - Liga da aba Geral
- `ParsedLeagueGeralPPSTBloco` - Bloco com ligas e totais
- `ParsedLeagueJogoMetadata` - Metadados do jogo
- `ParsedLeagueJogadorPPST` - Jogador unificado
- `ParsedLeagueJogoPPST` - Jogo completo
- `ParsedLeagueTotalLiga` - Total por liga em um jogo
- `ParsedLeagueTotalGeral` - Total geral de um jogo

### Container Principal
```typescript
type ParsedLeagueImportData = {
  // Dados parseados
  geralPPST: ParsedLeagueGeralPPSTBloco[];
  jogosPPST: ParsedLeagueJogoPPST[];
  geralPPSR: ParsedLeagueGeralPPSR[]; // Pendente
  jogosPPSR: ParsedLeagueJogoPPSR[];  // Pendente

  // Metadados
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  fileSize?: number;

  // Contagens para validacao
  geralPPSTLigaCount?: number;
  jogosPPSTCount?: number;
  jogosPPSTJogadorCount?: number;
  jogosPPSTInicioCount?: number;

  // Formatos nao reconhecidos
  unknownGameFormats?: Array<{
    gameId: string;
    rawText: string;
    rowIndex: number;
  }>;
};
```

### Validacao
```typescript
type LeagueValidationResult = {
  qualityScore: number; // 0-100
  passedChecks: number;
  totalChecks: number;
  hasBlockingErrors: boolean;
  checks: LeagueValidationCheck[];
  warnings: LeagueValidationWarning[];
  period: { start: string; end: string; days: number };
  stats: {
    totalLigasPPST: number;
    totalJogosPPST: number;
    totalJogadoresPPST: number;
    totalBuyinPPST: number;
    totalGanhosPPST: number;
    totalTaxaPPST: number;
    totalGapGarantidoPPST: number;
    totalLigasPPSR: number;  // 0 (nao implementado)
    totalJogosPPSR: number;
    totalJogadoresPPSR: number;
  };
  gameTypeDistribution: Array<{
    type: "NLH" | "SPINUP" | "KNOCKOUT" | "SATELLITE";
    label: string;
    count: number;
    percentage: number;
  }>;
  topLigas: Array<{
    ligaId: number;
    ligaNome: string;
    totalGanhos: number;
    totalTaxa: number;
  }>;
};
```

---

## Fluxo de Importacao

```
1. Upload arquivo .xlsx
2. Parser XLSX processa cada aba:
   - parseGeralPPSTSheet() -> blocos[]
   - parseJogosPPSTSheet() -> jogos[]
3. validateLeagueImportData() executa todas as regras
4. Modal de validacao com 4 abas:
   - Visao Geral
   - Jogos PPST
   - Validacao
   - Avisos
5. Usuario aprova/rejeita
6. (Processamento backend nao implementado ainda)
```

---

## Arquivos de Codigo

| Arquivo | Descricao |
|---------|-----------|
| `components/league/league-import-uploader.tsx` | Parser e upload |
| `components/league/league-import-validation-modal.tsx` | Modal de validacao |
| `lib/league/types.ts` | Tipos TypeScript |
| `lib/league/validation.ts` | Engine de validacao |
| `components/league/validation-tabs/*.tsx` | Abas do modal |

---

## Pendencias

1. **Implementar PPSR**: Parser para abas Geral do PPSR e Jogos PPSR
2. **Backend**: Router tRPC para processar importacao de ligas
3. **Database**: Tabelas para armazenar dados de ligas (se separado de clubes)
4. **Novos Formatos**: Adicionar suporte para formatos de torneio desconhecidos
