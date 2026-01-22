# 04-01 Queries Audit: Database Access Patterns and Consistency

**Phase:** 04-verificacao-consistencia
**Plan:** 01
**Date:** 2026-01-22
**Status:** Complete

## Executive Summary

This audit analyzes database access patterns across all 7 poker routers, focusing on atomicity, consistency, and integrity of operations. Key findings:

1. **NO DATABASE TRANSACTIONS ARE USED** - None of the 7 poker routers use `db.transaction()` or any atomic transaction mechanism
2. **Critical multi-table operations execute as independent queries** - Partial failures leave inconsistent state
3. **Supabase client used directly** - All routers use `createAdminClient()` instead of Drizzle ORM transactions
4. **13+ tables affected by imports.process** - All writes are independent, no rollback capability
5. **7 steps in week-periods.close** - Each step can fail independently, leaving data inconsistent

### Risk Assessment

| Router | Procedures | Multi-table Ops | Has Transaction | Risk Level |
|--------|------------|-----------------|-----------------|------------|
| imports.ts | 6 | process (13 steps) | NO | **CRITICAL** |
| week-periods.ts | 7 | close (7 steps) | NO | **CRITICAL** |
| settlements.ts | 7 | closeWeek (2 steps) | NO | **HIGH** |
| players.ts | 10 | bulkCreate | NO | **MEDIUM** |
| sessions.ts | 5 | None | N/A | LOW |
| transactions.ts | 4 | None | N/A | LOW |
| analytics.ts | 10 | None (read-only) | N/A | LOW |

---

## 1. Database Access Patterns

### 1.1 Database Client Architecture

**File:** `packages/db/src/client.ts`

```typescript
// Client setup
const primaryDb = drizzle(primaryPool, { schema, casing: "snake_case" });

// Replica-aware connection
export const db = hasReplicas
  ? withReplicas(primaryDb, [...], (replicas) => replicas[replicaIndex])
  : createPrimaryOnlyDb(primaryDb);

// Transaction capability IS available via:
db.transaction(async (tx) => { ... })
```

**Key Findings:**
- Pool configuration: 3-12 connections, 30s timeout
- Transaction support available but NEVER USED in poker routers
- Read replicas configured for geographic distribution (fra, iad, sjc)
- Write operations go to primary automatically

### 1.2 Actual Usage in Poker Routers

All 7 poker routers use the same pattern:

```typescript
// Pattern used (NO TRANSACTION):
const supabase = await createAdminClient();
const { data, error } = await supabase.from("table").insert(...);
// Then another independent operation
const { error: error2 } = await supabase.from("table2").update(...);
```

**NEVER used:**
```typescript
// Available but not used:
db.transaction(async (tx) => {
  await tx.insert(table1).values(...);
  await tx.insert(table2).values(...);
  // All-or-nothing commit
});
```

---

## 2. Router-by-Router Analysis

### 2.1 imports.ts (CRITICAL)

**File:** `apps/api/src/trpc/routers/poker/imports.ts`
**Lines:** 1,668
**Procedures:** 6

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| get | SELECT | No | Low |
| getById | SELECT | No | Low |
| create | INSERT poker_imports | No | Low |
| validate | SELECT + UPDATE poker_imports | No | Low |
| process | **13 multi-table steps** | **YES** | **CRITICAL** |
| cancel | UPDATE | No | Low |
| delete | DELETE | No | Low |

#### imports.process - Detailed Analysis

**13 Steps - NO ATOMIC TRANSACTION:**

