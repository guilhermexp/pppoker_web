---
phase: 03-auditoria-fechamento-semanal
plan: 02
subsystem: rake-audit
tags: [poker, rake, rakeback, settlements, hierarchy, analytics]

# Dependency graph
requires:
  - phase: 02-auditoria-validacao
    provides: Knowledge of data flow and validation gaps
provides:
  - Complete audit of rake calculation system
  - Rakeback calculation analysis
  - Hierarchy distribution mapping
  - Settlement system critical bug identification
  - 4 critical + 3 high priority recommendations
affects: [03-03-PLAN (settlements audit), phase-04-correcoes]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Rake aggregation from poker_player_summary
    - Rakeback = SUM(player_rake) * agent.rakeback_percent / 100
    - Settlement creation from chip_balance (INCORRECT)

key-files:
  created:
    - .planning/phases/03-auditoria-fechamento-semanal/03-02-RAKE-AUDIT.md
  modified: []

key-decisions:
  - "Dashboard rake calculations are CORRECT - use poker_player_summary"
  - "Settlement calculation is CRITICALLY FLAWED - uses chip_balance not rake"
  - "Field name mismatch: rakeback_percentage vs rakeback_percent causes 0 rakeback"
  - "Agent commission settlements not implemented"
  - "Super-agent cascade not implemented"

patterns-established:
  - "Rake audit document structure with formulas and code evidence"
  - "Financial flow diagrams for poker system"
  - "Gap prioritization (Critical/High/Medium/Low) with effort estimates"

# Metrics
duration: ~35min
completed: 2026-01-22
---

# Phase 03 Plan 02: Rake Audit Summary

**Complete audit revealing dashboard rake calculations are correct but settlement system is critically flawed with multiple bugs preventing proper rakeback payments**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-01-22
- **Completed:** 2026-01-22
- **Tasks:** 3
- **Files created:** 1 (694 lines)

## Accomplishments

- Audited all rake calculation procedures in analytics.ts
- Documented rake aggregation formulas with code evidence
- Analyzed player/agent/super-agent hierarchy structure
- Identified 4 CRITICAL bugs in settlement system
- Created comprehensive audit document with recommendations

## Task Commits

Each task was committed atomically:

1. **Task 1-3: Rake Audit Document** - `6fe7443f` (docs)

## Files Created/Modified

- `.planning/phases/03-auditoria-fechamento-semanal/03-02-RAKE-AUDIT.md` - Complete audit document (694 lines)

## Decisions Made

1. **Dashboard rake is CORRECT** - Analytics router properly aggregates from poker_player_summary
2. **Settlement system is BROKEN** - Uses chip_balance (balance) instead of rake
3. **Field name bug** - Query uses `rakeback_percentage` but schema has `rakeback_percent`
4. **Rakeback never paid** - Due to field mismatch, rakeback_amount always = 0
5. **Agent commissions not created** - Only player settlements exist

## Key Findings

### Rake Calculation Summary

| Procedure | Source | Formula | Status |
|-----------|--------|---------|--------|
| getDashboardStats | poker_player_summary | SUM(rake_total) | CORRECT |
| getGrossRake | poker_session_players | SUM(rake) | CORRECT |
| getRakeTrend | poker_session_players | Weekly SUM(rake) | CORRECT |
| totalRakeback | poker_player_summary | agent_rake * rakeback_percent/100 | CORRECT |

### Settlement Critical Issues

| ID | Issue | Impact |
|----|-------|--------|
| C1 | Uses chip_balance not rake | Wrong settlement amounts |
| C2 | Rakeback applied to balance | Incorrect calculation |
| C3 | Field name mismatch | Rakeback always 0 |
| C4 | No period-based rake query | Not period-aware |

### Hierarchy Analysis

```
Super Agent (rakeback_percent=X%)
    |
    +-> Agent (rakeback_percent=Y%)
           |
           +-> Player (inherits agent's %)
```

- Rakeback % stored on agents, players inherit
- Super-agent cascade NOT implemented
- Players without agents have no rakeback

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

None - all files accessible, analysis completed successfully.

## Recommendations (Prioritized)

| Priority | Recommendation | Effort |
|----------|----------------|--------|
| P0 | Fix field name mismatch (rakeback_percentage -> rakeback_percent) | 30 min |
| P0 | Fix settlement to use period rake from poker_player_summary | 4-8 hours |
| P1 | Implement agent commission settlements | 4-6 hours |
| P1 | Add super-agent cascade | 6-8 hours |
| P2 | Add rake validation (session vs summary match) | 2-3 hours |

## Next Phase Readiness

- Rake audit complete with actionable recommendations
- Ready for Phase 03 Plan 03 (if exists) or next phase
- Findings directly impact settlement implementation fixes

### Dependencies for Next Plans

- Settlement fixes should be implemented before any production weekly closings
- Dashboard can continue to be used - calculations are correct
- Agent/super-agent cascade is enhancement, not blocker

---
*Phase: 03-auditoria-fechamento-semanal*
*Completed: 2026-01-22*
