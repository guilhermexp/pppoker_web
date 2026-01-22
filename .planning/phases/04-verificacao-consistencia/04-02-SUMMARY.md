---
phase: 04-verificacao-consistencia
plan: 02
subsystem: schema-rls-audit
tags: [poker, schema, drizzle, migrations, rls, security, rakeback-bug]

# Dependency graph
requires:
  - phase: 03-auditoria-fechamento-semanal
    provides: Knowledge of rakeback_percentage vs rakeback_percent bug location
provides:
  - Complete schema.ts vs migrations alignment audit
  - Confirmed rakeback field name bug with exact code locations
  - RLS policy audit for all poker tables
  - 9 missing tables identified
  - 2 missing fields in pokerSettlements identified
affects: [phase-05-correcoes, immediate-bug-fix-priority]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Drizzle ORM schema definitions
    - pgPolicy RLS definitions
    - Supabase RLS using private.get_teams_for_authenticated_user()

key-files:
  created:
    - .planning/phases/04-verificacao-consistencia/04-02-SCHEMA-RLS-AUDIT.md
  modified: []

key-decisions:
  - "Field name bug CONFIRMED: rakeback_percentage vs rakeback_percent in 13 code locations"
  - "9 tables exist in migrations but NOT in schema.ts (poker_week_periods + 8 SU tables)"
  - "2 fields missing from pokerSettlements: week_period_id and rakeback_percent_used"
  - "RLS policies are correctly configured in all migrations"
  - "Tables poker_player_detailed, poker_demonstrativo, poker_agent_rakeback do NOT exist"

patterns-established:
  - "Schema/migration alignment audit methodology"
  - "RLS policy verification checklist"
  - "Field name mismatch detection via grep"

# Metrics
duration: ~45min
completed: 2026-01-22
---

# Phase 04 Plan 02: Schema & RLS Audit Summary

**Comprehensive audit revealing critical schema/code misalignment and confirming the rakeback field name bug that causes all rakeback calculations to return 0**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-01-22
- **Completed:** 2026-01-22
- **Tasks:** 4
- **Files created:** 2 (04-02-SCHEMA-RLS-AUDIT.md, 04-02-SUMMARY.md)

## Accomplishments

- Audited all poker tables in schema.ts vs SQL migrations
- Confirmed and documented the rakeback_percentage vs rakeback_percent bug
- Identified 9 tables missing from schema.ts
- Identified 2 fields missing from pokerSettlements
- Verified RLS policies are correctly configured for all 17 poker tables
- Created detailed fix instructions with exact line numbers

## Key Findings

### 1. Schema/Migrations Alignment

| Category | Count | Status |
|----------|-------|--------|
| Tables aligned | 9 | OK |
| Tables missing from schema.ts | 9 | CRITICAL |
| Fields missing from tables | 2 | HIGH |
| Tables that don't exist | 3 | Clarified (never created) |

### 2. Rakeback Field Name Bug (CRITICAL)

**Schema defines:** `rakeback_percent`
**Code queries:** `rakeback_percentage`

**Affected files:**
- `apps/api/src/trpc/routers/poker/settlements.ts` - 7 locations
- `apps/api/src/trpc/routers/poker/week-periods.ts` - 6 locations

**Impact:** Every settlement has `rakeback_amount = 0` because `player.rakeback_percentage` is always `undefined`.

### 3. Missing Tables from schema.ts

1. poker_week_periods (migration 0003)
2. poker_su_leagues (migration 0005)
3. poker_su_week_periods (migration 0005)
4. poker_su_imports (migration 0005)
5. poker_su_league_summary (migration 0005)
6. poker_su_games (migration 0005)
7. poker_su_game_players (migration 0005)
8. poker_su_settlements (migration 0005)

### 4. RLS Policies Status

| Status | Count |
|--------|-------|
| Properly configured | 17 |
| Missing | 0 |
| Incorrect | 0 |

All poker tables have correct RLS policies using `team_id IN (SELECT private.get_teams_for_authenticated_user())`.

## Decisions Made

1. **Bug is confirmed** - The rakeback_percentage vs rakeback_percent mismatch is real and affects production
2. **Fix is straightforward** - Simple find/replace in 2 files, 13 locations
3. **Missing tables are intentional omission** - SU tables were added to migrations but never to schema.ts
4. **RLS is secure** - No security gaps found in RLS configuration

## Deviations from Plan

1. **Tables poker_player_detailed, poker_demonstrativo, poker_agent_rakeback** - Plan mentioned auditing these tables but they don't exist in either migrations or schema. Clarified they were never implemented.

## Issues Encountered

None - all files accessible, analysis completed successfully.

## Recommendations (Prioritized)

| Priority | Recommendation | Effort | Impact |
|----------|----------------|--------|--------|
| P0 | Fix rakeback_percentage -> rakeback_percent | 30 min | Rakeback payments work |
| P0 | Add integration test for rakeback calculation | 2 hours | Prevent regression |
| P1 | Add missing fields to pokerSettlements | 45 min | Type safety |
| P1 | Add pokerWeekPeriods to schema.ts | 2 hours | Drizzle ORM access |
| P2 | Add all SU tables to schema.ts | 4-6 hours | Full type safety |

## Code Locations Requiring Fix

### settlements.ts
- Line 40: `.select(...rakeback_percentage...)` -> `rakeback_percent`
- Line 41: `.select(...rakeback_percentage...)` -> `rakeback_percent`
- Line 112: `settlement.player.rakeback_percentage` -> `rakeback_percent`
- Line 120: `settlement.agent.rakeback_percentage` -> `rakeback_percent`
- Line 400: `.select(...rakeback_percentage...)` -> `rakeback_percent`
- Line 425: `player.rakeback_percentage` -> `rakeback_percent`

### week-periods.ts
- Line 680: `rakeback_percentage,` -> `rakeback_percent,`
- Line 692: `player.rakeback_percentage` -> `rakeback_percent`
- Line 855: `rakeback_percentage,` -> `rakeback_percent,`
- Line 875: `player.rakeback_percentage` -> `rakeback_percent`
- Line 1007: `.select(...rakeback_percentage...)` -> `rakeback_percent`
- Line 1038: `player.rakeback_percentage` -> `rakeback_percent`

## Next Phase Readiness

- Schema/RLS audit complete with actionable recommendations
- Critical bug location confirmed and documented
- Ready for Phase 05 (Implementation) or immediate bug fix
- Findings directly impact settlement accuracy

### Dependencies for Next Plans

- Rakeback bug fix should be deployed BEFORE any production weekly closings
- Schema.ts updates can be done independently (lower priority)
- RLS is secure - no blocking issues for production use

---
*Phase: 04-verificacao-consistencia*
*Completed: 2026-01-22*
