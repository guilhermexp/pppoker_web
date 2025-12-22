# Mapeamento Completo - Aba "Geral do PPST UTC -0500"

## ESTRUTURA GERAL DA PLANILHA

A planilha é organizada em blocos repetitivos de dados, cada bloco representando um período específico com informações de múltiplas ligas.

## ESTRUTURA DE UM BLOCO DE DADOS

Cada bloco segue este padrão:

| Linha | Conteúdo | Cor de Fundo |
|-------|----------|--------------|
| n | Informação de Contexto (Liga/SuperUnion + Taxa de câmbio) | Amarelo |
| n+1 | Cabeçalhos de Grupo (mesclados) | Verde claro |
| n+2 | Sub-cabeçalhos (colunas individuais) | Verde claro |
| n+3 a n+x | Dados das Ligas | Branco (positivos) / Vermelho (negativos) |
| n+x+1 | Linha Total | Branco |
| n+x+2 a n+x+3 | Linhas vazias (separação) | - |

## MAPEAMENTO DAS COLUNAS (A até O)

### Coluna A - Período/Data

- **Tipo:** Texto (data mesclada verticalmente)
- **Formato:** `YYYY/MM/DD - YYYY/MM/DD UTC -0500`
- **Exemplo:** `2025/12/08 - 2025/12/08 UTC -0500`
- **Observação:** Células mescladas que abrangem todas as linhas de dados de um bloco. Células não-mescladas mostram `/`

### Coluna B - ID da SuperUnion

- **Tipo:** Numérico (inteiro)
- **Exemplo:** `561`
- **Descrição:** Identificador único da SuperUnion
- **Pode ser vazio:** `/` indica sem SuperUnion específica

### Coluna C - Nome da Liga

- **Tipo:** Texto
- **Exemplos:** Sexyfish, LIGA COLOMBIANA, POKER LATINOS, Evolution 1, FOUNDER, Evolution 2, EVOLUTION., Evolution 3, NUTS el Dorada, Golden UMP, Evolution 4, UNION AMERICANA, FishAndPro
- **Observação:** Na linha de total, contém `Total`

### Coluna D - ID de Liga

- **Tipo:** Numérico (inteiro)
- **Exemplos:** 2906, 1534, 1578, 1675, 1687, 1765, 2006, 2101, 2126, 2343, 2448, 2758, 3303

### Coluna E - Ganhos do jogador

- **Tipo:** Numérico (decimal, 2 casas)
- **Formato:** Números negativos em vermelho, positivos em verde
- **Exemplos:** -249,65, -9108,24, 209,95, -60435,29
- **Descrição:** Total de ganhos/perdas dos jogadores

### Coluna F - Valor do ticket ganho

- **Tipo:** Numérico (inteiro ou decimal)
- **Exemplos:** 0, 270, 40, 80, 460, 930

### Coluna G - Buy-in de ticket

- **Tipo:** Numérico (inteiro ou decimal)
- **Exemplos:** 0, 150, 0, 0, 300, 40, 490

### Coluna H - Valor do prêmio personalizado

- **Tipo:** Numérico (inteiro)
- **Cor de fundo:** Amarelo
- **Valores observados:** Geralmente 0
- **Descrição:** Prêmios personalizados configurados

## SEÇÃO "Ganhos da Liga" (Colunas I-N)

Esta é uma seção agrupada com sub-cabeçalhos:

### Coluna I - Geral

- **Tipo:** Numérico (decimal, 2 casas)
- **Exemplos:** 136, 2705,25, 2472,46, 15526,46
- **Descrição:** Ganhos gerais da liga

### Coluna J - Taxa

- **Tipo:** Numérico (decimal, 2 casas)
- **Exemplos:** 26, 1750,25, 2157,46, 11081,46
- **Descrição:** Taxa aplicada

### Coluna K - Buy-in de SPINUP

- **Tipo:** Numérico (inteiro)
- **Exemplos:** 140, 9465, 3995, 50190
- **Descrição:** Buy-in total em SPINUP

### Coluna L - Premiação de SPINUP

- **Tipo:** Numérico (inteiro, pode ser negativo)
- **Exemplos:** -30, -8630, -3720, -46185
- **Descrição:** Premiação distribuída em SPINUP

