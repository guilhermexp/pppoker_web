# Mapeamento Completo da Aba "Jogos PPST UTC -0500"

## Estrutura Geral

A planilha exportada do PPPoker contém dados de jogos de torneio (PPST) e possui uma estrutura hierárquica com múltiplos níveis de agrupamento.

## Estrutura de Linhas

### Linha 1 - Disclaimer/Aviso

> "Esta planilha é feita pelo PPPoker e se baseia em dados derivados da moeda virtual do jogo. Ela serve apenas como referência e não tem efeito jurídico."

### Linha 2-4 - Cabeçalho do Jogo (Metadados)

Cada bloco de jogo possui um cabeçalho com 3 linhas de informações:

| Linha | Conteúdo | Campos Extraídos |
|-------|----------|------------------|
| 2 | `Início: YYYY/MM/DD HH:MM  By ppXXXXX(XXXXX)  Fim: YYYY/MM/DD HH:MM` | dataInicio, horaInicio, criadorId, criadorNome, dataFim, horaFim |
| 3 | `ID do jogo: XXXXXXXXXXXXXX-XXXXXX  Nome da mesa: NOME_MESA` | idJogo, nomeMesa |
| 4 | `PPST/NLH  Buy-in: X+Y  Premiação Garantida: XXXX` | tipoJogo, buyInBase, buyInTaxa, premiacaoGarantida |

**Exemplo de parsing linha 2:**
```
"Início: 2025/12/08 00:00  By pp8590048(8590048)  Fim: 2025/12/08 03:52"
```

**Exemplo de parsing linha 3:**
```
"ID do jogo: 251208081611-304710  Nome da mesa: REENTRY"
```

**Exemplo de parsing linha 4:**
```
"PPST/NLH  Buy-in: 9+1  Premiação Garantida: 1000"
```

### Linha 5 - Cabeçalho das Colunas de Dados

## Mapeamento das Colunas - PPST/NLH (Torneios Regulares)

| Coluna | Nome do Campo | Tipo de Dado | Descrição | Observações |
|--------|---------------|--------------|-----------|-------------|
| A | Data/ID da SuperUnion | String/Number | Data agrupada (células mescladas) OU ID da SuperUnion | Geralmente vazio "/" nas linhas de dados; valor numérico em alguns casos |
| B | - | String | Sempre "/" | Separador fixo |
| C | ID de Liga | Number | Identificador único da liga | Ex: 1534, 1578, 1687, 2006 |
| D | ID de clube | Number | Identificador único do clube | Ex: 739691, 3325482 |
| E | Nome do Clube | String | Nome do clube de poker | Ex: "UTG pppoker", "K1 GOLD" |
| F | ID do jogador | Number | Identificador único do jogador no PPPoker | Ex: 9831743, 13142651 |
| G | Apelido | String | Nick/apelido do jogador | Ex: "JAMES PICAS", "Majorcrack" |
| H | Nome de memorando | String | Nome alternativo/memorando | Pode ser igual ao apelido ou diferente |
| I | Ranking | Number | Posição final do jogador no torneio | 1 = vencedor |
| J | Buy-in de fichas | Number | Valor do buy-in em fichas | Ex: 10, 20, 30 |
| K | Buy-in de ticket | Number | Valor do buy-in via ticket | Geralmente 0 |
| L | Ganhos | Number | Prêmio recebido em fichas | Pode ser positivo ou negativo |
| M | Taxa | Number | Taxa (rake) do torneio | Pode ser positivo (lucro) ou negativo (perda) |
| N | gap garantido | Number | Diferença de premiação garantida | Relacionado à overlay |

## Mapeamento das Colunas - PPST/SPINUP

| Coluna | Nome do Campo | Tipo de Dado | Descrição | Observações |
|--------|---------------|--------------|-----------|-------------|
| A | Data | String | Data (células mescladas) | Agrupamento por data |
| B | ID da SuperUnion | String | "/" ou ID | Geralmente vazio |
| C | ID de Liga | Number | Identificador da liga | |
| D | ID de clube | Number | Identificador do clube | |
| E | Nome do Clube | String | Nome do clube | |
| F | ID do jogador | Number | ID do jogador | |
| G | Apelido | String | Nick do jogador | |
| H | Nome de memorando | String | Nome alternativo | |
| I | Ranking | Number | Posição final | |
| J | Buy-in de fichas | Number | Valor do buy-in | |
| K | Prêmio | Number | Prêmio sorteado no SPIN | Diferente de torneios normais |
| L | Ganhos | Number | Valor ganho | |

