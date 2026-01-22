# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-21)

**Core value:** A logica de fechamento semanal (settlements) deve estar matematicamente correta e consistente. Todos os calculos, saldos, rake, transacoes e settlements devem ser precisos e auditaveis.

**Current focus:** Phase 3 IN PROGRESS - Auditoria de Fechamento Semanal

## Current Position

Phase: 3 of 5 (Auditoria de Fechamento Semanal) - IN PROGRESS
Plan: 2 of ? in current phase - COMPLETE
Status: Plan 03-02 (Rake Audit) complete
Last activity: 2026-01-22 - Completed 03-02 (Rake Audit)

Progress: ██████████ 100% (Plan 03-02)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~40 min
- Total execution time: ~9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-mapeamento-fluxo-ux | 2 | 6.75 hours | 3.4 hours |
| 02-auditoria-validacao | 2 | ~1.2 hours | ~35 min |
| 03-auditoria-fechamento-semanal | 1 | ~35 min | ~35 min |

**Recent Trend:**
- Last 5 plans: 45min, 6h, 25min, 45min, 35min
- Trend: Audit plans consistently ~35 min

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

**From 03-02 (NEW):**
- Dashboard rake calculations are CORRECT - properly aggregate from poker_player_summary
- CRITICAL: Settlement system uses chip_balance instead of rake - fundamentally wrong
- CRITICAL: Field name mismatch (rakeback_percentage vs rakeback_percent) - rakeback always 0
- CRITICAL: No period-based rake aggregation in closeWeek
- HIGH: Agent commission settlements not implemented
- HIGH: Super-agent cascade not implemented
- Rakeback formula verified: agent_rake * agent.rakeback_percent / 100

**For Implementation Phase:**
- Priority 0: Fix field name mismatch in settlements.ts (30 min)
- Priority 0: Fix settlement to use period rake from poker_player_summary (4-8 hours)
- Priority 1: Implement agent commission settlements (4-6 hours)
- Priority 1: Add super-agent cascade (6-8 hours)
- Priority 2: Implement atomic transaction or saga pattern
- Priority 2: Add upsert for transactions and demonstrativo

### Pending Todos

None - Plan 03-02 complete.

### Blockers/Concerns

**Critical Path Identified:**
1. Settlement system is BROKEN - uses wrong data source and has field name bug
2. Combined with 02-01 and 02-02 issues, the entire import -> settlement pipeline has critical bugs
3. NO PRODUCTION WEEKLY CLOSINGS should be done until settlements.closeWeek is fixed

## Session Continuity

Last session: 2026-01-22
Stopped at: Completed Plan 03-02 (Rake Audit)
Resume file: None

**Phase 03 Progress:** 1 of ? plans COMPLETE
- Wave 1: 03-02 (rake audit) - COMPLETE

**Key artifacts from Phase 03:**
- .planning/phases/03-auditoria-fechamento-semanal/03-02-RAKE-AUDIT.md (694 lines)
- .planning/phases/03-auditoria-fechamento-semanal/03-02-SUMMARY.md

**Combined Audit Findings:**

| Area | Source | Status | Risk |
|------|--------|--------|------|
| Frontend Validation | 02-01 | 15 rules, some not implemented | CRITICAL |
| Backend Validation | 02-01 | Uses rawData:any, 2 checks only | CRITICAL |
| Import Processing | 02-02 | No atomic transaction | CRITICAL |
| Rake Calculations | 03-02 | Dashboard correct | LOW |
| Settlement System | 03-02 | Uses wrong data source | CRITICAL |
| Rakeback Payments | 03-02 | Field bug = always 0 | CRITICAL |

**Next steps:**
1. Continue Phase 03 if more plans exist
2. Or proceed to implementation fixes (most urgent)