### Coluna M - Valor do ticket entregue

- **Tipo:** Numérico (inteiro)
- **Exemplos:** 0, 270, 40, 930

### Coluna N - Buy-in de ticket

- **Tipo:** Numérico (inteiro, pode ser negativo)
- **Exemplos:** 0, -150, 0, -490

### Coluna O - gap garantido

- **Tipo:** Numérico (decimal, 2 casas)
- **Cor de fundo:** Verde
- **Exemplos:** -40606,98, -324855,84, -8121,4
- **Descrição:** Gap garantido calculado (aparece apenas nas linhas de total e primeira linha de dados)

## FORMATAÇÃO CONDICIONAL

| Condição | Cor |
|----------|-----|
| Valores positivos (coluna E) | Verde |
| Valores negativos (coluna E) | Vermelho |
| Linha de informação de contexto | Amarelo |
| Cabeçalhos | Verde claro |
| Coluna H (prêmio personalizado) | Amarelo |
| Coluna O (gap garantido) | Verde |

## LINHA DE CONTEXTO (Linha amarela antes de cada bloco)

**Formato:** `[Entidade] [ID] Taxa de câmbio das fichas [Proporção]`

**Variações:**
- `Liga 1765 Taxa de câmbio das fichas 1:5`
- `SuperUnion 561 Taxa de câmbio das fichas 1:40`
- `SuperUnion 583 Taxa de câmbio das fichas 1:1`
- `Liga 2101 Taxa de câmbio das fichas 1:5`
- `Liga 2102 Taxa de câmbio das fichas 1:12`
- `Liga 2126 Taxa de câmbio das fichas 1:5`

**Estrutura para parse:**
- `{entidade}`: "Liga" | "SuperUnion"
- `{id}`: número inteiro
- `{taxa_cambio}`: "1:X" onde X é um número

## LINHA 1 - DISCLAIMER

**Conteúdo:** `Esta planilha é feita pelo PPPoker e se baseia em dados derivados da moeda virtual do jogo. Ela serve apenas como referência e não tem efeito jurídico.`

## ESTRUTURA JSON SUGERIDA PARA IMPORTAÇÃO

```json
{
  "disclaimer": "string",
  "blocos": [
    {
      "contexto": {
        "entidade_tipo": "Liga" | "SuperUnion",
        "entidade_id": number,
        "taxa_cambio": "string (ex: 1:5)"
      },
      "periodo": {
        "data_inicio": "YYYY/MM/DD",
        "data_fim": "YYYY/MM/DD",
        "timezone": "UTC -0500"
      },
      "ligas": [
        {
          "id_superunion": number | null,
          "nome_liga": "string",
          "id_liga": number,
          "ganhos_jogador": number,
          "valor_ticket_ganho": number,
          "buyin_ticket": number,
          "valor_premio_personalizado": number,
          "ganhos_liga": {
            "geral": number,
            "taxa": number,
            "buyin_spinup": number,
            "premiacao_spinup": number,
            "valor_ticket_entregue": number,
            "buyin_ticket": number
          }
        }
      ],
      "total": {
        "ganhos_jogador": number,
        "valor_ticket_ganho": number,
        "buyin_ticket": number,
        "valor_premio_personalizado": number,
        "ganhos_liga": {},
        "gap_garantido": number
      }
    }
  ]
}
```

## OBSERVAÇÕES IMPORTANTES PARA O VALIDADOR

1. **Células mescladas:** A coluna A usa células mescladas para o período. Ao importar, considere que múltiplas linhas compartilham o mesmo valor de período.

2. **Caractere "/":** Na coluna B (ID da SuperUnion), o caractere "/" indica ausência de valor (equivalente a null).

3. **Linha "Total":** Identificar pela coluna C contendo exatamente a palavra "Total" (sem ID de liga na coluna D).

4. **Gap garantido:** Aparece apenas na linha de total e primeira linha de dados de cada bloco.

5. **Blocos múltiplos:** A planilha contém múltiplos blocos de dados separados por linhas vazias. Use as linhas amarelas como delimitadores.

6. **Números negativos:** São formatados com cor vermelha mas o valor numérico inclui o sinal negativo.

7. **Separador decimal:** Vírgula (,) como separador decimal (formato brasileiro).
