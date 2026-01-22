# 03-03 Transactions Audit: chip_balance and Transaction System Analysis

**Phase:** 03-auditoria-fechamento-semanal
**Plan:** 03
**Date:** 2026-01-22
**Status:** Complete

---

## 1. Executive Summary

### System Overview

The transaction system in Mid Poker manages all chip movements between players, agents, and the club. Transactions are imported from PPPoker spreadsheets and stored in `poker_chip_transactions`. The `chip_balance` field on `poker_players` represents the cumulative result of all chip movements for a player.

### Key Findings

| Area | Status | Risk Level |
|------|--------|------------|
| Transaction Types (Schema) | 12 types defined | OK |
| Transaction Types (Zod Schema) | Matches database enum | OK |
| chip_balance Storage | Stored, not calculated | MEDIUM |
| chip_balance Updates | Via import and closeWeek | HIGH |
| Import Transaction Processing | Simplistic type assignment | HIGH |
| Transaction-Balance Consistency | No verification mechanism | CRITICAL |
| Settlement Integration | Uses chip_balance incorrectly | CRITICAL |

### Critical Issues Identified

1. **chip_balance is stored, not calculated** - No database trigger or runtime calculation ensures consistency with transactions
2. **Simplistic transaction type assignment** - Import assigns type based on single field (`credit_given` if `creditSent`, else `transfer_in`)
3. **No transaction-balance consistency check** - No mechanism to verify `chip_balance = SUM(transactions)`
4. **chip_balance comes from spreadsheet** - Directly imported from PPPoker "Detalhes do usuario" sheet, not derived from transactions
5. **Delete transaction without balance update** - Deleting a transaction does NOT update chip_balance
6. **Combined with 03-01/03-02 findings** - Settlement uses chip_balance instead of rake (fundamentally wrong)

---

## 2. Transaction Types Analysis

### 2.1 Database Enum (Schema)

**Source:** `packages/db/src/schema.ts` lines 3317-3330

```typescript
export const pokerTransactionTypeEnum = pgEnum("poker_transaction_type", [
  "buy_in",
  "cash_out",
  "credit_given",
  "credit_received",
  "credit_paid",
  "rake",
  "agent_commission",
  "rakeback",
  "jackpot",
  "adjustment",
  "transfer_in",
  "transfer_out",
]);
```

### 2.2 Zod Schema (API Validation)

**Source:** `apps/api/src/schemas/poker/transactions.ts` lines 7-20

```typescript
export const pokerTransactionTypeSchema = z.enum([
  "buy_in",
  "cash_out",
  "credit_given",
  "credit_received",
  "credit_paid",
  "rake",
  "agent_commission",
  "rakeback",
  "jackpot",
  "adjustment",
  "transfer_in",
  "transfer_out",
]);
```

**Status:** MATCH - Zod schema matches database enum exactly.

### 2.3 Transaction Type Impact on Balance

| Type | Expected Impact | Direction | Origin | Description |
|------|----------------|-----------|--------|-------------|
| `buy_in` | + | Inbound | Session | Player buys chips to enter game |
| `cash_out` | - | Outbound | Session | Player cashes out chips from game |
| `credit_given` | + | Inbound | Manual/Import | Credit extended to player |
| `credit_received` | - | Outbound | Manual/Import | Credit received back from player |
| `credit_paid` | - | Outbound | Manual | Player pays off credit |
| `rake` | - | Outbound | Session | Rake fee extracted from play |
| `agent_commission` | + | Inbound | Settlement | Commission paid to agent |
| `rakeback` | + | Inbound | Settlement | Rakeback paid to agent/player |
| `jackpot` | +/- | Both | Session | Jackpot contribution (-) or win (+) |
| `adjustment` | +/- | Both | Manual | Manual adjustment |
| `transfer_in` | + | Inbound | Manual/Import | Chips transferred in |
| `transfer_out` | - | Outbound | Manual/Import | Chips transferred out |

### 2.4 Types vs PPPoker Spreadsheet Expected Types

