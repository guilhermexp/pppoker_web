# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** A logica de fechamento semanal (settlements) deve estar matematicamente correta e consistente. Todos os calculos, saldos, rake, transacoes e settlements devem ser precisos e auditaveis.

**Current focus:** Phase 4 IN PROGRESS - Verificacao de Consistencia

## Current Position

Phase: 4 of 5 (Verificacao de Consistencia) - IN PROGRESS
Plan: 2 of 3 in current phase - COMPLETE
Status: Plan 04-02 (Schema/RLS Audit) complete
Last activity: 2026-01-22 - Completed 04-02 (Schema & RLS Audit)

Progress: ████████░░ 80% (Phase 04: 2/3 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: ~45 min
- Total execution time: ~12 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-mapeamento-fluxo-ux | 2 | 6.75 hours | 3.4 hours |
| 02-auditoria-validacao | 2 | ~1.2 hours | ~35 min |
| 03-auditoria-fechamento-semanal | 3 | ~2 hours | ~40 min |
| 04-verificacao-consistencia | 2 | ~1.5 hours | ~45 min |

**Recent Trend:**
- Last 5 plans: 45min, 35min, 45min, 45min, 45min
- Trend: Audit plans consistently ~35-45 min

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

**From 01-01:**
- Poker module uses tRPC exclusively (no Server Actions) - keep this pattern
- Frontend map scope: defer backend logic audit to Phase 02
- Critical procedures identified: imports.process and settlements.closeWeek for priority audit

**From 01-02:**
- Scope expanded: 8 routers documented (not 6 as initially planned)
- Separated backend and frontend documentation for better organization (BACKEND-MAP.md + FRONTEND-MAP.md)
- Critical components highlighted: ImportUploader, ImportValidationModal, CloseWeekPreviewModal
- Identified 60+ frontend components, prioritized documentation on critical paths
- Documented complete user flows (import, close week, player management) for UX analysis

**From 02-01:**
- ANSWER: Backend validation does NOT match client validation - major parity gap
- Frontend: 15 rules implemented (11 structure, 4 integrity)
- Backend: Only 2 explicit checks (empty data, >100 new players)
- CRITICAL: CONSISTENCY_RULES and MATH_RULES not implemented (arrays empty)
- CRITICAL: Backend uses rawData:any - no schema validation
- 5 prioritized recommendations documented in 02-01-VALIDATION-AUDIT.md

**From 02-02:**
- 13 processing steps documented with data flow and dependencies
- CRITICAL: No atomic transaction - partial failures leave inconsistent state
- CRITICAL: INSERT for transactions and demonstrativo - duplicates on re-import
- CRITICAL: Orphan data permitted (transactions with null player_ids)
- HIGH: Individual updates for player linking (N queries)
- HIGH: Simplistic transaction.type and amount calculations
- 10 database tables affected, complete transformation matrix documented
- Combined risk assessment: CRITICAL - invalid data can be imported and processed

**From 03-01 (Settlements Audit):**
- 5 CRITICAL issues identified in settlement procedures
- No atomic transaction in closeWeek - partial failures corrupt state
- No validation of netAmount in manual settlements
- Can delete completed/paid settlements
- markPaid accepts any value without validation
- No status transition validation

**From 03-02 (Rake Audit):**
- Dashboard rake calculations are CORRECT - properly aggregate from poker_player_summary
- CRITICAL: Settlement system uses chip_balance instead of rake - fundamentally wrong
- CRITICAL: Field name mismatch (rakeback_percentage vs rakeback_percent) - rakeback always 0
- CRITICAL: No period-based rake aggregation in closeWeek
- HIGH: Agent commission settlements not implemented
- HIGH: Super-agent cascade not implemented
- Rakeback formula verified: agent_rake * agent.rakeback_percent / 100

**From 03-03 (Transactions Audit):**
- chip_balance is STORED snapshot from spreadsheet, NOT calculated from transactions
- No database trigger maintains balance consistency
- Delete transaction does NOT update player balance
- Only 2 transaction types used from 12 available during import
- No consistency verification mechanism between balance and transactions
- Combined with 03-01/03-02: entire settlement pipeline fundamentally flawed

**From 04-01 (DB Access Patterns):**
- Comprehensive mapping of database access patterns across all poker routers
- Identified query patterns for consistency verification
- Documented data flow from import through settlement

**From 04-02 (Schema/RLS Audit - NEW):**
- CONFIRMED: rakeback_percentage vs rakeback_percent bug (13 code locations documented)
- CRITICAL: 9 tables exist in migrations but NOT in schema.ts
  - poker_week_periods (migration 0003)
  - poker_su_leagues, poker_su_week_periods, poker_su_imports (migration 0005)
  - poker_su_league_summary, poker_su_games, poker_su_game_players, poker_su_settlements (migration 0005)
- HIGH: 2 fields missing from pokerSettlements schema
  - week_period_id (from migration 0003)
  - rakeback_percent_used (from migration 0004)
- Tables poker_player_detailed, poker_demonstrativo, poker_agent_rakeback do NOT exist (never implemented)
- RLS policies CORRECTLY configured for all 17 poker tables
- All policies use team_id IN (SELECT private.get_teams_for_authenticated_user())

**For Implementation Phase (Priority Order):**

| Priority | Task | Effort | Source |
|----------|------|--------|--------|
| P0 | Fix field name mismatch in settlements.ts (7 locations) | 30 min | 04-02 |
| P0 | Fix field name mismatch in week-periods.ts (6 locations) | 30 min | 04-02 |
| P0 | Add integration test for rakeback calculation | 2 hours | 04-02 |
| P0 | Add database trigger for chip_balance | 4-8 hours | 03-03 |
| P0 | Add consistency check procedure | 2-4 hours | 03-03 |
| P1 | Add missing fields to pokerSettlements schema | 45 min | 04-02 |
| P1 | Add pokerWeekPeriods to schema.ts | 2 hours | 04-02 |
| P1 | Fix settlement to use period rake | 4-8 hours | 03-02 |
| P1 | Improve transaction type assignment | 6-12 hours | 03-03 |
| P1 | Implement agent commission settlements | 4-6 hours | 03-02 |
| P1 | Add super-agent cascade | 6-8 hours | 03-02 |
| P2 | Add all SU tables to schema.ts | 4-6 hours | 04-02 |
| P2 | Implement atomic transaction pattern | 8-16 hours | 03-01 |
| P2 | Add upsert for transactions | 4-6 hours | 02-02 |

### Pending Todos

None - Plan 04-02 complete.

### Blockers/Concerns

**Critical Path Identified:**
1. Settlement system is BROKEN - uses wrong data source (chip_balance vs rake) and has field name bug
2. chip_balance is a snapshot, not derived from transactions - no data integrity guarantee
3. Combined with 02-01 and 02-02 issues, the entire import -> settlement pipeline has critical bugs
4. **NO PRODUCTION WEEKLY CLOSINGS should be done until settlements.closeWeek is fixed**
5. **Rakeback field name bug confirmed with exact line numbers - immediate fix recommended**

## Session Continuity

Last session: 2026-01-22
Stopped at: Completed Plan 04-02 (Schema & RLS Audit) - Phase 04 in progress
Resume file: None

**Phase 04 Progress:**
- Plan 04-01: DB Access Patterns - COMPLETE
- Plan 04-02: Schema/RLS Audit - COMPLETE
- Plan 04-03: Cross-validation Rules - PENDING

**Key artifacts from Phase 04:**
- .planning/phases/04-verificacao-consistencia/04-01-QUERIES-AUDIT.md (994 lines)
- .planning/phases/04-verificacao-consistencia/04-01-SUMMARY.md (237 lines)
- .planning/phases/04-verificacao-consistencia/04-02-SCHEMA-RLS-AUDIT.md (567 lines)
- .planning/phases/04-verificacao-consistencia/04-02-SUMMARY.md

**Combined Audit Findings (Complete through Phase 04-02):**

| Area | Source | Status | Risk |
|------|--------|--------|------|
| Frontend Validation | 02-01 | 15 rules, some not implemented | CRITICAL |
| Backend Validation | 02-01 | Uses rawData:any, 2 checks only | CRITICAL |
| Import Processing | 02-02 | No atomic transaction | CRITICAL |
| Rake Calculations | 03-02 | Dashboard correct | LOW |
| Settlement System | 03-01, 03-02 | Uses wrong data source | CRITICAL |
| Rakeback Payments | 03-02, 04-02 | Field bug = always 0 (CONFIRMED) | CRITICAL |
| chip_balance Integrity | 03-03 | Snapshot, not calculated | CRITICAL |
| Transaction Processing | 03-03 | 2 of 12 types used | HIGH |
| Schema Alignment | 04-02 | 9 tables missing from schema.ts | CRITICAL |
| RLS Policies | 04-02 | All 17 tables correct | LOW |

**Total Critical Issues Across All Audits: 18+**

**Rakeback Bug Details (04-02):**
- Schema: `rakeback_percent` (CORRECT)
- Code: `rakeback_percentage` (WRONG - 13 locations)
- Files affected:
  - settlements.ts: lines 40, 41, 112, 120, 400, 425
  - week-periods.ts: lines 680, 692, 855, 875, 1007, 1038

**Next steps:**
1. Execute Plan 04-03 (Cross-validation Rules) to complete Phase 04
2. Ready to proceed to Phase 05 (Implementation) after Phase 04 complete
3. **Recommend immediate fix for rakeback_percentage bug before any production use**
