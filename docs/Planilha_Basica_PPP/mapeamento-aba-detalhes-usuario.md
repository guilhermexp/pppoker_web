# Mapeamento da Aba "Detalhes do Usuário" (Colunas A-L)

Esta aba tem uma estrutura tabular tradicional (diferente da aba Partidas que usa blocos).

---

## Estrutura Geral

| Linha | Conteúdo |
|-------|----------|
| 1 | Aviso legal: "Esta planilha é feita pelo PPPoker e se baseia em dados derivados da moeda virtual do jogo. Ela serve apenas como referência e não tem efeito jurídico." |
| 2 | Nota: "O saldo de fichas PP mostrado aqui não inclui as fichas PP em jogo." |
| 3 | Cabeçalhos das colunas |
| 4+ | Dados dos jogadores |

---

## Mapeamento das Colunas (A-L)

| Coluna | Campo | Tipo de Dado | Exemplo |
|--------|-------|--------------|---------|
| A | Última conexão | DateTime | `2025-12-11 04:20:36` |
| B | ID do jogador | Número | `3527734` |
| C | País/região | Texto | `Brazil`, `America` |
| D | Apelido | Texto | `J. McClane`, `leonardo1019` |
| E | Nome de memorando | Texto | `J. McClane`, `AG-Diody-LeonardoBH` |
| F | Saldo de fichas PP | Número (decimal) | `4.52`, `952493.1`, `0` |
| G | Agente | Texto | `None`, `AG-Diody-LeonardoBH`, `Vegas.DrAA1000` |
| H | ID do agente | Texto/Número | `None`, `10967045`, `1361759` |
| I | Saldo de crédito do agente | Número (decimal) | `0`, `54013.69`, `1000` |
| J | Superagente | Texto | `None`, `NIT.Nitpokerr N SAQU`, `Ilha PPPoker` |
| K | ID do superagente | Texto/Número | `None`, `8753977`, `2374843` |
| L | Saldo de crédito do superagente | Número (decimal) | `0`, `1000`, `87.01` |

---

## Estrutura Visual

```
Linha 1: [Aviso legal - texto longo mesclado]
Linha 2: [Nota sobre saldo - texto]
Linha 3: [A: Última conexão] [B: ID do jogador] [C: País/região] ... [L: Saldo de crédito do superagente]
Linha 4+: [Dados] [Dados] [Dados] ... [Dados]
```

---

## Relacionamentos

A estrutura mostra uma hierarquia de 3 níveis:

```
SUPERAGENTE (J, K, L)
    └── AGENTE (G, H, I)
            └── JOGADOR (A, B, C, D, E, F)
```

| Nível | Campos | Descrição |
|-------|--------|-----------|
| Jogador | A, B, C, D, E, F | Dados básicos (conexão, ID, país, apelido, memorando, saldo) |
| Agente | G, H, I | Gerencia jogadores (nome, ID, saldo de crédito) |
| Superagente | J, K, L | Gerencia agentes (nome, ID, saldo de crédito) |

---

## Tipos de Dados para Parsing

| Coluna | Campo | Tipo Sugerido |
|--------|-------|---------------|
| A | Última conexão | DateTime ou String |
| B | ID do jogador | Integer ou String |
| C | País/região | String |
| D | Apelido | String |
| E | Nome de memorando | String |
| F | Saldo de fichas PP | Float ou Decimal |
| G | Agente | String (nullable) |
| H | ID do agente | String (nullable - pode ser "None" ou número) |
| I | Saldo de crédito do agente | Float ou Decimal |
| J | Superagente | String (nullable) |
| K | ID do superagente | String (nullable - pode ser "None" ou número) |
| L | Saldo de crédito do superagente | Float ou Decimal |

---

## Observações Importantes

1. **Início dos dados**: Linha 4 (índice 3 se começar do 0)

2. **Valores "None"**: Indicam ausência de agente/superagente vinculado

3. **Formato de data**: `YYYY-MM-DD HH:MM:SS`

4. **Saldos decimais**: Usar ponto como separador decimal

5. **IDs podem ser texto ou número**: O campo pode conter `None` ou um número

6. **Hierarquia**: Jogador → Agente → Superagente (3 níveis)