**Expected from CLAUDE.md:**
```
1. chip_in - Entrada de fichas (+)
2. chip_out - Saida de fichas (-)
3. credit_sent - Credito enviado (-)
4. credit_received - Credito recebido (+)
5. bonus - Bonus (+)
6. adjustment_positive - Ajuste positivo (+)
7. adjustment_negative - Ajuste negativo (-)
8. transfer_in - Transferencia entrada (+)
9. transfer_out - Transferencia saida (-)
10. rake_refund - Devolucao de rake (+)
11. jackpot - Jackpot (+)
12. other - Outros
```

**Implemented vs Expected Mapping:**

| Expected | Implemented | Gap |
|----------|-------------|-----|
| chip_in | buy_in | Naming difference only |
| chip_out | cash_out | Naming difference only |
| credit_sent | credit_given | Different semantics |
| credit_received | credit_received | MATCH |
| bonus | (missing) | **NOT IMPLEMENTED** |
| adjustment_positive | adjustment | Combined (no sign) |
| adjustment_negative | adjustment | Combined (no sign) |
| transfer_in | transfer_in | MATCH |
| transfer_out | transfer_out | MATCH |
| rake_refund | rakeback | Similar but different |
| jackpot | jackpot | MATCH |
| other | (missing) | **NOT IMPLEMENTED** |
| (extra) | credit_paid | Extra type |
| (extra) | rake | Extra type |
| (extra) | agent_commission | Extra type |

**Gap Analysis:**
- `bonus` type not implemented - bonuses may be miscategorized
- `other` type not implemented - unknown transactions have no category
- `adjustment` is unsigned - loses positive/negative distinction

---

## 3. chip_balance Analysis

### 3.1 Schema Definition

**Source:** `packages/db/src/schema.ts` line 3422

```typescript
chipBalance: numericCasted("chip_balance", { precision: 14, scale: 2 }).default(0),
```

**Location:** On `poker_players` table
**Type:** Numeric with 14 digits, 2 decimal places
**Default:** 0

### 3.2 How chip_balance is Set

#### Source 1: Import from Spreadsheet (Primary)

**File:** `apps/api/src/trpc/routers/poker/imports.ts` line 513

```typescript
// STEP 1: Batch upsert ALL players from "Detalhes do usuario"
const playersRaw = rawData.players
  .filter((player: any) => !preScannedAgents.has(player.ppPokerId))
  .map((player: any) => ({
    team_id: teamId,
    import_id: importId,
    pppoker_id: player.ppPokerId,
    nickname: player.nickname,
    // ...
    chip_balance: player.chipBalance ?? 0,  // <-- DIRECT FROM SPREADSHEET
    // ...
  }));
```

**Key Finding:** `chip_balance` is imported DIRECTLY from the PPPoker spreadsheet "Detalhes do usuario" sheet, NOT calculated from transactions.

#### Source 2: closeWeek Reset

**File:** `apps/api/src/trpc/routers/poker/settlements.ts` lines 460-467

```typescript
// Reset chip balances to zero for all players with settlements
const playerIds = players.map((p) => p.id);
const { error: updateError } = await supabase
  .from("poker_players")
  .update({
    chip_balance: 0,
    updated_at: new Date().toISOString(),
  })
  .in("id", playerIds)
  .eq("team_id", teamId);
```

**Key Finding:** `chip_balance` is reset to 0 after settlements are created. This is the ONLY code-initiated balance change.

### 3.3 How chip_balance SHOULD be Calculated

**Expected Formula:**
```
chip_balance = SUM(amount WHERE direction = 'inbound')
             - SUM(amount WHERE direction = 'outbound')

Or more specifically:
chip_balance = SUM(
  buy_in + credit_given + credit_received_back + agent_commission +
  rakeback + jackpot_wins + adjustment_positive + transfer_in
)
- SUM(
  cash_out + credit_paid + rake + jackpot_contrib +
  adjustment_negative + transfer_out
)
```

### 3.4 Data Flow Diagram

```
PPPoker Spreadsheet Export
        |
        +---> "Detalhes do usuario" sheet
        |          |
        |          +---> player.chipBalance (snapshot)
        |          |
        |          v
        |     poker_players.chip_balance (STORED)
        |
        +---> "Transacoes" sheet
               |
               v
          poker_chip_transactions
               |
               X (NO LINK TO chip_balance!)


CURRENT STATE: chip_balance is a SNAPSHOT from spreadsheet
               NOT derived from poker_chip_transactions

EXPECTED: chip_balance = SUM(poker_chip_transactions.amount)
```

