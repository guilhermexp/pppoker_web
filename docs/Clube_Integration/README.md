# Documentacao do Modulo de Clubes - Mid Poker

> Documentacao tecnica completa do modulo de clubes: importacao, validacao, dashboard, fechamento semanal e settlements.

## Indice

| Arquivo | Descricao |
|---------|-----------|
| [FLUXO_IMPORTACAO.md](./FLUXO_IMPORTACAO.md) | Fluxo completo: upload -> validacao -> aprovacao -> processamento -> dashboard -> fechamento |
| [PLANILHA_BASICA_PPP.md](./PLANILHA_BASICA_PPP.md) | Mapeamento detalhado das 7 abas da planilha PPPoker (coluna a coluna) |
| [DRAFT_COMMITTED_SYSTEM.md](./DRAFT_COMMITTED_SYSTEM.md) | Sistema Draft/Committed: como dados transitam de rascunho para historico |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Schema completo do banco: 10 tabelas poker, enums, relacionamentos |
| [DASHBOARD_WIDGETS.md](./DASHBOARD_WIDGETS.md) | Dashboard: 10 widgets, modos de visualizacao, drag-and-drop, fontes de dados |
| [FECHAMENTO_SEMANA.md](./FECHAMENTO_SEMANA.md) | Fechamento semanal: preview, settlements, override de rakeback, ciclo de vida |
| [ARQUITETURA_TRPC.md](./ARQUITETURA_TRPC.md) | Arquitetura tRPC: routers, middleware, contexto, data loading patterns |

---

## Fluxo End-to-End

```
1. IMPORTACAO
   Planilha PPPoker (.xlsx) -> Upload -> Parse (7 abas) -> Validacao (20+ regras)
   -> Modal Preview (10 abas) -> Aprovacao do usuario
   Ver: FLUXO_IMPORTACAO.md, PLANILHA_BASICA_PPP.md

2. PROCESSAMENTO
   Backend: 9-step pipeline -> players, agents, transactions, sessions, summaries
   Status: poker_imports.committed = false (draft)
   Ver: FLUXO_IMPORTACAO.md, DRAFT_COMMITTED_SYSTEM.md

3. DASHBOARD
   Widgets customizaveis (8 visiveis, 2 ocultos) | Modo: Semana Atual vs Historico
   Semana Atual: inclui draft | Historico: somente committed
   Ver: DASHBOARD_WIDGETS.md

4. FECHAMENTO DA SEMANA
   Preview (7 abas) -> Override rakeback -> Confirmar
   Backend: settlements, zera saldos, fecha periodo, commita imports
   Ver: FECHAMENTO_SEMANA.md

5. SETTLEMENTS
   Status: pending -> partial -> completed | disputed | cancelled
   Pagamento, historico, filtros
   Ver: FECHAMENTO_SEMANA.md

6. BANCO DE DADOS
   10 tabelas poker, isolamento por team_id (RLS), numeric(14,2)
   Ver: DATABASE_SCHEMA.md

7. ARQUITETURA
   tRPC (Hono + Next.js), 7 sub-routers poker, middleware chain
   Ver: ARQUITETURA_TRPC.md
```

---

## Arquivos de Codigo Principais

### Frontend (Dashboard)

| Arquivo | Descricao |
|---------|-----------|
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/page.tsx` | Pagina principal (dashboard) |
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/import/page.tsx` | Pagina de importacao |
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/poker/settlements/page.tsx` | Pagina de settlements |
| `apps/dashboard/src/components/poker/import-uploader.tsx` | Parser + uploader (2299 linhas) |
| `apps/dashboard/src/components/poker/import-validation-modal.tsx` | Modal de validacao (10 abas) |
| `apps/dashboard/src/components/poker/poker-dashboard-header.tsx` | Header do dashboard |
| `apps/dashboard/src/components/poker/close-week-button.tsx` | Botao fechar semana |
| `apps/dashboard/src/components/poker/close-week-preview-modal.tsx` | Modal de preview (7 abas) |
| `apps/dashboard/src/components/widgets/poker/poker-widgets-grid.tsx` | Grid de widgets |
| `apps/dashboard/src/components/widgets/poker/poker-stat-card.tsx` | Widgets individuais |
| `apps/dashboard/src/lib/poker/validation.ts` | Engine de validacao (1916 linhas) |

### Backend (API)

| Arquivo | Descricao |
|---------|-----------|
| `apps/api/src/trpc/routers/poker/index.ts` | Router principal poker |
| `apps/api/src/trpc/routers/poker/imports.ts` | Import/validacao/processamento (1754 linhas) |
| `apps/api/src/trpc/routers/poker/analytics.ts` | Dashboard stats e widgets |
| `apps/api/src/trpc/routers/poker/week-periods.ts` | Periodos semanais e fechamento |
| `apps/api/src/trpc/routers/poker/settlements.ts` | Settlements CRUD |
| `apps/api/src/trpc/routers/poker/players.ts` | Players/agents CRUD |
| `apps/api/src/trpc/routers/poker/sessions.ts` | Sessoes de jogo |
| `apps/api/src/trpc/routers/poker/transactions.ts` | Transacoes |
| `apps/api/src/trpc/init.ts` | Contexto e middleware |

### Database

| Arquivo | Descricao |
|---------|-----------|
| `packages/db/src/schema.ts` | Schema completo (4274 linhas) |
| `packages/db/migrations/` | Migracoes SQL versionadas |

---

## Identificacao de Planilha

O sistema identifica automaticamente o tipo pelo nome do arquivo:

```
1765-962181-20251215-20251221-PPST-PPSR.xlsx  -> Super Union
1765-962181-20251215-20251221.xlsx            -> Liga
3357-4210947-20250901-20250907.xlsx           -> Clube
```

### Tipos de Planilha

| Tipo | Abas | Processamento |
|------|------|---------------|
| **Clube** (Basica) | 7 abas (Geral, Detalhado, Partidas, Transacoes, Detalhes usuario, Retorno taxa, Demonstrativo) | `import-uploader.tsx` |
| **Liga** (Super Union) | 4 abas (Geral PPST, Jogos PPST, Geral PPSR, Jogos PPSR) | `league-import-uploader.tsx` |

---

**Ultima atualizacao:** 2026-01-31
**Versao:** 2.0