| Step | Table | Operation | Depends On | Failure Impact |
|------|-------|-----------|------------|----------------|
| 0 | poker_week_periods | UPSERT | None | Week period orphan |
| 1 | poker_players | UPSERT (players) | None | Partial player data |
| 2 | poker_players | UPSERT (agents) | Step 1 | Agent without players |
| 2.5 | poker_players | UPSERT (summary players) | Step 2 | Duplicate/missing |
| 2.6 | poker_players | UPSERT (session players) | Step 2.5 | Missing session refs |
| 3 | - | Build playerIdMap | Steps 1-2.6 | Incorrect mappings |
| 3.5 | poker_players | UPDATE (agent linking) | Step 3 | **N individual updates** |
| 4 | poker_chip_transactions | **INSERT (no upsert!)** | Step 3 | **DUPLICATES ON RE-IMPORT** |
| 5 | poker_sessions | UPSERT | Step 3 | Partial sessions |
| 6 | - | Build sessionIdMap | Step 5 | Incorrect mappings |
| 7 | poker_session_players | UPSERT | Steps 3,6 | Missing player-session links |
| 8 | poker_player_summary | UPSERT | Step 3 | Partial summaries |
| 9 | poker_player_detailed | UPSERT | Step 3 | Partial detailed data |
| 10 | poker_agent_rakeback | UPSERT | Step 3 | Partial rakeback |
| 11 | poker_demonstrativo | **INSERT (no upsert!)** | Step 3 | **DUPLICATES ON RE-IMPORT** |
| 12 | poker_players | UPDATE (activity metrics) | Steps 3-11 | **N individual updates** |

**Failure Scenarios:**

1. **Step 4 fails after Step 3.5 succeeds:**
   - Players are created and linked to agents
   - Transactions are NOT created
   - Re-running import creates duplicate player-agent links

2. **Step 8 fails after Step 7 succeeds:**
   - Sessions and session_players exist
   - Summaries are NOT created
   - Dashboard shows sessions but no player totals

3. **Step 12 fails after Step 11 succeeds:**
   - All data imported
   - Activity metrics NOT updated
   - Players show stale activity data

**Tables Affected (10):**
- poker_week_periods
- poker_players (modified 4 times!)
- poker_chip_transactions
- poker_sessions
- poker_session_players
- poker_player_summary
- poker_player_detailed
- poker_agent_rakeback
- poker_demonstrativo
- poker_imports (status update at end)

---

### 2.2 week-periods.ts (CRITICAL)

**File:** `apps/api/src/trpc/routers/poker/week-periods.ts`
**Lines:** 1,194
**Procedures:** 7

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| getCurrent | SELECT/INSERT | No | Low |
| getAll | SELECT | No | Low |
| getOpenPeriods | SELECT | No | Low |
| getById | SELECT | No | Low |
| getCloseWeekData | SELECT (multiple) | No (read-only) | Low |
| previewClose | SELECT (multiple) | No (read-only) | Low |
| close | **7 multi-table steps** | **YES** | **CRITICAL** |

#### week-periods.close - Detailed Analysis

**7 Steps - NO ATOMIC TRANSACTION:**

| Step | Table | Operation | Depends On | Failure Impact |
|------|-------|-----------|------------|----------------|
| 1 | poker_week_periods | SELECT/INSERT | None | Period creation issues |
| 2 | poker_players | SELECT (non-zero balance) | Step 1 | Wrong player list |
| 3 | poker_settlements | **INSERT** | Step 2 | **Settlements created** |
| 4 | poker_players | **UPDATE** (reset balances) | Step 3 | **Balances NOT reset** |
| 5 | poker_sessions | SELECT (stats) | Step 1 | Wrong stats |
| 6 | poker_week_periods | **UPDATE** (closed) | Steps 3-5 | **Period NOT closed** |
| 7 | poker_imports | UPDATE (committed) | Step 6 | Imports NOT committed |

**Critical Failure Scenarios:**

1. **Step 4 fails after Step 3 succeeds:**
   - Settlements are CREATED in database
   - Player chip_balances are NOT reset to 0
   - **Effect:** Re-running creates DUPLICATE settlements
   - **Data corruption:** Players have double settlements for same balance

2. **Step 6 fails after Step 4 succeeds:**
   - Settlements created, balances reset
   - Week period NOT marked as closed
   - **Effect:** Period appears "open", can be closed again
   - **Data corruption:** Potential for second closure attempt

3. **Step 7 fails after Step 6 succeeds:**
   - Everything done except imports NOT marked committed
   - **Effect:** Historical data shows imports as draft
   - **Less critical** but causes data visibility issues

