---
phase: 03-auditoria-fechamento-semanal
plan: 01
subsystem: settlements
tags: [poker, settlements, week-periods, trpc, closeWeek, audit]

# Dependency graph
requires:
  - phase: 02-auditoria-validacao
    provides: Validation and processing gaps context (rawData:any, no atomic transactions)
provides:
  - Complete audit of 15 settlement procedures
  - Mathematical verification of closeWeek calculations
  - Edge case mapping for settlements and week-periods
  - 17 gaps identified and prioritized (5 CRITICAL, 6 HIGH, 4 MEDIUM, 2 LOW)
  - 8 specific recommendations with code examples
affects: [03-02-implementation, phase-04-fixes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Status machine pattern needed for settlement transitions
    - Atomic transaction pattern needed for multi-table operations
    - Audit trail pattern for financial records

key-files:
  created:
    - .planning/phases/03-auditoria-fechamento-semanal/03-01-SETTLEMENTS-AUDIT.md
  modified: []

key-decisions:
  - "closeWeek in week-periods.ts is the primary procedure (not settlements.closeWeek)"
  - "Rakeback asymmetric behavior (only positive balances) needs stakeholder review"
  - "Atomic transaction is highest priority fix"
  - "Status transitions require state machine validation"

patterns-established:
  - "Audit document structure with numbered gaps and recommendations"
  - "Mathematical verification tables for financial calculations"
  - "Edge case documentation with behavior and problem analysis"

# Metrics
duration: 35min
completed: 2026-01-22
---

# Phase 03 Plan 01: Settlements Audit Summary

**Complete audit of 15 settlement/week-period procedures revealing 5 CRITICAL gaps including no atomic transaction in closeWeek, unvalidated status transitions, and asymmetric rakeback calculation**

## Performance

- **Duration:** 35 min
- **Started:** 2026-01-22T17:15:00Z
- **Completed:** 2026-01-22T17:50:00Z
- **Tasks:** 3
- **Files created:** 1

## Accomplishments

- Audited 8 settlement procedures (483 lines) with detailed input/output analysis
- Deep dive on week-periods.close procedure (247 lines, 7 execution steps)
- Identified 17 gaps: 5 CRITICAL, 6 HIGH, 4 MEDIUM, 2 LOW
- Documented mathematical calculations with numeric examples
- Mapped 6 edge cases with expected vs actual behavior
- Created 8 prioritized recommendations with code examples

## Task Commits

Each task was committed atomically:

1. **Task 1-3: Audit settlements and create document** - `40828482` (docs)

**Plan metadata:** (this commit)

## Files Created/Modified

- `.planning/phases/03-auditoria-fechamento-semanal/03-01-SETTLEMENTS-AUDIT.md` - Complete audit document (788 lines)

## Decisions Made

1. **Primary closeWeek procedure:** `week-periods.close` is the main procedure used by frontend; `settlements.closeWeek` appears to be a simplified/deprecated version
2. **Rakeback asymmetry intentional?** Current logic only applies rakeback to positive balances - needs stakeholder review as this affects financial calculations
3. **Atomic transaction highest priority:** The lack of transaction wrapping in close() creates 2x duplicate risk on partial failure
4. **Status machine needed:** Current code allows any status transition including completed->pending

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all files were accessible and analysis completed successfully.

## User Setup Required

None - no external service configuration required.

## Key Findings

### Critical Gaps Summary

| ID | Gap | Risk |
|----|-----|------|
| C1 | No atomic transaction in close() | Duplicates on failure |
| C2 | No validation of netAmount in create() | Incorrect values accepted |
| C3 | Can delete completed settlements | Financial data loss |
| C4 | markPaid accepts any value | Overpayment possible |
| C5 | No status transition validation | State inconsistency |

### Mathematical Formula Analysis

```
grossAmount = chip_balance
rakebackPercent = override ?? player.% ?? 0
rakebackAmount = gross > 0 ? (gross * % / 100) : 0  // ONLY POSITIVE
netAmount = gross - rakeback
```

**Problem:** Negative balances (debts) get 0 rakeback, while positive balances get discount. This is asymmetric and may not be intentional.

### closeWeek Execution Flow

```
Step 1: Get/Create week period
Step 2: Query players with chip_balance != 0
Step 3: Calculate & INSERT settlements  <-- POINT OF FAILURE
Step 4: UPDATE player chip_balances     <-- POINT OF FAILURE
Step 5: Get session stats
Step 6: UPDATE week period as closed
Step 7: UPDATE imports as committed
```

**Risk:** If Step 4 fails after Step 3 succeeds, settlements exist but balances are NOT reset. Re-running creates duplicates.

## Relation to Phase 2 Findings

| Phase 2 Finding | Impact on Settlements |
|-----------------|----------------------|
| rawData:any in backend | Invalid data can generate incorrect settlements |
| No atomic import | Chip balances may be wrong before close |
| CONSISTENCY_RULES empty | Inconsistent data generates incorrect settlements |
| MATH_RULES empty | Totals not verified before settlement generation |

## Recommendations Priority

1. **[CRITICAL]** Implement atomic transaction in close() using Supabase RPC
2. **[CRITICAL]** Validate netAmount calculation in create()
3. **[CRITICAL]** Add status transition validation
4. **[HIGH]** Implement audit trail for settlements
5. **[HIGH]** Review rakeback asymmetry with stakeholders
6. **[MEDIUM]** Add decimal rounding for currency precision
7. **[MEDIUM]** Implement soft delete for settlements
8. **[LOW]** Remove console.log statements in production

## Next Phase Readiness

- Audit complete with actionable recommendations
- Ready for Phase 03 Plan 02 (if exists) or implementation phase
- Critical fixes should be prioritized before adding new features
- Combined with Phase 2 findings, the import->settlement pipeline has significant integrity gaps

### Dependencies for Implementation

- R1 (atomic transaction) requires Supabase RPC or database function
- R3 (status validation) can be implemented in TypeScript
- R4 (audit trail) requires new database table
- R5 (rakeback decision) requires stakeholder input

---
*Phase: 03-auditoria-fechamento-semanal*
*Completed: 2026-01-22*
