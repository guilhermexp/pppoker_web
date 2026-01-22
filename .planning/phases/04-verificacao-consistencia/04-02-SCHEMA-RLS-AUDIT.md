# Schema.ts vs Migrations & RLS Audit

## Executive Summary

This audit reveals significant alignment issues between the Drizzle schema.ts and SQL migrations, including:

1. **CRITICAL**: 9 tables exist in migrations but are missing from schema.ts
2. **CRITICAL**: Field name mismatch (`rakeback_percentage` vs `rakeback_percent`) causes rakeback to always be 0
3. **HIGH**: 2 fields missing from pokerSettlements table in schema.ts
4. **MEDIUM**: All SU (Super Union) tables lack Drizzle ORM definitions

RLS policies are properly configured in migrations for all poker tables, but the schema.ts only defines RLS for tables that exist in it.

---

## 1. Schema.ts vs Migrations Alignment

### 1.1 Tables Present in Both (Aligned)

| Table | schema.ts | migrations | Status |
|-------|-----------|------------|--------|
| poker_players | pokerPlayers | 0001 | ALIGNED |
| poker_sessions | pokerSessions | 0001 | ALIGNED |
| poker_session_players | pokerSessionPlayers | 0001 | ALIGNED |
| poker_chip_transactions | pokerChipTransactions | 0001 | ALIGNED |
| poker_player_summary | pokerPlayerSummary | 0001 | ALIGNED |
| poker_settlements | pokerSettlements | 0001 | PARTIAL (missing fields) |
| poker_imports | pokerImports | 0001 | ALIGNED |
| poker_alerts | pokerAlerts | 0001 | ALIGNED |
| poker_team_clubs | pokerTeamClubs | 0002 | ALIGNED |

### 1.2 Tables Missing from schema.ts (CRITICAL)

| Table | Migration | Description | Impact |
|-------|-----------|-------------|--------|
| poker_week_periods | 0003 | Week period management | No Drizzle ORM access |
| poker_su_leagues | 0005 | SU league registry | No Drizzle ORM access |
| poker_su_week_periods | 0005 | SU week periods | No Drizzle ORM access |
| poker_su_imports | 0005 | SU import tracking | No Drizzle ORM access |
| poker_su_league_summary | 0005 | SU league summary data | No Drizzle ORM access |
| poker_su_games | 0005 | SU game records | No Drizzle ORM access |
| poker_su_game_players | 0005 | SU player participation | No Drizzle ORM access |
| poker_su_settlements | 0005 | SU settlements | No Drizzle ORM access |

**Note**: Tables `poker_player_detailed`, `poker_demonstrativo`, and `poker_agent_rakeback` mentioned in the plan do NOT exist in either migrations or schema.ts. These may have been planned but never implemented.

### 1.3 Fields Missing from pokerSettlements (HIGH)

The `pokerSettlements` table in schema.ts is missing fields added by later migrations:

| Field | Migration | Type | Purpose |
|-------|-----------|------|---------|
| week_period_id | 0003 | UUID | Link to poker_week_periods |
| rakeback_percent_used | 0004 | NUMERIC(5,2) | Historical tracking of applied % |

**Current schema.ts pokerSettlements:**
```typescript
export const pokerSettlements = pgTable(
  "poker_settlements",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp("created_at", ...),
    updatedAt: timestamp("updated_at", ...),
    teamId: uuid("team_id").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    status: pokerSettlementStatusEnum().default("pending").notNull(),
    playerId: uuid("player_id"),
    agentId: uuid("agent_id"),
    grossAmount: numericCasted("gross_amount", ...),
    rakebackAmount: numericCasted("rakeback_amount", ...),
    commissionAmount: numericCasted("commission_amount", ...),
    adjustmentAmount: numericCasted("adjustment_amount", ...),
    netAmount: numericCasted("net_amount", ...),
    paidAmount: numericCasted("paid_amount", ...),
    paidAt: timestamp("paid_at", ...),
    transactionId: uuid("transaction_id"),
    invoiceId: uuid("invoice_id"),
    createdById: uuid("created_by_id"),
    note: text("note"),
    // MISSING: weekPeriodId: uuid("week_period_id"),
    // MISSING: rakebackPercentUsed: numericCasted("rakeback_percent_used", ...),
  },
  ...
);
```

---

## 2. Field Name Mismatch Bug (CRITICAL)

### 2.1 The Problem

**Schema defines:** `rakeback_percent` (in poker_players table)
**Code queries:** `rakeback_percentage` (in settlements.ts and week-periods.ts)

This mismatch causes rakeback calculations to always return 0 because `player.rakeback_percentage` is undefined.

### 2.2 Schema Definition (CORRECT)

```typescript
// packages/db/src/schema.ts, line 3432
rakebackPercent: numericCasted("rakeback_percent", { precision: 5, scale: 2 }).default(0),
```

```sql
-- packages/db/migrations/0001_poker_club_management.sql, line 116
rakeback_percent NUMERIC(5,2) DEFAULT 0,
```

### 2.3 Incorrect Code References

**File: apps/api/src/trpc/routers/poker/settlements.ts**

