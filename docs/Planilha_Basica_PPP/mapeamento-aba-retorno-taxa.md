# Mapeamento Detalhado da Aba "Retorno de Taxa"

## Visão Geral

A aba "Retorno de taxa" faz parte da planilha PPP Simples (Mapeada) e contém dados relacionados ao retorno de taxas de jogadores de poker. Os dados abrangem das linhas 1 a 94 (com dados efetivos nas linhas 3 a 94) e das colunas A a H.

## Estrutura das Colunas

| Coluna | Nome do Cabeçalho | Tipo de Dado | Descrição |
|--------|-------------------|--------------|-----------|
| A | Sem cabeçalho visível na linha 2 | Número (esparso) | Parece conter datas ou identificadores em formato numérico (ex: 3330646, 2025/11/24). Poucos registros preenchidos |
| B | ID do superagente | Número | Código identificador do superagente (ex: 8390401, 10599531, 5464140). Preenchido esporadicamente |
| C | ID do agente | Número | Código identificador do agente (ex: 1330059, 11803392, 8753977, etc.). Preenchido para todos os registros |
| D | País/região | Texto | País ou região do jogador. Predominantemente "Brazil", com alguns casos de "Uruguay", "Mexico", "America", "United Kingdom", "Ireland" |
| E | Apelido | Texto | Nome de usuário/apelido do jogador (ex: Moura Poker, SCPT online Gestor, LFMat74, KKrugshAA, etc.) |
| F | Nome de memorando | Texto | Nome combinado para identificação/memorando. Geralmente no formato "Prefixo.Apelido" (ex: SN.Moura Poker, NIT.Nitpokerr N SAQU, Vegas.Ramiroo_R10) |
| G | Retorno% médio de taxa | Número | Percentual médio de retorno de taxa. Maioria dos valores é 0, com exceção da linha 92 que contém valor 50 |
| H | Total de RT | Número | Total de Retorno de Taxa. Maioria dos valores é 0, com exceção da linha 92 que contém valor 0,75 |

## Linhas Especiais

### Linha 1 (Disclaimer)

Contém um aviso legal mesclado que se estende pela largura da planilha:

> "Esta planilha é feita pelo PPPoker e se baseia em dados derivados da moeda virtual do jogo. Ela serve apenas como referência e não tem efeito jurídico."

### Linha 2 (Cabeçalhos)

Contém os títulos das colunas com formatação:

- Colunas G e H têm fundo amarelo destacando os campos de retorno de taxa

## Estatísticas dos Dados

- **Total de registros:** 92 linhas de dados (linha 3 até linha 94)
- **Países predominantes:** Brazil (grande maioria)
- **Outros países:** Uruguay, Mexico, America, United Kingdom, Ireland
- **Superagentes identificados:** 8390401, 10599531, 5464140
- **Registros com retorno de taxa diferente de zero:** Apenas 1 (linha 92 - jkpoker17)

## Observações Importantes

1. **Dados esparsos na coluna A e B:** Nem todos os registros possuem ID de superagente preenchido. A coluna A parece conter informações adicionais em formato de data ou código para casos específicos (linhas 46-48).

2. **Valores de retorno de taxa:** Quase todos os registros mostram 0% de retorno médio e 0 de total de RT, indicando que a maioria dos jogadores não possui retorno de taxa configurado.

3. **Único registro com valores:** O jogador "jkpoker17" (linha 92) é o único com valores de retorno: 50% de média e 0,75 de total.

4. **Formatação:** A coluna H (Total de RT) está destacada em amarelo no cabeçalho, indicando sua importância para análise.

5. **Aba protegida:** A aba possui indicação de "Respostas do formulário" e "Protegida", sugerindo que pode receber dados de um formulário externo e tem proteção contra edições não autorizadas.
