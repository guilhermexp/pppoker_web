# Documentacao do Modulo SU (Super Union / Liga) - Mid Poker

> Documentacao tecnica completa do modulo Super Union: importacao de ligas, dashboard, fechamento semanal, settlements, metas e rateio.

## Indice

| Arquivo | Descricao |
|---------|-----------|
| [FLUXO_IMPORTACAO.md](./FLUXO_IMPORTACAO.md) | Fluxo completo: upload -> parsing 4 abas -> validacao -> aprovacao -> processamento -> dashboard |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Schema completo: 11 tabelas SU, enums, relacionamentos, indexes, RLS |
| [DASHBOARD_WIDGETS.md](./DASHBOARD_WIDGETS.md) | Dashboard: 8 widgets, modos de visualizacao, grade de torneios, rateio |
| [FECHAMENTO_SEMANA.md](./FECHAMENTO_SEMANA.md) | Fechamento semanal: preview 5 abas, settlements por liga, ciclo de vida |
| [ARQUITETURA_TRPC.md](./ARQUITETURA_TRPC.md) | Arquitetura tRPC: 5 sub-routers SU, middleware, data loading patterns |
| [METAS_RATEIO.md](./METAS_RATEIO.md) | Sistema de metas: grupos, time slots, club metas, heranca semanal |

---

## Fluxo End-to-End

```
1. IMPORTACAO
   Planilha Liga PPPoker (.xlsx) -> Upload -> Parse (4 abas) -> Validacao
   -> Modal Preview (7 abas) -> Aprovacao do usuario
   Ver: FLUXO_IMPORTACAO.md

2. PROCESSAMENTO
   Backend: 4-phase pipeline -> leagues, summaries, games, game_players
   Status: poker_su_imports.committed = false (draft)
   Ver: FLUXO_IMPORTACAO.md

3. DASHBOARD
   8 widgets customizaveis | Modo: Semana Atual vs Historico
   Semana Atual: inclui draft | Historico: somente committed
   Ver: DASHBOARD_WIDGETS.md

4. GRADE DE TORNEIOS
   Importacao de grade -> Visualizacao por dia -> Cross-validation com PPST
   Overlay analysis -> Confronto agendado vs realizado
   Ver: DASHBOARD_WIDGETS.md

5. METAS E RATEIO
   Meta Groups (% distribuicao) -> Time Slots (override por horario)
   -> Club Metas (alvos por clube/semana) -> Heranca semanal
   Ver: METAS_RATEIO.md

6. FECHAMENTO DA SEMANA
   Preview (5 abas) -> Confirmar
   Backend: settlements por liga, fecha periodo, commita imports
   Ver: FECHAMENTO_SEMANA.md

7. SETTLEMENTS
   Status: pending -> partial -> completed | disputed | cancelled
   Pagamento por liga, historico, filtros
   Ver: FECHAMENTO_SEMANA.md

8. BANCO DE DADOS
   11 tabelas SU, isolamento por team_id (RLS), numeric(14,2)
   Ver: DATABASE_SCHEMA.md

9. ARQUITETURA
   tRPC (Hono + Next.js), 5 sub-routers SU, middleware chain
   Ver: ARQUITETURA_TRPC.md
```

---

## Arquivos de Codigo Principais

### Frontend (Dashboard)

| Arquivo | Descricao |
|---------|-----------|
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/page.tsx` | Pagina principal (dashboard) |
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/import/page.tsx` | Pagina de importacao |
| `apps/dashboard/src/app/[locale]/(app)/(sidebar)/su/grade/page.tsx` | Pagina grade de torneios |
| `apps/dashboard/src/components/league/league-import-uploader.tsx` | Parser + uploader (1785 linhas) |
| `apps/dashboard/src/components/league/league-import-validation-modal.tsx` | Modal de validacao (7 abas) |
| `apps/dashboard/src/components/league/league-import-progress-modal.tsx` | Modal de progresso |
| `apps/dashboard/src/components/su/su-dashboard-header.tsx` | Header do dashboard SU |
| `apps/dashboard/src/components/su/close-su-week-preview-modal.tsx` | Modal de preview fechamento (5 abas) |
| `apps/dashboard/src/components/su/widgets/su-widgets-grid.tsx` | Grid de widgets SU |
| `apps/dashboard/src/components/su/widgets/su-stat-card.tsx` | Card base widgets |
| `apps/dashboard/src/components/league/validation-tabs/rateio/` | 10 componentes do sistema de rateio |
| `apps/dashboard/src/lib/league/validation.ts` | Engine de validacao |
| `apps/dashboard/src/lib/league/types.ts` | Tipos TypeScript |

### Backend (API)

| Arquivo | Descricao |
|---------|-----------|
| `apps/api/src/trpc/routers/su/index.ts` | Router principal SU |
| `apps/api/src/trpc/routers/su/imports.ts` | Import/validacao/processamento (797 linhas) |
| `apps/api/src/trpc/routers/su/analytics.ts` | Dashboard stats e widgets |
| `apps/api/src/trpc/routers/su/week-periods.ts` | Periodos semanais e fechamento |
| `apps/api/src/trpc/routers/su/settlements.ts` | Settlements CRUD |
| `apps/api/src/trpc/routers/su/metas.ts` | Meta groups, time slots, club metas (880 linhas) |
| `apps/api/src/trpc/init.ts` | Contexto e middleware |

### Database

| Arquivo | Descricao |
|---------|-----------|
| `packages/db/src/schema.ts` | Schema Drizzle (parcial para SU) |
| `packages/db/migrations/0005_poker_su_tables.sql` | Tabelas principais SU |
| `packages/db/migrations/0007_add_committed_to_su_imports.sql` | Campo committed |
| `packages/db/migrations/0009_poker_su_meta_tables.sql` | Tabelas de metas |

---

## Diferenca: SU vs Clube

| Aspecto | SU (Super Union) | Clube |
|---------|------------------|-------|
| **Escopo** | Multi-clube (ligas agregadas) | Clube unico |
| **Planilha** | 4 abas (Geral PPST, Jogos PPST, Geral PPSR, Jogos PPSR) | 7 abas |
| **Dados** | PPST (torneios) + PPSR (cash) separados | Sessoes unificadas |
| **Settlements** | Por liga | Por jogador |
| **Metas** | Grupos + time slots + club targets | N/A |
| **Overlay** | Calculo automatico GTD vs arrecadacao | N/A |
| **Grade** | Importacao e confronto de agenda | N/A |
| **Commitment** | committed flag + committed_at | Draft/Committed similar |

---

**Ultima atualizacao:** 2026-01-31
**Versao:** 1.0