| Line | Code | Issue |
|------|------|-------|
| 40 | `.select("id, nickname, memo_name, rakeback_percentage")` | Wrong field name |
| 41 | `.select("id, nickname, memo_name, rakeback_percentage")` | Wrong field name |
| 100 | `settlement.rakeback_percent_used` | Uses correct name (from DB) |
| 112 | `settlement.player.rakeback_percentage ?? 0` | Wrong field, always undefined |
| 120 | `settlement.agent.rakeback_percentage ?? 0` | Wrong field, always undefined |
| 400 | `.select("id, nickname, chip_balance, agent_id, rakeback_percentage")` | Wrong field name |
| 425 | `player.rakeback_percentage ?? 0` | Wrong field, always 0 |

**File: apps/api/src/trpc/routers/poker/week-periods.ts**

| Line | Code | Issue |
|------|------|-------|
| 680 | `rakeback_percentage,` | Wrong field name |
| 692 | `player.rakeback_percentage ?? 0` | Wrong field, always 0 |
| 855 | `rakeback_percentage,` | Wrong field name |
| 875 | `player.rakeback_percentage ?? 0` | Wrong field, always 0 |
| 1007 | `.select("id, nickname, chip_balance, agent_id, rakeback_percentage")` | Wrong field name |
| 1038 | `player.rakeback_percentage ?? 0` | Wrong field, always 0 |

**File: apps/api/src/trpc/routers/poker/players.ts**

This file uses the CORRECT field name throughout:
- Line 308: `player.rakeback_percent ?? 0` (CORRECT)
- Line 362: `.select("id, pppoker_id, nickname, memo_name, rakeback_percent")` (CORRECT)
- Line 512: `rakeback_percent: input.rakebackPercent ?? 0` (CORRECT)

### 2.4 Impact Analysis

**Consequence**: Every settlement created has `rakeback_amount = 0` because:

```typescript
// settlements.ts line 423-426
const rakebackAmount =
  grossAmount > 0
    ? (grossAmount * (player.rakeback_percentage ?? 0)) / 100  // undefined ?? 0 = 0
    : 0;
```

