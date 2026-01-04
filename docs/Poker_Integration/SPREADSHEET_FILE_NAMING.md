# Convenções de Nomenclatura de Arquivos PPPoker

> Última atualização: 23/12/2025
> Implementado em: `apps/dashboard/src/lib/poker/spreadsheet-types.ts`

## Visão Geral

O PPPoker exporta planilhas com nomes que seguem padrões específicos. O sistema usa esses padrões para identificar automaticamente o **tipo de planilha** e extrair **metadados** como IDs e período.

---

## Tipos de Planilha

| Tipo | Sufixo | Descrição |
|------|--------|-----------|
| `super-union` | `-PPST-PPSR` | Torneios + Cash do lobby global |
| `super-union-ppst` | `-PPST` | Apenas torneios do lobby global |
| `super-union-ppsr` | `-PPSR` | Apenas cash games do lobby global |
| `league` | (nenhum) | Liga com todos os clubes associados |
| `club` | (nenhum) | Clube individual (sem liga) |

---

## Padrões de Nomenclatura

### 1. Super Union (Lobby Global)

**Padrão:** `{ligaId}-{clubeMasterId}-{dataInicio}-{dataFim}-{sufixo}.xlsx`

**Exemplo:** `1765-962181-20251215-20251221-PPST-PPSR.xlsx`

| Parte | Valor | Descrição |
|-------|-------|-----------|
| `1765` | ligaId | ID da liga emissora |
| `962181` | clubeMasterId | ID do clube master/botão |
| `20251215` | dataInicio | Início do período (YYYYMMDD) |
| `20251221` | dataFim | Fim do período (YYYYMMDD) |
| `PPST-PPSR` | sufixo | Tipo de dados exportados |

**Variações de sufixo:**
- `PPST-PPSR` = Torneios + Cash games
- `PPST` = Apenas torneios (PPPoker Super Tournament)
- `PPSR` = Apenas cash (PPPoker Super Ring)

**Conteúdo:** Dados de **TODAS** as ligas e clubes do lobby global.

---

### 2. Liga (Sem Super Union)

**Padrão:** `{ligaId}-{clubeMasterId}-{dataInicio}-{dataFim}.xlsx`

**Exemplo:** `1765-962181-20251215-20251221.xlsx`

| Parte | Valor | Descrição |
|-------|-------|-----------|
| `1765` | ligaId | ID da liga |
| `962181` | clubeMasterId | ID do clube master/botão |
| `20251215` | dataInicio | Início do período |
| `20251221` | dataFim | Fim do período |

**Conteúdo:** Dados da liga + todos os clubes filiados.

---

### 3. Clube Individual

**Padrão:** `{clubeId}-{secondaryId}-{dataInicio}-{dataFim}.xlsx`

**Exemplo:** `3357-4210947-20250901-20250907.xlsx`

| Parte | Valor | Descrição |
|-------|-------|-----------|
| `3357` | clubeId | ID do clube |
| `4210947` | secondaryId | ID secundário (jogador ou outro) |
| `20250901` | dataInicio | Início do período |
| `20250907` | dataFim | Fim do período |

**Conteúdo:** Apenas dados do clube solicitado.

---

## Terminologia

| Termo | Significado |
|-------|-------------|
| **PPST** | PPPoker Super Tournament - torneios do lobby global |
| **PPSR** | PPPoker Super Ring - cash games do lobby global |
| **Super Union** | Lobby global que agrupa múltiplas ligas |
| **Liga** | Organização que gerencia múltiplos clubes |
| **Clube Master** | Clube que criou a liga (também chamado de "Botão") |
| **Clube** | Entidade individual onde jogadores participam |

---

## Hierarquia

```
Super Union (PPST/PPSR)
└── Liga 1765
    ├── Clube Master 962181 (Botão)
    ├── Clube 123456
    ├── Clube 234567
    └── Clube 345678
└── Liga 1675
    ├── Clube Master 851234
    ├── Clube 456789
    └── ...
```

---

## Ligas Brasileiras Conhecidas

IDs das principais ligas brasileiras (responsáveis por ~60% do GTD):

| ID | Observação |
|----|------------|
| `1765` | Liga BR principal |
| `1675` | Liga BR |
| `2448` | Liga BR |
| `2101` | Liga BR |

Constante no código: `KNOWN_LEAGUE_IDS.BRAZILIAN_LEAGUES`

---

## Uso no Sistema

### Parser de Arquivo

```typescript
import { parseSpreadsheetFileName } from "@/lib/poker/spreadsheet-types";

const metadata = parseSpreadsheetFileName("1765-962181-20251215-20251221-PPST-PPSR.xlsx");

// Resultado:
{
  type: "super-union",
  typeLabel: "Super Union (PPST + PPSR)",
  typeDescription: "Dados de todas as ligas e clubes do lobby global",
  primaryId: 1765,           // Liga ID
  secondaryId: 962181,       // Clube Master ID
  dateStart: "20251215",
  dateEnd: "20251221",
  dateStartFormatted: "15/12/2025",
  dateEndFormatted: "21/12/2025",
  suffix: "PPST-PPSR",
  parsed: true,
  originalFileName: "1765-962181-20251215-20251221-PPST-PPSR.xlsx"
}
```

### Verificar Liga Brasileira

```typescript
import { isBrazilianLeague } from "@/lib/poker/spreadsheet-types";

isBrazilianLeague("1765"); // true
isBrazilianLeague("9999"); // false
```

---

## Exibição na UI

O sistema exibe informações extraídas no **footer dos modais de validação**:

```
[Badge: Super Union (PPST + PPSR)] | Liga: 1765 | Clube Master: 962181
Dados de todas as ligas e clubes do lobby global (torneios + cash games)
```

---

## Heurística de Classificação

Quando não há sufixo (PPST/PPSR), o sistema usa heurística:

- **ID < 10000** → Classificado como `league`
- **ID >= 10000** → Classificado como `club`

Isso é uma aproximação. O usuário pode confirmar/corrigir na UI.

---

## Arquivos Relacionados

| Arquivo | Descrição |
|---------|-----------|
| `lib/poker/spreadsheet-types.ts` | Parser e tipos |
| `components/poker/import-validation-modal.tsx` | Modal de validação (clube) |
| `components/league/league-import-validation-modal.tsx` | Modal de validação (liga) |
| `components/poker-settings.tsx` | Configurações de poker |
