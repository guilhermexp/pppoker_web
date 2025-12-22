# Mapeamento da Aba "Partidas" (Colunas A-O)

Baseado na análise, existem **3 tipos diferentes de partidas** com estruturas distintas.

---

## Estrutura Geral (Cabeçalhos)

### Tipo 1: TORNEIO (REENTRY/EASY/NLH) - Cor Verde

| Linha | Conteúdo |
|-------|----------|
| 1ª (cabeçalho) | `Início: [data/hora]  By [usuario(id)]  Fim: [data/hora]` |
| 2ª (cabeçalho) | `ID do jogo: [id]  Nome da mesa: [nome]` |
| 3ª (cabeçalho) | `PPST/NLH  Buy-in: [valor]  Premiação Garantida: [valor]` |

### Tipo 2: SPIN (SPINUP) - Cor Verde

| Linha | Conteúdo |
|-------|----------|
| 1ª (cabeçalho) | `Início: [data/hora]  By [usuario(id)]  Fim: [data/hora]` |
| 2ª (cabeçalho) | `ID do jogo: [id]  Nome da mesa: ??SPIN??` |
| 3ª (cabeçalho) | `PPST/SPINUP  Buy-in: [valor]` (SEM Premiação Garantida) |

### Tipo 3: CASH/HU (PLO6, etc) - Cor Vermelha/Rosa

| Linha | Conteúdo |
|-------|----------|
| 1ª (cabeçalho) | `Início: [data/hora]  By [usuario(id)]  Fim: [data/hora]` |
| 2ª (cabeçalho) | `ID do jogo: [id]  Nome da mesa: [PLO6 HU 100BB, etc]` |
| ❌ | **NÃO TEM 3ª linha de cabeçalho!** |

---

## Colunas por Tipo de Partida

### Tipo 1: TORNEIO (REENTRY/EASY/NLH) - Colunas A-I

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| A | Data/Timezone | `2025/11/24 + UTC -0500` (no cabeçalho da linha de labels) |
| B | ID do jogador | Ex: `13067958` |
| C | Apelido | Ex: `CleissonSC02` |
| D | Nome de memorando | Ex: `CleissonSC02` |
| E | Ranking | Ex: `72`, `75`, `93` |
| F | Buy-in de fichas | Ex: `10`, `5` |
| G | Buy-in de ticket | Ex: `0` |
| H | Ganhos | Ex: `-10`, `-5` |
| I | Taxa | Ex: `1`, `0.5`, `2.5` |

### Tipo 2: SPIN (SPINUP) - Colunas A-H

> ⚠️ **Menos colunas que Torneio!**

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| A | Data/Timezone | `2025/11/24 + UTC -0500` |
| B | ID do jogador | Ex: `1581552` |
| C | Apelido | Ex: `LFMat74` |
| D | Nome de memorando | Ex: `LFMat74` |
| E | Ranking | Ex: `3` |
| F | Buy-in de fichas | Ex: `5` |
| G | Prêmio | Ex: `0` (⚠️ DIFERENTE de Buy-in de ticket!) |
| H | Ganhos | Ex: `-5` |
| ❌ | | **NÃO TEM coluna I (Taxa)** |

### Tipo 3: CASH/HU (PLO6, etc) - Colunas A-O

> ⚠️ **Mais colunas que Torneio e Spin!**

| Coluna | Campo | Sub-campo | Descrição |
|--------|-------|-----------|-----------|
| A | Data/Timezone | | `2025/11/24 + UTC -0500` |
| B | ID do jogador | | Ex: `13071408` |
| C | Apelido | | Ex: `Borafii` |
| D | Nome de memorando | | Ex: `Borafii` |
| E | Buy-in de fichas | | Ex: `445` (⚠️ SEM Ranking!) |
| F | Mãos | | Ex: `18` (campo exclusivo!) |
| G | Ganhos do jogador | Geral | Ex: `338,85` |
| H | Ganhos do jogador | De adversários | Ex: `338,85` |
| I | Ganhos do jogador | De Jackpot | Ex: `0` |
| J | Ganhos do jogador | De Dividir EV | Ex: `0` |
| K | Ganhos do clube | Geral | Ex: `2,15` |
| L | Ganhos do clube | Taxa | Ex: `2,15` |
| M | Ganhos do clube | Taxa do Jackpot | Ex: `0` |
| N | Ganhos do clube | Prêmios Jackpot | Ex: `0` |
| O | Ganhos do clube | Dividir EV | Ex: `0` |

---

## Como Identificar o Tipo

| Identificador | Tipo |
|---------------|------|
| Nome da mesa contém `REENTRY`, `EASY` | Torneio NLH |
| Nome da mesa contém `SPIN` ou tipo `PPST/SPINUP` | Spin |
| Nome da mesa contém `HU`, `PLO`, `100BB` ou não tem 3ª linha de cabeçalho | Cash/HU |
| Tem coluna "Mãos" em vez de "Ranking" | Cash/HU |
| Tem coluna "Prêmio" em vez de "Buy-in de ticket" | Spin |
| Cor vermelha/rosa | Cash/HU |
| Cor verde | Torneio ou Spin |

---

## Diferenças Importantes

| Característica | Torneio | Spin | Cash/HU |
|----------------|---------|------|---------|
| Linhas de cabeçalho | 3 | 3 | 2 |
| Total de colunas | 9 (A-I) | 8 (A-H) | 15 (A-O) |
| Tem Ranking | ✅ | ✅ | ❌ |
| Tem Mãos | ❌ | ❌ | ✅ |
| Tem Taxa | ✅ | ❌ | ✅ (em Ganhos do clube) |
| Tem Buy-in de ticket | ✅ | ❌ (usa "Prêmio") | ❌ |
| Tem Premiação Garantida | ✅ | ❌ | ❌ |
| Subcampos de Ganhos | ❌ | ❌ | ✅ (jogador + clube) |
| Cor | Verde | Verde | Vermelha/Rosa |

### Notas

- **SPIN** não tem Taxa (coluna I)
- **SPIN** usa "Prêmio" em vez de "Buy-in de ticket"
- **CASH/HU** não tem "Ranking" - usa "Buy-in de fichas" na coluna E
- **CASH/HU** tem "Mãos" como campo exclusivo
- **CASH/HU** tem até 15 colunas (A-O) com subcampos de "Ganhos do jogador" e "Ganhos do clube"
- **CASH/HU** tem apenas 2 linhas de cabeçalho (sem a linha de tipo/buy-in/premiação)
