# Testing Patterns

**Analysis Date:** 2026-01-16

## Test Framework

**Runner:**
- Bun Test (built-in)
- Import: `import { describe, expect, it, test } from "bun:test";`

**Assertion Library:**
- Bun built-in `expect()`
- Matchers: `toBe`, `toEqual`, `toMatch`, `toThrow`

**Run Commands:**
```bash
bun test src                          # Run all tests in package
turbo test --parallel                 # Run all workspace tests
bun test path/to/file.test.ts        # Single file
```

## Test File Organization

**Location:**
- Co-located with source: `*.test.ts` alongside `*.ts`
- Integration tests: `packages/db/src/test/` directory

**Naming:**
- Unit tests: `name.test.ts` (e.g., `index.test.ts`, `tax.test.ts`)
- Integration: `feature.integration.test.ts`
- Golden/snapshot: `feature.golden.test.ts`

**Structure:**
```
packages/
├── encryption/src/
│   ├── index.ts
│   └── index.test.ts              # Co-located
├── utils/src/
│   ├── tax.ts
│   └── tax.test.ts                # Co-located
└── db/src/test/                   # Integration directory
    ├── transaction-matching.test.ts
    ├── transaction-matching.integration.test.ts
    └── transaction-matching.golden.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, beforeAll, beforeEach } from "bun:test";

describe("ModuleName", () => {
  beforeEach(() => {
    // Reset state per test
  });

  it("should handle valid input", () => {
    // arrange
    const input = createTestInput();

    // act
    const result = functionName(input);

    // assert
    expect(result).toEqual(expectedOutput);
  });

  it("should throw on invalid input", () => {
    expect(() => functionName(null)).toThrow("Invalid input");
  });
});
```

**Patterns:**
- Use `beforeEach` for per-test setup
- Use `beforeAll` for one-time setup (DB connections, valid keys)
- Explicit arrange/act/assert in complex tests
- One focus per test (multiple expects OK)

## Mocking

**Framework:**
- Bun provides mocking via module overrides
- **NO MOCKING FRAMEWORK DETECTED** - Direct implementation

**What to Mock:**
- External APIs and network calls
- File system operations
- Database connections in unit tests
- Environment variables

**What NOT to Mock:**
- Pure functions
- Internal business logic
- Simple utilities

## Fixtures and Factories

**Test Data:**
```typescript
// Factory functions in test file
function createTestUser(overrides?: Partial<User>): User {
  return {
    id: "test-id",
    name: "Test User",
    email: "test@example.com",
    ...overrides
  };
}

// Inline test data
const sampleLineItems = [
  { price: 100, quantity: 2 },
  { price: 50, quantity: 1 },
];
```

**Location:**
- Factory functions: Define in test file near usage
- Shared fixtures: No dedicated fixtures directory detected
- Mock data: Inline when simple, factory when complex

## Coverage

**Requirements:**
- No enforced coverage target
- Coverage tracked for awareness
- **CRITICAL GAP**: Only 10 test files exist for entire codebase

**Configuration:**
- No coverage config detected
- Would use Bun's built-in coverage via `--coverage`

**View Coverage:**
```bash
bun test --coverage
```

## Test Types

**Unit Tests:**
- Test single function in isolation
- Mock external dependencies
- Fast execution (<100ms per test)
- Examples: `packages/encryption/src/index.test.ts`

**Integration Tests:**
- Test multiple modules together
- Mock only external boundaries
- Examples: `packages/db/src/test/transaction-matching.integration.test.ts`

**Golden Tests:**
- Regression testing against known-good outputs
- Examples: `packages/db/src/test/transaction-matching.golden.test.ts`

## Common Patterns

**Async Testing:**
```typescript
it("should handle async operation", async () => {
  const result = await asyncFunction();
  expect(result).toBe("expected");
});
```

**Error Testing:**
```typescript
it("should throw on invalid input", () => {
  expect(() => parse(null)).toThrow("Cannot parse null");
});

// Async error
it("should reject on failure", async () => {
  await expect(asyncCall()).rejects.toThrow("error message");
});
```

**Setup/Teardown:**
```typescript
beforeAll(() => {
  // One-time setup (e.g., generate encryption key)
  validKey = crypto.randomBytes(32).toString("hex");
});

beforeEach(() => {
  // Per-test setup
  process.env.MIDDAY_ENCRYPTION_KEY = validKey;
});
```

## Test Coverage Gaps

**CRITICAL - Untested Code:**
- All 37+ tRPC routers in `apps/api/src/trpc/routers/`
- Invoice generation (`apps/api/src/trpc/routers/invoice.ts` - 41K lines)
- Complex poker import logic (`apps/dashboard/src/components/poker/`)
- League validation (`apps/dashboard/src/lib/poker/validation.ts`)
- Transaction matching (`packages/db/src/queries/transaction-matching.ts`)

**Existing Tests (10 files):**
- `packages/encryption/src/index.test.ts` - Encryption/decryption
- `packages/inbox/src/utils.test.ts` - Email utilities
- `packages/db/src/test/transaction-matching*.test.ts` - Matching algorithm (3 files)
- `packages/utils/src/tax.test.ts` - Tax calculations
- `packages/invoice/src/utils/calculate.test.ts` - Invoice math
- `packages/import/src/utils.test.ts` - Import utilities

## Best Practices Observed

**Test Isolation:**
- Each test sets up its own state
- No test interdependencies
- Clean slate via `beforeEach()`

**Meaningful Assertions:**
- Comments explain calculations: `expect(result).toBe(255); // (250 + 25 - 20)`
- Test both success and specific failure modes

**Real-World Scenarios:**
- Named test scenarios with descriptions
- Examples: EU VAT, US sales tax, withholding tax

**Comprehensive Edge Cases:**
- Zero values, undefined values, empty arrays
- Boundary testing (very large/small amounts)
- Priority fallback chains

---

*Testing analysis: 2026-01-16*
*Update when test patterns change*