### 3.5 Consistency Issues

#### Issue 1: No Database Trigger

There is no PostgreSQL trigger to maintain `chip_balance` when transactions are inserted/updated/deleted.

**Verified:** Searched migrations directory - no trigger definitions found.

#### Issue 2: No Runtime Calculation

The application does not recalculate `chip_balance` from transactions. It trusts the imported value.

#### Issue 3: Delete Transaction Without Balance Update

**File:** `apps/api/src/trpc/routers/poker/transactions.ts` lines 391-410

```typescript
delete: protectedProcedure
  .input(deletePokerTransactionSchema)
  .mutation(async ({ input, ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { error } = await supabase
      .from("poker_chip_transactions")
      .delete()
      .eq("id", input.id)
      .eq("team_id", teamId);
    // NO UPDATE TO chip_balance!

    return { success: true };
  }),
```

**Critical Gap:** Deleting a transaction does NOT update the player's `chip_balance`.

#### Issue 4: No Consistency Verification Query

There is no query or procedure to verify:
```sql
SELECT
  p.id,
  p.chip_balance AS stored,
  COALESCE(SUM(t.amount), 0) AS calculated
FROM poker_players p
LEFT JOIN poker_chip_transactions t
  ON t.sender_player_id = p.id OR t.recipient_player_id = p.id
WHERE p.team_id = $1
GROUP BY p.id
HAVING p.chip_balance != COALESCE(SUM(t.amount), 0)
```

---

## 4. Transaction Processing During Import

### 4.1 Transaction Type Assignment

**File:** `apps/api/src/trpc/routers/poker/imports.ts` lines 857-901

```typescript
// STEP 4: Batch insert transactions
if (rawData?.transactions?.length > 0) {
  const transactionsToInsert = rawData.transactions
    .map((tx: any) => {
      const occurredAt = parseTimestamp(tx.occurredAt);
      if (!occurredAt) return null;

      return {
        team_id: teamId,
        import_id: importId,
        occurred_at: occurredAt,
        type: tx.creditSent ? "credit_given" : "transfer_in",  // <-- SIMPLISTIC!
        // ...
        amount:
          (tx.creditSent ?? 0) +
          (tx.chipsSent ?? 0) -
          (tx.creditRedeemed ?? 0) -
          (tx.chipsRedeemed ?? 0),
      };
    })
    .filter(Boolean);
```

### 4.2 Type Assignment Issues

**Current Logic:**
```typescript
type: tx.creditSent ? "credit_given" : "transfer_in"
```

This is extremely simplistic:
- Only 2 types used from 12 available
- Ignores `cash_out`, `buy_in`, `rake`, `jackpot`, etc.
- All non-credit transactions become `transfer_in`

### 4.3 Amount Calculation

**Current Formula:**
```typescript
amount = creditSent + chipsSent - creditRedeemed - chipsRedeemed
```

**Analysis:**
- Positive amount = net outflow to player
- Negative amount = net inflow from player
- Does NOT consider transaction direction/perspective

### 4.4 Transaction Fields Stored

From schema, transactions store rich data:

| Field | Purpose | Usage in Import |
|-------|---------|-----------------|
| credit_sent | Credit given | Used |
| credit_redeemed | Credit paid back | Used |
| credit_left_club | Credit remaining | Used |
| chips_sent | Chips given | Used |
| chips_ppsr | PPSR chips | Used |
| chips_ring | Ring chips | Used |
| chips_custom_ring | Custom ring chips | Used |
| chips_mtt | MTT chips | Used |
| chips_redeemed | Chips taken back | Used |
| amount | Calculated total | Calculated |

---

## 5. Integration with Settlements

### 5.1 Current closeWeek Implementation

**File:** `apps/api/src/trpc/routers/poker/settlements.ts` lines 397-444