Since `player.rakeback_percentage` is always `undefined` (field doesn't exist), the formula becomes:
- `grossAmount * 0 / 100 = 0`

**Financial Impact**: Players/agents configured with rakeback percentages are NOT receiving their entitled rakeback payments.

### 2.5 Fix Required

Replace all occurrences of `rakeback_percentage` with `rakeback_percent` in:
1. `apps/api/src/trpc/routers/poker/settlements.ts` (7 locations)
2. `apps/api/src/trpc/routers/poker/week-periods.ts` (6 locations)

---

## 3. RLS Policies Audit

### 3.1 RLS Status by Table

| Table | RLS Enabled | Policy Type | Policy Condition | Status |
|-------|-------------|-------------|------------------|--------|
| poker_players | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_sessions | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_session_players | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_chip_transactions | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_player_summary | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_settlements | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_imports | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_alerts | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_team_clubs | YES | FOR ALL | liga_team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_week_periods | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_leagues | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_week_periods | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_imports | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_league_summary | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_games | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_game_players | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |
| poker_su_settlements | YES | FOR ALL | team_id IN (get_teams_for_authenticated_user()) | OK |

### 3.2 RLS Analysis

**Strengths:**
- All poker tables have RLS enabled
- Consistent policy pattern using `private.get_teams_for_authenticated_user()`
- Single "FOR ALL" policy covers SELECT, INSERT, UPDATE, DELETE
- team_id isolation ensures data privacy between teams

**Potential Concerns:**

1. **poker_session_players**: Has its own `team_id` column but access could theoretically be through session_id -> poker_sessions.team_id relationship. Current approach (direct team_id check) is simpler and safer.

2. **poker_su_game_players**: Similar pattern - direct team_id check is used, which is correct.

3. **Service Role Bypass**: The policies use `TO public` which means the service role (used by API) bypasses RLS. This is intentional for backend operations but requires careful API security.

### 3.3 RLS in schema.ts

The schema.ts file properly defines pgPolicy for tables that exist in it. Example:

```typescript
pgPolicy("Poker players can be managed by team members", {
  as: "permissive",
  for: "all",
  to: ["public"],
  using: sql`(team_id IN (SELECT private.get_teams_for_authenticated_user()))`,
}),
```

**Missing RLS in schema.ts**: Since the 9 tables from migrations 0003 and 0005 are not in schema.ts, their RLS policies are also not defined in Drizzle. However, the RLS IS active in the database from the SQL migrations.

---

## 4. Gaps Identified

### 4.1 Critical Priority (P0)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| G1 | Field name mismatch (rakeback_percentage vs rakeback_percent) | Rakeback always 0 | 30 min |
| G2 | 9 tables missing from schema.ts | No type safety for SU/week period operations | 4-8 hours |

### 4.2 High Priority (P1)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| G3 | Missing week_period_id in pokerSettlements schema | Can't use Drizzle for week period joins | 30 min |
| G4 | Missing rakeback_percent_used in pokerSettlements schema | No type safety for historical tracking | 15 min |

### 4.3 Medium Priority (P2)

| ID | Gap | Impact | Effort |
|----|-----|--------|--------|
| G5 | No relations defined for missing tables | Can't use Drizzle relations API | 2-4 hours |

---

## 5. Bug Resolution: rakeback_percentage vs rakeback_percent

### 5.1 Root Cause

The field was correctly defined as `rakeback_percent` in:
- SQL migration (0001_poker_club_management.sql, line 116)
- Drizzle schema (schema.ts, line 3432)

But incorrectly referenced as `rakeback_percentage` in:
- settlements.ts (7 locations)
- week-periods.ts (6 locations)

This is likely a typo introduced during development that was never caught because:
1. TypeScript doesn't validate Supabase query strings
2. No integration tests exist for settlement calculations
3. The `?? 0` fallback masks the undefined field silently

### 5.2 Fix Locations

**settlements.ts changes:**
```typescript
// Line 40, 41: Change select statements
- player:poker_players!poker_settlements_player_id_fkey(id, nickname, memo_name, rakeback_percentage)
+ player:poker_players!poker_settlements_player_id_fkey(id, nickname, memo_name, rakeback_percent)

// Line 112, 120: Change property access
- rakebackPercent: settlement.player.rakeback_percentage ?? 0
+ rakebackPercent: settlement.player.rakeback_percent ?? 0

// Line 400: Change select statement
- .select("id, nickname, chip_balance, agent_id, rakeback_percentage")
+ .select("id, nickname, chip_balance, agent_id, rakeback_percent")

// Line 425: Change property access
- ? (grossAmount * (player.rakeback_percentage ?? 0)) / 100
+ ? (grossAmount * (player.rakeback_percent ?? 0)) / 100
```

**week-periods.ts changes:**
```typescript
// Line 680, 855: Change field name in select
- rakeback_percentage,
+ rakeback_percent,

// Line 692, 875, 1038: Change property access
- player.rakeback_percentage ?? 0
+ player.rakeback_percent ?? 0

// Line 1007: Change select statement
- .select("id, nickname, chip_balance, agent_id, rakeback_percentage")
+ .select("id, nickname, chip_balance, agent_id, rakeback_percent")
```

### 5.3 Verification After Fix

After applying the fix, verify with this query:

```sql
-- Check if agents have rakeback_percent configured
SELECT
  id,
  nickname,
  type,
  rakeback_percent
FROM poker_players
WHERE type = 'agent'
  AND rakeback_percent > 0
LIMIT 10;
```

Then create a test settlement and verify `rakeback_amount > 0` for players with agents that have `rakeback_percent > 0`.

---

## 6. Recommendations

### 6.1 Immediate Actions (This Sprint)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P0 | Fix rakeback_percentage -> rakeback_percent in settlements.ts | Backend | 30 min |
| P0 | Fix rakeback_percentage -> rakeback_percent in week-periods.ts | Backend | 30 min |
| P0 | Add integration test for rakeback calculation | Backend | 2 hours |

### 6.2 Short-term Actions (Next Sprint)

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P1 | Add weekPeriodId to pokerSettlements schema | Backend | 30 min |
| P1 | Add rakebackPercentUsed to pokerSettlements schema | Backend | 15 min |
| P1 | Add pokerWeekPeriods table to schema.ts | Backend | 2 hours |
| P2 | Add all SU tables to schema.ts | Backend | 4-6 hours |

### 6.3 Backlog Actions

| Priority | Action | Owner | Effort |
|----------|--------|-------|--------|
| P3 | Add Drizzle relations for new tables | Backend | 2-4 hours |
| P3 | Add type generation for all tables | Backend | 1 hour |
| P3 | Create automated schema sync check in CI | DevOps | 4 hours |

---

## 7. Appendix

### A. SQL to Verify Field Name in Database

```sql
-- Check column name in poker_players
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'poker_players'
  AND column_name LIKE '%rakeback%';

-- Expected result:
-- column_name      | data_type | column_default
-- -----------------+-----------+---------------
-- rakeback_percent | numeric   | 0
```

### B. Missing schema.ts Table Definitions

The following tables need to be added to schema.ts to restore full Drizzle ORM functionality:

1. `pokerWeekPeriods` - Week period tracking
2. `pokerSuLeagues` - SU league registry
3. `pokerSuWeekPeriods` - SU week periods
4. `pokerSuImports` - SU import tracking
5. `pokerSuLeagueSummary` - SU league summaries
6. `pokerSuGames` - SU game records
7. `pokerSuGamePlayers` - SU player participation
8. `pokerSuSettlements` - SU settlements

### C. RLS Function Reference

The `private.get_teams_for_authenticated_user()` function returns all team IDs the current authenticated user has access to. This is a Supabase-specific function that:

1. Gets the current user's ID from `auth.uid()`
2. Looks up their team memberships in `users_on_team`
3. Returns an array of team UUIDs

This ensures users can only access data for teams they belong to.

---

*Audit completed: 2026-01-22*
*Phase: 04-verificacao-consistencia*
*Plan: 02 - Schema/RLS Audit*