**Tables Affected (4):**
- poker_week_periods
- poker_players (chip_balance reset)
- poker_settlements
- poker_imports

---

### 2.3 settlements.ts (HIGH)

**File:** `apps/api/src/trpc/routers/poker/settlements.ts`
**Lines:** 484
**Procedures:** 7

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| get | SELECT | No | Low |
| getById | SELECT | No | Low |
| create | INSERT | No | **MEDIUM** (no validation) |
| updateStatus | UPDATE | No | **MEDIUM** (no validation) |
| markPaid | UPDATE | No | **MEDIUM** (accepts any value) |
| delete | DELETE | No | **HIGH** (no soft delete) |
| closeWeek | **2 multi-table steps** | **YES** | **HIGH** |
| getStats | SELECT | No | Low |

#### settlements.closeWeek - Analysis

```typescript
// Step 1: Insert settlements (can succeed)
const { data: createdSettlements, error: insertError } = await supabase
  .from("poker_settlements")
  .insert(settlements);

// Step 2: Reset balances (can fail after Step 1)
const { error: updateError } = await supabase
  .from("poker_players")
  .update({ chip_balance: 0 })
  .in("id", playerIds);
```

**Same failure pattern as week-periods.close but simpler (2 steps).**

---

### 2.4 players.ts (MEDIUM)

**File:** `apps/api/src/trpc/routers/poker/players.ts`
**Lines:** 1,179
**Procedures:** 10

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| get | SELECT (multiple tables) | No | Low |
| getById | SELECT (multiple tables) | No | Low |
| upsert | INSERT/UPDATE | No | Low |
| delete | DELETE | No | **MEDIUM** (cascade?) |
| updateStatus | UPDATE | No | Low |
| updateRakeback | UPDATE | No | Low |
| getAgents | SELECT | No | Low |
| getPlayersByAgent | SELECT | No | Low |
| getStats | SELECT | No | Low |
| getAgentStats | SELECT | No | Low |
| checkExistingByPpPokerIds | SELECT | No | Low |
| bulkCreate | INSERT (batch) | No | **MEDIUM** |

**bulkCreate Analysis:**
```typescript
// Inserts in batches of 100
for (let i = 0; i < playersToInsert.length; i += batchSize) {
  const batch = playersToInsert.slice(i, i + batchSize);
  const { data, error } = await supabase
    .from("poker_players")
    .insert(batch);
  // If batch fails, tries individual inserts
}
```

**Risk:** Partial batch failure leaves some players created, others not. No rollback of successful batches.

---

### 2.5 sessions.ts (LOW)

**File:** `apps/api/src/trpc/routers/poker/sessions.ts`
**Lines:** 662
**Procedures:** 5

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| get | SELECT | No | Low |
| getById | SELECT | No | Low |
| upsert | INSERT/UPDATE | No | Low |
| delete | DELETE | No | Low |
| getStats | SELECT | No | Low |
| getByPlayer | SELECT | No | Low |

**No critical multi-table operations.**

---

### 2.6 transactions.ts (LOW)

**File:** `apps/api/src/trpc/routers/poker/transactions.ts`
**Lines:** 412
**Procedures:** 4

| Procedure | Operations | Multi-table | Risk |
|-----------|------------|-------------|------|
| get | SELECT | No | Low |
| getById | SELECT | No | Low |
| getStats | SELECT | No | Low |
| delete | DELETE | No | **MEDIUM** (no balance update!) |

**Critical Finding from Phase 03-03:**
```typescript
// transactions.delete does NOT update player chip_balance
const { error } = await supabase
  .from("poker_chip_transactions")
  .delete()
  .eq("id", input.id);
// chip_balance remains unchanged!
```

---

### 2.7 analytics.ts (LOW)

**File:** `apps/api/src/trpc/routers/poker/analytics.ts`
**Lines:** 1,067
**Procedures:** 10

All procedures are **read-only** (SELECT queries). No write operations, no transaction concerns.

---

## 3. Verification Queries

These SQL queries can be used to detect data inconsistencies caused by partial failures.

