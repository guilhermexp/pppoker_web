# Mapeamento da Aba "Transações" (Colunas A-U)

## Estrutura Geral

A aba Transações tem **21 colunas** (A até U) com **3 linhas de cabeçalho**:

| Linha | Conteúdo |
|-------|----------|
| Linha 1 | Texto descritivo da planilha |
| Linha 2 | Nomes dos grupos (células mescladas) |
| Linha 3 | Nomes das colunas individuais |
| Linha 4+ | Dados |

---

## Mapeamento Completo por Coluna

| Coluna | Grupo | Campo | Exemplo |
|--------|-------|-------|---------|
| A | (sem grupo) | Tempo | `2025-11-24 10:13:28` |
| B | Remetente | ID de clube | `3330646` |
| C | Remetente | ID do jogador | `11816855` |
| D | Remetente | Apelido | `Sac.Raissaa` |
| E | Remetente | Nome de memorando | `Sac.Raissaa` |
| F | Destinatário | ID do jogador | `619751` |
| G | Destinatário | Apelido | `Rafael Borges` |
| H | Destinatário | Nome de memorando | `Rafael Borges` |
| I | Dar crédito | Enviado | `0`, `0.35`, `27.5` |
| J | Dar crédito | Resgatado | `0`, `1100`, `59` |
| K | Dar crédito | Saiu do clube | `0` |
| L | Fichas | Enviado | `0`, `0.66`, `22.02` |
| M | Fichas | Classificação PPSR | `0` |
| N | Fichas | Classificação Ring Game | `0` |
| O | Fichas | Classificação de RG Personalizado | `0` |
| P | Fichas | Classificação MTT | `0` |
| Q | Fichas | Resgatado | `0`, `7.75`, `50` |
| R | Fichas | Saiu do clube | `0` |
| S | Ticket | Enviado | `0` |
| T | Ticket | Resgatado | `0` |
| U | Ticket | Expirado | `0` |

---

## Estrutura dos Grupos (Linha 2)

| Grupo | Colunas | Cor | Descrição |
|-------|---------|-----|-----------|
| (sem grupo) | A | Cinza | Timestamp da transação |
| Remetente | B-E | Verde | Quem enviou a transação |
| Destinatário | F-H | Verde | Quem recebeu a transação |
| Dar crédito | I-K | Verde | Valores de crédito |
| Fichas | L-R | Verde | Valores de fichas por categoria |
| Ticket | S-U | Verde | Valores de tickets |

---

## Detalhes dos Campos

### Coluna A - Tempo

- **Formato**: `YYYY-MM-DD HH:MM:SS`
- **Exemplo**: `2025-11-24 10:13:28`

### Grupo Remetente (B-E)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| B | ID de clube | Sempre o mesmo valor: `3330646` |
| C | ID do jogador | Identificador numérico |
| D | Apelido | Nome de exibição |
| E | Nome de memorando | Pode ser igual ao apelido |

### Grupo Destinatário (F-H)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| F | ID do jogador | Identificador numérico |
| G | Apelido | Nome de exibição |
| H | Nome de memorando | Pode ser igual ao apelido |

### Grupo Dar crédito (I-K)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| I | Enviado | Crédito enviado |
| J | Resgatado | Crédito resgatado |
| K | Saiu do clube | Crédito que saiu do clube |

### Grupo Fichas (L-R)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| L | Enviado | Fichas enviadas |
| M | Classificação PPSR | Fichas por classificação PPSR |
| N | Classificação Ring Game | Fichas por Ring Game |
| O | Classificação de RG Personalizado | Fichas por RG Personalizado |
| P | Classificação MTT | Fichas por MTT |
| Q | Resgatado | Fichas resgatadas |
| R | Saiu do clube | Fichas que saíram do clube |

### Grupo Ticket (S-U)

| Coluna | Campo | Descrição |
|--------|-------|-----------|
| S | Enviado | Tickets enviados |
| T | Resgatado | Tickets resgatados |
| U | Expirado | Tickets expirados |

---

## Observações Importantes

1. **Formato uniforme**: Diferente da aba "Partidas", a aba "Transações" tem apenas um tipo de estrutura (não há variações).

2. **Células mescladas**: A linha 2 usa células mescladas para os grupos:
   - `B2:E2` = "Remetente"
   - `F2:H2` = "Destinatário"
   - `I2:K2` = "Dar crédito"
   - `L2:R2` = "Fichas"
   - `S2:U2` = "Ticket"

3. **Valores numéricos**: A maioria dos valores são `0`, mas podem conter decimais como `0.35`, `27.5`, `22.02`.

4. **ID de clube fixo**: A coluna B (ID de clube) parece ter o mesmo valor `3330646` para todas as transações.

5. **Dados começam na linha 4**: As linhas 1-3 são cabeçalhos.
