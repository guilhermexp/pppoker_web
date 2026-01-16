# Codebase Concerns

**Analysis Date:** 2026-01-16

## Tech Debt

**Email Rendering Implementation:**
- Issue: Temporary react-dom/server implementation instead of proper react-email
- Files: `packages/email/render.ts`
- Why: "renderToPipeableStream is not defined error from react-email"
- Impact: Email rendering may not work as expected
- Fix approach: Upgrade react-email or implement proper streaming

**Disabled Validation Rules:**
- Issue: Consistency and math validation layers are empty
- Files: `apps/dashboard/src/lib/poker/validation.ts:748, 754`
- Why: Not yet implemented ("TODO: implementar corretamente")
- Impact: Missing validation on critical business logic
- Fix approach: Implement missing validation rules with tests

**SU Analytics Dashboard:**
- Issue: Entire dashboard stats stubbed with default values
- Files: `apps/api/src/trpc/routers/su/analytics.ts:17`
- Why: Backend not connected to actual database tables
- Impact: Dashboard shows fake data
- Fix approach: Connect to real `poker_su_*` tables

**League Import Backend:**
- Issue: No backend processing for league imports
- Files: `apps/dashboard/src/components/poker/league-import-uploader.tsx:2905`
- Why: Only frontend validation implemented
- Impact: Imports not persisted to database
- Fix approach: Create tRPC endpoint for league import processing

## Known Bugs

**Transaction Type Mismatch:**
- Symptoms: Type error on Supabase upsert
- Trigger: Transaction import job
- Files: `packages/jobs/src/tasks/transactions/import.ts:95`
- Workaround: `@ts-expect-error` suppressing type check
- Root cause: Drizzle types don't match Supabase types
- Fix: Align type definitions or add explicit type mapping

**Silent Error Failures:**
- Symptoms: Queries fail but return empty data instead of throwing
- Trigger: Supabase REST errors in transaction queries
- Files: `apps/api/src/trpc/routers/transactions.ts:82, 164, 203, 269, 311, 375`
- Workaround: Error logged to console, execution continues
- Root cause: Error handling pattern returns empty arrays
- Fix: Throw TRPCError instead of silent failures

## Security Considerations

**Hardcoded Secrets in Examples:**
- Risk: `.env-example` files contain actual secret values
- Files:
  - `apps/dashboard/.env-example:38` - `WEBHOOK_SECRET_KEY=6c369443-1a88-444e-b459-7e662c1fff9e`
  - `apps/dashboard/.env-example:51` - `INVOICE_JWT_SECRET=secret`
- Current mitigation: None (values in git history)
- Recommendations: Use placeholders like `WEBHOOK_SECRET_KEY=your-webhook-secret-here`

**Missing .env.example Files:**
- Risk: New developers don't know required environment variables
- Files: Root `.env` exists but no `.env.example`
- Current mitigation: Partial templates in apps/
- Recommendations: Create root `.env.example` with all variables

**Type Safety Bypasses:**
- Risk: 50 files using `@ts-expect-error` or `@ts-ignore`
- Files: Dashboard components, API routers, job tasks
- Current mitigation: Manual code review
- Recommendations: Audit each bypass and fix underlying type issues

## Performance Bottlenecks

**N+1 Query Pattern in Imports:**
- Problem: Iterates through summaries array in memory
- Files: `apps/api/src/trpc/routers/poker/imports.ts:70-97`
- Measurement: Multiple filter operations on same array
- Cause: Aggregations done in application code, not database
- Improvement: Move calculations to SQL aggregations

**Memory-Inefficient Transformations:**
- Problem: Maps every transaction to new object structure
- Files: `apps/api/src/trpc/routers/transactions.ts:94-114`
- Measurement: Full array transformation in memory
- Cause: No database projections used
- Improvement: Use SELECT projections in queries

**Large File Parsing Without Streaming:**
- Problem: Multiple passes over XLSX data
- Files: `apps/dashboard/src/components/poker/league-import-uploader.tsx`
- Measurement: 3,125 lines with nested loops
- Cause: No streaming or chunking
- Improvement: Implement streaming parser

## Fragile Areas

**Massive Invoice Router:**
- Files: `apps/api/src/trpc/routers/invoice.ts` (41,044 lines!)
- Why fragile: Monolithic file, difficult to navigate and test
- Common failures: Type errors, logic bugs due to size
- Safe modification: Extract to smaller domain routers
- Test coverage: None (0 tests)

**Complex League Import Logic:**
- Files: `apps/dashboard/src/components/poker/league-import-uploader.tsx` (3,125 lines)
- Why fragile: 90+ nested loops, minimal error handling
- Common failures: Parse errors on malformed files
- Safe modification: Add comprehensive try/catch blocks
- Test coverage: None (0 tests)

**Transaction Matching Algorithm:**
- Files: `packages/db/src/queries/transaction-matching.ts` (2,180 lines)
- Why fragile: Complex algorithm without documentation
- Common failures: False matches, missed matches
- Safe modification: Add algorithm documentation first
- Test coverage: 3 test files (integration, golden, unit)

## Test Coverage Gaps

**Critical Untested Code:**
- What's not tested: All 37+ tRPC routers
- Files: `apps/api/src/trpc/routers/*.ts`
- Risk: API changes break silently
- Priority: High
- Difficulty: Medium (requires test infrastructure setup)

**Invoice Generation:**
- What's not tested: 41K lines of invoice logic
- Files: `apps/api/src/trpc/routers/invoice.ts`
- Risk: Billing errors, customer disputes
- Priority: Critical
- Difficulty: High (complex business logic)

**Poker Import Logic:**
- What's not tested: League and session imports
- Files: `apps/dashboard/src/components/poker/league-import-uploader.tsx`
- Risk: Data corruption on import
- Priority: High
- Difficulty: Medium (needs sample files)

## Missing Critical Features

**Locale Support for Notifications:**
- Problem: Hardcoded "en-US" for currency formatting
- Files: `packages/jobs/src/utils/transaction-notifications.tsx:20`
- Current workaround: All notifications in English
- Blocks: Internationalization of notifications
- Implementation complexity: Low (use team/user locale)

**Inbox Account Cleanup:**
- Problem: Missing deregistration logic for deleted accounts
- Files: `packages/jobs/src/tasks/inbox/provider/sync-account.ts:49`
- Current workaround: Scheduled jobs keep running
- Blocks: Clean account deletion
- Implementation complexity: Low (add cleanup step)

## Duplicate Code Patterns

**Import Sheet Parsers:**
- Files:
  - `apps/dashboard/src/components/poker/import-uploader.tsx:19-97`
  - `apps/dashboard/src/components/poker/league-import-uploader.tsx:37-65`
- Issue: Nearly identical parsing logic repeated
- Impact: Bug fixes need multiple locations
- Fix: Extract shared parser utility

**Field Extraction Patterns:**
- Files: Multiple import files
- Issue: `row["Field"] || row["field"] || null` repeated 100+ times
- Impact: Maintenance burden
- Fix: Create field extraction helper

## Dependency Concerns

**Console Logging Instead of Logger:**
- Risk: Production errors logged to console, not monitoring system
- Files: 20+ files using `console.log()` for errors
- Examples:
  - `apps/api/src/trpc/routers/transactions.ts` (6 occurrences)
  - `apps/api/src/trpc/routers/user.ts`
- Impact: Lost error tracking in production
- Migration plan: Replace with Pino logger calls

---

*Concerns audit: 2026-01-16*
*Update as issues are fixed or new ones discovered*