### 3.1 Detect Duplicate Transactions (from imports.process Step 4)

```sql
-- Verify duplicate transactions from re-imports
-- Should return 0 rows if data is consistent
SELECT
  t.team_id,
  t.occurred_at,
  t.sender_player_id,
  t.recipient_player_id,
  t.amount,
  t.type,
  COUNT(*) as duplicate_count
FROM poker_chip_transactions t
GROUP BY t.team_id, t.occurred_at, t.sender_player_id,
         t.recipient_player_id, t.amount, t.type
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 3.2 Detect Duplicate Demonstrativo Records (from imports.process Step 11)

```sql
-- Verify duplicate demonstrativo records
-- Should return 0 rows if data is consistent
SELECT
  d.team_id,
  d.occurred_at,
  d.player_id,
  d.type,
  d.amount,
  COUNT(*) as duplicate_count
FROM poker_demonstrativo d
GROUP BY d.team_id, d.occurred_at, d.player_id, d.type, d.amount
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;
```

### 3.3 Detect Settlements Without Balance Reset (from week-periods.close)

```sql
-- Find settlements where player still has non-zero balance
-- Indicates Step 4 failed after Step 3 in week-periods.close
SELECT
  s.id as settlement_id,
  s.player_id,
  s.gross_amount as settlement_amount,
  p.chip_balance as current_balance,
  s.created_at as settlement_date
FROM poker_settlements s
JOIN poker_players p ON p.id = s.player_id
WHERE s.status = 'pending'
  AND p.chip_balance != 0
  AND s.gross_amount = p.chip_balance
ORDER BY s.created_at DESC;
```

### 3.4 Detect Duplicate Settlements (from week-periods.close re-run)

```sql
-- Find duplicate settlements for same player and period
-- Indicates week-periods.close was run multiple times
SELECT
  player_id,
  period_start,
  period_end,
  COUNT(*) as settlement_count,
  SUM(gross_amount) as total_gross
FROM poker_settlements
GROUP BY player_id, period_start, period_end
HAVING COUNT(*) > 1
ORDER BY settlement_count DESC;
```

### 3.5 Verify chip_balance vs Transactions Sum (from Phase 03-03)

```sql
-- Verify chip_balance matches transaction sum
-- NOTE: This will likely show mismatches because chip_balance is a snapshot
SELECT
  p.id as player_id,
  p.nickname,
  p.chip_balance as stored_balance,
  COALESCE(SUM(
    CASE
      WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                      'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
      THEN t.amount
      ELSE -t.amount
    END
  ), 0) as calculated_balance,
  p.chip_balance - COALESCE(SUM(
    CASE
      WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                      'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
      THEN t.amount
      ELSE -t.amount
    END
  ), 0) as difference
FROM poker_players p
LEFT JOIN poker_chip_transactions t ON (
  t.recipient_player_id = p.id OR t.sender_player_id = p.id
)
WHERE p.team_id = '{{TEAM_ID}}'
GROUP BY p.id, p.nickname, p.chip_balance
HAVING p.chip_balance != COALESCE(SUM(
  CASE
    WHEN t.type IN ('chip_in', 'credit_received', 'bonus',
                    'adjustment_positive', 'transfer_in', 'rake_refund', 'jackpot')
    THEN t.amount
    ELSE -t.amount
  END
), 0)
ORDER BY ABS(difference) DESC
LIMIT 20;
```

### 3.6 Verify Settlement Amount vs Rake (from Phase 03-02)

```sql
-- Verify settlement gross_amount vs period rake
-- Settlement should be based on rake, not chip_balance
SELECT
  s.id as settlement_id,
  s.player_id,
  s.week_period_id,
  s.gross_amount as settlement_gross,
  COALESCE(SUM(ps.rake_total), 0) as period_rake,
  s.gross_amount - COALESCE(SUM(ps.rake_total), 0) as difference