```typescript
// Get all players with non-zero chip balance
const { data: players } = await supabase
  .from("poker_players")
  .select("id, nickname, chip_balance, agent_id, rakeback_percentage")
  .eq("team_id", teamId)
  .eq("status", "active")
  .neq("chip_balance", 0);

// Create settlements for each player
const settlements = players.map((player) => {
  const grossAmount = player.chip_balance ?? 0;  // <-- Uses chip_balance!
  const rakebackAmount =
    grossAmount > 0
      ? (grossAmount * (player.rakeback_percentage ?? 0)) / 100
      : 0;
  const netAmount = grossAmount - rakebackAmount;
  // ...
});
```

### 5.2 Data Source Problem

**From 03-01 and 03-02 Audits:**

| What Settlement Should Use | What It Actually Uses |
|---------------------------|----------------------|
| Period rake from `poker_player_summary` | `chip_balance` from `poker_players` |
| `rake_total` (fee extracted) | `chip_balance` (net chip movements) |

**Business Logic Error:**
- `chip_balance` = What player owes/is owed (chips bought/sold)
- `rake` = Fee extracted from gameplay (club earnings)
- Settlement should be based on RAKE, not BALANCE

### 5.3 Combined Impact

```
IMPORT -> chip_balance (snapshot from spreadsheet)
       -> transactions (individual movements)

       NO LINK between chip_balance and transactions!

SETTLEMENT -> Uses chip_balance (wrong metric)
           -> Should use period rake

RISK: Double exposure
  - If chip_balance is wrong in spreadsheet, settlement is wrong
  - No way to verify chip_balance from transactions
  - Deleting transactions doesn't fix chip_balance
```

---

## 6. Gaps Identified

### 6.1 CRITICAL (4)

| ID | Gap | File | Impact |
|----|-----|------|--------|
| C1 | chip_balance not derived from transactions | imports.ts | Data integrity |
| C2 | No consistency verification mechanism | - | Silent data corruption |
| C3 | Delete transaction doesn't update balance | transactions.ts | Balance becomes stale |
| C4 | Settlement uses chip_balance not rake | settlements.ts | Wrong financial calculations |

### 6.2 HIGH (4)

| ID | Gap | File | Impact |
|----|-----|------|--------|
| H1 | Only 2 transaction types used from 12 | imports.ts | Loss of transaction classification |
| H2 | No database trigger for balance maintenance | migrations | Requires manual sync |
| H3 | Simplistic type assignment logic | imports.ts | Incorrect categorization |
| H4 | Amount calculation ignores perspective | imports.ts | Unclear direction |

### 6.3 MEDIUM (3)

| ID | Gap | File | Impact |
|----|-----|------|--------|
| M1 | Missing transaction types (bonus, other) | schema.ts | Cannot classify all transactions |
| M2 | Adjustment type unsigned | schema.ts | Loses positive/negative distinction |
| M3 | No transaction type validation in filter | transactions.ts | Query accepts any type |

### 6.4 LOW (2)

| ID | Gap | File | Impact |
|----|-----|------|--------|
| L1 | getStats loads all transactions | transactions.ts | Memory risk on large datasets |
| L2 | console.log statements in router | transactions.ts | Production logging noise |

---

## 7. Recommendations

### 7.1 Priority 0: Immediate Fixes

#### R1: Add Database Trigger for chip_balance (4-8 hours)

```sql
CREATE OR REPLACE FUNCTION update_player_chip_balance()
RETURNS TRIGGER AS $$
DECLARE
  v_player_id UUID;
  v_amount NUMERIC;
BEGIN
  -- Determine player and amount based on operation
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- For recipient, amount is positive (receiving)
    IF NEW.recipient_player_id IS NOT NULL THEN
      UPDATE poker_players
      SET chip_balance = chip_balance + NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.recipient_player_id;
    END IF;

    -- For sender, amount is negative (giving)
    IF NEW.sender_player_id IS NOT NULL THEN
      UPDATE poker_players
      SET chip_balance = chip_balance - NEW.amount,
          updated_at = NOW()
      WHERE id = NEW.sender_player_id;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    -- Reverse the transaction
    IF OLD.recipient_player_id IS NOT NULL THEN
      UPDATE poker_players
      SET chip_balance = chip_balance - OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.recipient_player_id;
    END IF;

    IF OLD.sender_player_id IS NOT NULL THEN
      UPDATE poker_players
      SET chip_balance = chip_balance + OLD.amount,
          updated_at = NOW()
      WHERE id = OLD.sender_player_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_chip_balance
AFTER INSERT OR UPDATE OR DELETE ON poker_chip_transactions
FOR EACH ROW EXECUTE FUNCTION update_player_chip_balance();
```