## Tipos de Linhas Especiais

### 1. Linha de Dados de Jogador

- Contém dados individuais de cada participante
- Identificada por ter valores numéricos em C, D, F, I

### 2. Linha "Liga Total"

- Aparece ao final de cada bloco de liga
- Coluna I contém "Liga Total"
- Soma os valores das colunas J, K, L, M, N do grupo

### 3. Linha "Total" (Total Geral)

- Aparece ao final de cada jogo/mesa
- Coluna I contém "Total"
- Soma total de todos os valores do jogo

### 4. Linhas Vazias

- Servem como separadores visuais
- Sem dados em nenhuma coluna

### 5. Linhas de Cabeçalho de Jogo

- 3 linhas consecutivas com metadados (linhas 2, 3, 4 de cada bloco)
- Fundo verde/colorido

## Formatos de Dados

### Datas

- **Formato:** `YYYY/MM/DD` ou `YYYY/MM/DD HH:MM`
- **Exemplos:** "2025/12/08", "2025/12/08 00:00"

### IDs Numéricos

- **ID de Liga:** 4 dígitos (ex: 1534, 2006)
- **ID de clube:** 5-7 dígitos (ex: 739691, 3486684)
- **ID do jogador:** 6-8 dígitos (ex: 9831743, 13142044)
- **ID do jogo:** Formato `YYMMDDHHMMSS-XXXXXX`

### Valores Monetários (fichas)

- Números inteiros ou decimais com vírgula (,) como separador
- Podem ser negativos (prejuízo)
- Exemplos: 10, 191.25, -10, -70

### Tipos de Jogo

- **PPST/NLH** - No Limit Hold'em Tournament
- **PPST/SPINUP** - Spin & Go style tournament

## Regras de Negócio Identificadas

1. **Agrupamento por Liga:** Os jogadores são agrupados por ID de Liga, com uma linha "Liga Total" no final de cada grupo.

2. **Agrupamento por Data:** A coluna A agrupa registros pela data (células mescladas verticalmente).

3. **Múltiplos Jogos por Exportação:** Uma planilha pode conter vários jogos/mesas, cada um com seu próprio cabeçalho.

4. **Diferença PPST/NLH vs SPINUP:**
   - **NLH:** Tem colunas "Buy-in de ticket", "Taxa", "gap garantido"
   - **SPINUP:** Tem coluna "Prêmio" em vez das acima

5. **Cálculo de Totais:**
   - "Liga Total" = Soma de todos os jogadores daquela liga
   - "Total" = Soma de todas as ligas do jogo

## Padrões de Identificação

**Para identificar início de novo jogo:**
```regex
/^Início:\s+\d{4}\/\d{2}\/\d{2}/
```

**Para identificar tipo de jogo:**
```regex
/^(PPST\/NLH|PPST\/SPINUP)/
```

**Para identificar linha de total de liga:**
- Coluna I contém "Liga Total"

**Para identificar linha de total geral:**
- Coluna I contém "Total" (mas não "Liga Total")

## Estrutura JSON Sugerida para Importação

```typescript
interface JogoExportado {
  metadata: {
    dataInicio: string;
    horaInicio: string;
    dataFim: string;
    horaFim: string;
    idJogo: string;
    nomeMesa: string;
    tipoJogo: "PPST/NLH" | "PPST/SPINUP";
    buyInBase: number;
    buyInTaxa: number;
    premiacaoGarantida?: number; // Só para NLH
    criadorId: string;
    criadorNome: string;
  };
  ligas: {
    idLiga: number;
    jogadores: Jogador[];
    total: TotalLiga;
  }[];
  totalGeral: TotalGeral;
}

interface Jogador {
  idSuperUnion?: number;
  idLiga: number;
  idClube: number;
  nomeClube: string;
  idJogador: number;
  apelido: string;
  nomeMemorado: string;
  ranking: number;
  buyInFichas: number;
  buyInTicket?: number;    // Só NLH
  ganhos: number;
  taxa?: number;           // Só NLH
  gapGarantido?: number;   // Só NLH
  premio?: number;         // Só SPINUP
}
```