FROM poker_settlements s
LEFT JOIN poker_player_summary ps ON (
  ps.player_id = s.player_id
  AND ps.period_start >= s.period_start
  AND ps.period_end <= s.period_end
)
WHERE s.team_id = '{{TEAM_ID}}'
GROUP BY s.id, s.player_id, s.week_period_id, s.gross_amount
HAVING s.gross_amount != COALESCE(SUM(ps.rake_total), 0)
ORDER BY ABS(difference) DESC
LIMIT 20;
```

### 3.7 Detect Orphan Transactions (NULL player_id)

```sql
-- Find transactions with no associated player
-- Indicates referential integrity issue
SELECT
  t.id,
  t.occurred_at,
  t.sender_nickname,
  t.recipient_nickname,
  t.amount,
  t.type
FROM poker_chip_transactions t
WHERE t.team_id = '{{TEAM_ID}}'
  AND t.sender_player_id IS NULL
  AND t.recipient_player_id IS NULL
ORDER BY t.occurred_at DESC
LIMIT 50;
```

### 3.8 Detect Unclosed Week Periods with Settlements

```sql
-- Find week periods that have settlements but are not closed
-- Indicates week-periods.close Step 6 failed
SELECT
  wp.id,
  wp.week_start,
  wp.week_end,
  wp.status,
  COUNT(s.id) as settlement_count,
  SUM(s.gross_amount) as total_settlements
FROM poker_week_periods wp
JOIN poker_settlements s ON s.week_period_id = wp.id
WHERE wp.team_id = '{{TEAM_ID}}'
  AND wp.status = 'open'
GROUP BY wp.id, wp.week_start, wp.week_end, wp.status
HAVING COUNT(s.id) > 0;
```

### 3.9 Detect Players Without Summary (Active Players)

```sql
-- Find players with sessions but no summary
-- Indicates imports.process Step 8 failed
SELECT
  p.id,
  p.nickname,
  p.pppoker_id,
  COUNT(sp.id) as session_count
FROM poker_players p
JOIN poker_session_players sp ON sp.player_id = p.id
LEFT JOIN poker_player_summary ps ON ps.player_id = p.id
WHERE p.team_id = '{{TEAM_ID}}'
  AND ps.id IS NULL
GROUP BY p.id, p.nickname, p.pppoker_id
HAVING COUNT(sp.id) > 0
ORDER BY session_count DESC;
```

### 3.10 Full Consistency Check

```sql
-- Comprehensive consistency check
-- Returns summary of all potential issues
WITH duplicate_transactions AS (
  SELECT COUNT(*) as count FROM (
    SELECT 1 FROM poker_chip_transactions
    WHERE team_id = '{{TEAM_ID}}'
    GROUP BY occurred_at, sender_player_id, recipient_player_id, amount, type
    HAVING COUNT(*) > 1
  ) dt
),
duplicate_settlements AS (
  SELECT COUNT(*) as count FROM (
    SELECT 1 FROM poker_settlements
    WHERE team_id = '{{TEAM_ID}}'
    GROUP BY player_id, period_start, period_end
    HAVING COUNT(*) > 1
  ) ds
),
orphan_transactions AS (
  SELECT COUNT(*) as count FROM poker_chip_transactions
  WHERE team_id = '{{TEAM_ID}}'
    AND sender_player_id IS NULL
    AND recipient_player_id IS NULL
),
unclosed_with_settlements AS (
  SELECT COUNT(DISTINCT wp.id) as count
  FROM poker_week_periods wp
  JOIN poker_settlements s ON s.week_period_id = wp.id
  WHERE wp.team_id = '{{TEAM_ID}}'
    AND wp.status = 'open'
)
SELECT
  'Duplicate Transactions' as check_type,
  (SELECT count FROM duplicate_transactions) as issue_count
UNION ALL
SELECT
  'Duplicate Settlements' as check_type,
  (SELECT count FROM duplicate_settlements) as issue_count
UNION ALL
SELECT
  'Orphan Transactions' as check_type,
  (SELECT count FROM orphan_transactions) as issue_count
UNION ALL
SELECT
  'Unclosed Periods with Settlements' as check_type,
  (SELECT count FROM unclosed_with_settlements) as issue_count;