**Note:** This requires careful consideration of transaction semantics (who is sender vs recipient).

#### R2: Add Consistency Check Procedure (2-4 hours)

```typescript
// New procedure in transactions.ts
verifyBalances: protectedProcedure
  .query(async ({ ctx: { teamId } }) => {
    const supabase = await createAdminClient();

    const { data, error } = await supabase.rpc('check_balance_consistency', {
      p_team_id: teamId
    });

    return {
      inconsistencies: data ?? [],
      hasIssues: (data?.length ?? 0) > 0
    };
  }),
```

### 7.2 Priority 1: Import Improvements (6-12 hours)

#### R3: Improve Transaction Type Assignment

```typescript
function determineTransactionType(tx: any): PokerTransactionType {
  // Credit transactions
  if (tx.creditSent > 0 && tx.creditRedeemed === 0) return 'credit_given';
  if (tx.creditRedeemed > 0 && tx.creditSent === 0) return 'credit_paid';

  // Chip transactions
  if (tx.chipsSent > 0 && tx.chipsRedeemed === 0) return 'transfer_in';
  if (tx.chipsRedeemed > 0 && tx.chipsSent === 0) return 'cash_out';

  // Both - net transaction
  const netChips = (tx.chipsSent ?? 0) - (tx.chipsRedeemed ?? 0);
  const netCredit = (tx.creditSent ?? 0) - (tx.creditRedeemed ?? 0);

  if (netChips > 0 || netCredit > 0) return 'transfer_in';
  if (netChips < 0 || netCredit < 0) return 'transfer_out';

  return 'adjustment';
}
```

#### R4: Add Missing Transaction Types

```sql
ALTER TYPE poker_transaction_type ADD VALUE 'bonus';
ALTER TYPE poker_transaction_type ADD VALUE 'other';
ALTER TYPE poker_transaction_type ADD VALUE 'adjustment_positive';
ALTER TYPE poker_transaction_type ADD VALUE 'adjustment_negative';
```

### 7.3 Priority 2: Settlement Integration (8-16 hours)

See 03-01 and 03-02 recommendations:
- Use `poker_player_summary.rake_total` for settlement grossAmount
- Fix field name mismatch (`rakeback_percent` vs `rakeback_percentage`)
- Implement period-based aggregation

---

## 8. Verification Queries

### 8.1 Check Balance Consistency

```sql
-- Find players where stored balance doesn't match calculated
WITH calculated_balances AS (
  SELECT
    COALESCE(t.recipient_player_id, t.sender_player_id) AS player_id,
    SUM(
      CASE
        WHEN t.recipient_player_id = p.id THEN t.amount
        WHEN t.sender_player_id = p.id THEN -t.amount
        ELSE 0
      END
    ) AS calculated_balance
  FROM poker_chip_transactions t
  JOIN poker_players p ON p.id = t.recipient_player_id OR p.id = t.sender_player_id
  WHERE t.team_id = $1
  GROUP BY COALESCE(t.recipient_player_id, t.sender_player_id)
)
SELECT
  p.id,
  p.nickname,
  p.chip_balance AS stored,
  COALESCE(cb.calculated_balance, 0) AS calculated,
  p.chip_balance - COALESCE(cb.calculated_balance, 0) AS difference
FROM poker_players p
LEFT JOIN calculated_balances cb ON cb.player_id = p.id
WHERE p.team_id = $1
  AND p.chip_balance != COALESCE(cb.calculated_balance, 0);
```

### 8.2 Transaction Type Distribution

