# Documentação de Validação de Planilhas

> Documentação técnica dos validadores de planilhas PPPoker

## Índice

| Arquivo | Descrição |
|---------|-----------|
| [SPREADSHEET_FILE_NAMING.md](./SPREADSHEET_FILE_NAMING.md) | Convenções de nomenclatura e tipos de arquivo |
| [PLANILHA_BASICA_PPP.md](./PLANILHA_BASICA_PPP.md) | Validador de clube (planilha básica) |
| [PLANILHA_LIGA_PPP.md](./PLANILHA_LIGA_PPP.md) | Validador de liga (Super Union) |

---

## Visão Geral

O sistema possui dois validadores de planilhas PPPoker:

### 1. Validador de Clube (Planilha Básica)

- **Arquivo:** `components/poker/import-validation-modal.tsx`
- **Uso:** Importação de dados de um único clube
- **Abas:** Geral, Detalhado, Partidas, Transações, etc.

### 2. Validador de Liga (Super Union)

- **Arquivo:** `components/league/league-import-validation-modal.tsx`
- **Uso:** Importação de dados de múltiplas ligas/clubes
- **Abas:** Geral PPST, Jogos PPST, Geral PPSR, Jogos PPSR

---

## Identificação Automática

O sistema identifica automaticamente o tipo de planilha pelo nome do arquivo:

```
1765-962181-20251215-20251221-PPST-PPSR.xlsx  → Super Union
1765-962181-20251215-20251221.xlsx            → Liga
3357-4210947-20250901-20250907.xlsx           → Clube
```

Ver [SPREADSHEET_FILE_NAMING.md](./SPREADSHEET_FILE_NAMING.md) para detalhes.

---

## Arquivos de Código

| Tipo | Componentes |
|------|-------------|
| **Parser** | `lib/poker/spreadsheet-types.ts` |
| **Modal Clube** | `components/poker/import-validation-modal.tsx` |
| **Modal Liga** | `components/league/league-import-validation-modal.tsx` |
| **Uploader Clube** | `components/poker/import-uploader.tsx` |
| **Uploader Liga** | `components/league/league-import-uploader.tsx` |
| **Tabs Clube** | `components/poker/validation-tabs/*.tsx` |
| **Tabs Liga** | `components/league/validation-tabs/*.tsx` |