```

---

## 4. Gaps Summary

### 4.1 Critical Gaps (5)

| ID | Gap | Router | Impact | Effort |
|----|-----|--------|--------|--------|
| C1 | No atomic transaction in imports.process | imports.ts | Partial data on failure, duplicates on re-import | 8-16h |
| C2 | No atomic transaction in week-periods.close | week-periods.ts | Duplicate settlements, inconsistent balances | 8-16h |
| C3 | INSERT without upsert for transactions | imports.ts | Duplicates created on re-import | 4-6h |
| C4 | INSERT without upsert for demonstrativo | imports.ts | Duplicates created on re-import | 2-4h |
| C5 | No status validation in settlements | settlements.ts | Any state transition allowed | 2-4h |

### 4.2 High Gaps (4)

| ID | Gap | Router | Impact | Effort |
|----|-----|--------|--------|--------|
| H1 | N individual UPDATE queries for player linking | imports.ts | Performance, partial failure | 4-6h |
| H2 | N individual UPDATE queries for activity metrics | imports.ts | Performance, partial failure | 4-6h |
| H3 | Delete transaction does not update balance | transactions.ts | Stale chip_balance | 2-4h |
| H4 | Delete settlement allows completed status | settlements.ts | Financial data loss | 1-2h |

### 4.3 Medium Gaps (3)

| ID | Gap | Router | Impact | Effort |
|----|-----|--------|--------|--------|
| M1 | No validation of netAmount in create | settlements.ts | Incorrect calculations accepted | 2-4h |
| M2 | markPaid accepts any value | settlements.ts | Overpayment possible | 1-2h |
| M3 | No soft delete for settlements | settlements.ts | Audit trail lost | 4-6h |

### 4.4 Low Gaps (2)

| ID | Gap | Router | Impact | Effort |
|----|-----|--------|--------|--------|
| L1 | console.log in production code | multiple | Log noise | 1h |
| L2 | No pagination in getStats (transactions) | transactions.ts | Memory issues | 2h |

---

## 5. Recommendations

### 5.1 Immediate Priority (P0)

#### R1: Implement Atomic Transaction for imports.process

**Current State:**
```typescript
// 13 independent operations
await supabase.from("poker_week_periods").upsert(...);
await supabase.from("poker_players").upsert(...);
await supabase.from("poker_chip_transactions").insert(...);
// ... continues without transaction
```

**Recommended Pattern:**
```typescript
// Option 1: Supabase RPC with PostgreSQL function
const { data, error } = await supabase.rpc('process_import', {
  p_team_id: teamId,
  p_import_id: importId,
  p_raw_data: rawData
});

// Option 2: Drizzle ORM transaction
await db.transaction(async (tx) => {
  await tx.insert(pokerWeekPeriods).values(...);
  await tx.insert(pokerPlayers).values(...);
  await tx.insert(pokerChipTransactions).values(...);
  // All-or-nothing commit
});
```

**Estimated Effort:** 8-16 hours
**Files to Modify:** imports.ts, packages/db (new RPC function)

#### R2: Implement Atomic Transaction for week-periods.close

**Current State:**
```typescript
// Insert settlements
await supabase.from("poker_settlements").insert(settlements);
// Reset balances (can fail independently)
await supabase.from("poker_players").update({ chip_balance: 0 });
// Update week period (can fail independently)
await supabase.from("poker_week_periods").update({ status: "closed" });
```

**Recommended Pattern:**
```typescript
// Supabase RPC
const { data, error } = await supabase.rpc('close_week_period', {
  p_team_id: teamId,
  p_week_period_id: weekPeriodId,
  p_user_id: userId,
  p_settlements: settlementsArray
});
```

**Estimated Effort:** 8-16 hours
**Files to Modify:** week-periods.ts, settlements.ts, packages/db

### 5.2 Short-term Priority (P1)

#### R3: Convert INSERT to UPSERT for transactions

```typescript
// Current (creates duplicates)
await supabase.from("poker_chip_transactions").insert(batch);

// Recommended
await supabase.from("poker_chip_transactions")
  .upsert(batch, {
    onConflict: "team_id,occurred_at,sender_player_id,recipient_player_id,amount"
  });