```sql
-- Count transactions by type
SELECT
  type,
  COUNT(*) AS count,
  SUM(amount) AS total_amount,
  AVG(amount) AS avg_amount
FROM poker_chip_transactions
WHERE team_id = $1
GROUP BY type
ORDER BY count DESC;
```

### 8.3 Players Without Transactions

```sql
-- Find players with balance but no transactions
SELECT
  p.id,
  p.nickname,
  p.chip_balance
FROM poker_players p
WHERE p.team_id = $1
  AND p.chip_balance != 0
  AND NOT EXISTS (
    SELECT 1 FROM poker_chip_transactions t
    WHERE t.sender_player_id = p.id OR t.recipient_player_id = p.id
  );
```

---

## 9. Risk Assessment Summary

### Combined with Prior Findings

| Phase | Plan | Critical Finding | Impact |
|-------|------|------------------|--------|
| 02-01 | Validation | Backend uses rawData:any | Invalid data imported |
| 02-02 | Processing | No atomic transaction | Partial failures |
| 03-01 | Settlements | No validation of calculations | Wrong payments |
| 03-02 | Rake | Settlement uses chip_balance not rake | Fundamentally wrong |
| 03-03 | Transactions | chip_balance not derived from transactions | Data integrity |

### Overall Risk Level: CRITICAL

**The entire import -> transaction -> balance -> settlement pipeline has fundamental issues:**

1. Import accepts invalid data (02-01)
2. Processing can fail partially (02-02)
3. chip_balance is a snapshot, not calculated (03-03)
4. Transactions use only 2 of 12 types (03-03)
5. Settlement uses chip_balance instead of rake (03-02)
6. Rakeback field name mismatch causes 0% rakeback (03-02)
7. No atomic transactions protect against partial failures (03-01)

**Recommendation:** Do NOT run production settlements until these issues are fixed.

---

## 10. Appendix

### A.1 Transaction Router Procedures

| Procedure | Lines | Purpose | Gaps |
|-----------|-------|---------|------|
| `get` | 36-213 | List transactions with filters | pageSize max=1000 |
| `getById` | 218-293 | Get single transaction | OK |
| `getStats` | 298-386 | Aggregated statistics | Loads all data |
| `delete` | 391-410 | Delete transaction | No balance update |

### A.2 Full Transaction Schema

**File:** `packages/db/src/schema.ts` lines 3636-3720

```typescript
export const pokerChipTransactions = pgTable(
  "poker_chip_transactions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    teamId: uuid("team_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    type: pokerTransactionTypeEnum().notNull(),
    senderClubId: text("sender_club_id"),
    senderPlayerId: uuid("sender_player_id"),
    recipientPlayerId: uuid("recipient_player_id"),
    creditSent: numericCasted("credit_sent", { precision: 14, scale: 2 }).default(0),
    creditRedeemed: numericCasted("credit_redeemed", { precision: 14, scale: 2 }).default(0),
    creditLeftClub: numericCasted("credit_left_club", { precision: 14, scale: 2 }).default(0),
    chipsSent: numericCasted("chips_sent", { precision: 14, scale: 2 }).default(0),
    chipsPpsr: numericCasted("chips_ppsr", { precision: 14, scale: 2 }).default(0),
    chipsRing: numericCasted("chips_ring", { precision: 14, scale: 2 }).default(0),
    chipsCustomRing: numericCasted("chips_custom_ring", { precision: 14, scale: 2 }).default(0),
    chipsMtt: numericCasted("chips_mtt", { precision: 14, scale: 2 }).default(0),
    chipsRedeemed: numericCasted("chips_redeemed", { precision: 14, scale: 2 }).default(0),
    amount: numericCasted("amount", { precision: 14, scale: 2 }).default(0),
    sessionId: uuid("session_id"),
    note: text("note"),
    rawData: jsonb("raw_data"),
  },
  // indexes and foreign keys...
);
```

### A.3 Related Audit Documents

- **03-01-SETTLEMENTS-AUDIT.md** - Settlement procedures analysis
- **03-02-RAKE-AUDIT.md** - Rake calculation and distribution

---

*Document generated: 2026-01-22*
*Author: Claude (AI Assistant)*
*Phase: 03-auditoria-fechamento-semanal*
*Plan: 03*