```

**Note:** Requires adding unique constraint to table.

**Estimated Effort:** 4-6 hours

#### R4: Convert INSERT to UPSERT for demonstrativo

Similar pattern to R3.

**Estimated Effort:** 2-4 hours

#### R5: Add delete transaction balance update

```typescript
// Before delete, get transaction details
const { data: tx } = await supabase
  .from("poker_chip_transactions")
  .select("*")
  .eq("id", input.id)
  .single();

// Update player balance
await supabase
  .from("poker_players")
  .update({
    chip_balance: sql`chip_balance - ${tx.amount}`
  })
  .eq("id", tx.recipient_player_id);

// Then delete
await supabase.from("poker_chip_transactions").delete().eq("id", input.id);
```

**Estimated Effort:** 2-4 hours

### 5.3 Medium-term Priority (P2)

#### R6: Add status transition validation

```typescript
const VALID_TRANSITIONS: Record<string, string[]> = {
  'pending': ['completed', 'cancelled'],
  'completed': [], // No transitions from completed
  'cancelled': [], // No transitions from cancelled
};

// In updateStatus:
const current = await getSettlementById(id);
if (!VALID_TRANSITIONS[current.status]?.includes(newStatus)) {
  throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid status transition" });
}
```

**Estimated Effort:** 2-4 hours

#### R7: Batch player updates instead of N queries

```typescript
// Current (N queries)
for (const update of batch) {
  await supabase.from("poker_players").update(...).eq("pppoker_id", update.pppoker_id);
}

// Recommended (single query)
await supabase.from("poker_players")
  .upsert(
    batch.map(u => ({ pppoker_id: u.pppoker_id, agent_id: u.agent_id })),
    { onConflict: "pppoker_id,team_id" }
  );
```

**Estimated Effort:** 4-6 hours

### 5.4 Long-term Priority (P3)

#### R8: Add database consistency check job

Create a scheduled job that runs daily/weekly to detect data inconsistencies:

```typescript
// packages/jobs/src/tasks/poker/consistency-check.ts
export const pokerConsistencyCheck = trigger.task({
  id: "poker-consistency-check",
  cron: "0 6 * * 1", // Monday 6am
  run: async () => {
    const issues = await runConsistencyQueries();
    if (issues.length > 0) {
      await notifyTeamAdmins(issues);
    }
    return { checked: true, issuesFound: issues.length };
  }
});
```

**Estimated Effort:** 8-12 hours

---

## 6. Appendix

### 6.1 Atomic Transaction Example (PostgreSQL Function)

```sql
-- Example: close_week_period RPC function
CREATE OR REPLACE FUNCTION close_week_period(
  p_team_id UUID,
  p_week_period_id UUID,
  p_user_id UUID,
  p_settlements JSONB
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_settlement JSONB;
  v_settlements_created INT := 0;
  v_player_ids UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Verify week period is open
  IF NOT EXISTS (
    SELECT 1 FROM poker_week_periods
    WHERE id = p_week_period_id
      AND team_id = p_team_id
      AND status = 'open'
  ) THEN
    RAISE EXCEPTION 'Week period not found or already closed';
  END IF;

  -- Insert settlements
  FOR v_settlement IN SELECT * FROM jsonb_array_elements(p_settlements)
  LOOP
    INSERT INTO poker_settlements (
      team_id, week_period_id, player_id, gross_amount,
      rakeback_amount, net_amount, status, created_by_id
    ) VALUES (
      p_team_id,
      p_week_period_id,
      (v_settlement->>'player_id')::UUID,
      (v_settlement->>'gross_amount')::NUMERIC,
      (v_settlement->>'rakeback_amount')::NUMERIC,
      (v_settlement->>'net_amount')::NUMERIC,
      'pending',
      p_user_id
    );
    v_settlements_created := v_settlements_created + 1;
    v_player_ids := array_append(v_player_ids, (v_settlement->>'player_id')::UUID);
  END LOOP;

  -- Reset player balances
  UPDATE poker_players
  SET chip_balance = 0, updated_at = NOW()
  WHERE id = ANY(v_player_ids)
    AND team_id = p_team_id;

  -- Close week period
  UPDATE poker_week_periods
  SET status = 'closed',
      closed_at = NOW(),
      closed_by_id = p_user_id,
      total_settlements = v_settlements_created,
      updated_at = NOW()
  WHERE id = p_week_period_id
    AND team_id = p_team_id;

  -- Commit imports
  UPDATE poker_imports
  SET committed = TRUE,
      committed_at = NOW(),
      committed_by_id = p_user_id
  WHERE team_id = p_team_id
    AND status = 'completed'
    AND committed = FALSE;

  RETURN jsonb_build_object(
    'success', TRUE,
    'settlements_created', v_settlements_created,
    'week_period_id', p_week_period_id
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction automatically rolls back
    RAISE;
END;
$$;
```

### 6.2 Drizzle Transaction Pattern

```typescript
// packages/db/src/transactions/close-week.ts
import { db } from "../client";
import { pokerSettlements, pokerPlayers, pokerWeekPeriods, pokerImports } from "../schema";

export async function closeWeekPeriodAtomic(
  teamId: string,
  weekPeriodId: string,
  userId: string,
  settlements: Settlement[]
) {
  return await db.transaction(async (tx) => {
    // Insert settlements
    const created = await tx.insert(pokerSettlements).values(
      settlements.map(s => ({
        teamId,
        weekPeriodId,
        playerId: s.playerId,
        grossAmount: s.grossAmount,
        rakebackAmount: s.rakebackAmount,
        netAmount: s.netAmount,
        status: 'pending' as const,
        createdById: userId,
      }))
    ).returning({ id: pokerSettlements.id });

    // Reset balances
    await tx.update(pokerPlayers)
      .set({ chipBalance: 0, updatedAt: new Date() })
      .where(
        and(
          eq(pokerPlayers.teamId, teamId),
          inArray(pokerPlayers.id, settlements.map(s => s.playerId))
        )
      );

    // Close period
    await tx.update(pokerWeekPeriods)
      .set({
        status: 'closed',
        closedAt: new Date(),
        closedById: userId,
        totalSettlements: created.length
      })
      .where(
        and(
          eq(pokerWeekPeriods.id, weekPeriodId),
          eq(pokerWeekPeriods.teamId, teamId)
        )
      );

    // Commit imports
    await tx.update(pokerImports)
      .set({ committed: true, committedAt: new Date(), committedById: userId })
      .where(
        and(
          eq(pokerImports.teamId, teamId),
          eq(pokerImports.status, 'completed'),
          eq(pokerImports.committed, false)
        )
      );

    return {
      success: true,
      settlementsCreated: created.length,
      weekPeriodId
    };
  });
}
```

---

## 7. Combined Risk Assessment

From all audits (02-01, 02-02, 03-01, 03-02, 03-03, 04-01):

| Area | Source | Finding | Risk |
|------|--------|---------|------|
| Frontend Validation | 02-01 | 15 rules, some not implemented | HIGH |
| Backend Validation | 02-01 | Uses rawData:any, 2 checks only | **CRITICAL** |
| Import Processing | 02-02, 04-01 | No atomic transaction, 13 steps | **CRITICAL** |
| Week Close | 03-01, 04-01 | No atomic transaction, 7 steps | **CRITICAL** |
| Rake Calculations | 03-02 | Dashboard correct, settlements wrong | **CRITICAL** |
| Rakeback Payments | 03-02 | Field name mismatch = always 0 | **CRITICAL** |
| chip_balance Integrity | 03-03 | Snapshot, not calculated | **CRITICAL** |
| Transaction Processing | 03-03 | 2 of 12 types used | HIGH |
| Settlement Validation | 04-01 | No status transitions, accepts any value | HIGH |
| Delete Operations | 04-01 | No balance update, hard delete | HIGH |

**Total Critical Issues: 6**
**Total High Issues: 4**

---

*Generated: 2026-01-22*
*Phase: 04-verificacao-consistencia*
*Plan: 04-01*
