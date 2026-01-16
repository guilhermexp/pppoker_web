# Coding Conventions

**Analysis Date:** 2026-01-16

## Naming Patterns

**Files:**
- kebab-case para utilities e services: `api-key-cache.ts`, `user-service.ts`
- PascalCase.tsx para React components: `AnimatedSizeContainer.tsx`, `Card.tsx`
- name.test.ts para testes: `index.test.ts`, `tax.test.ts`, `calculate.test.ts`

**Functions:**
- camelCase para todas as funções
- Sem prefixo especial para async: `fetchData()`, `createUser()`
- Handlers de eventos: `handleClick`, `handleSubmit`, `handle{EventName}`

**Variables:**
- camelCase para variáveis: `lineItem`, `sampleLineItems`, `encryptedPayload`
- UPPER_SNAKE_CASE para constantes: `ALGORITHM`, `MAX_RETRIES`, `API_BASE_URL`
- Hash prefix para membros privados: `this.#db`, `this.#provider`

**Types:**
- PascalCase para interfaces (sem prefixo I): `User`, `Transaction`, `ApiKey`
- PascalCase para type aliases: `UserConfig`, `ResponseData`
- PascalCase para enums: `Status.PENDING`

## Code Style

**Formatting:**
- Tool: Biome 1.9.4 (`biome.json`)
- Indentation: 2 spaces
- Quotes: Double quotes
- Semicolons: Required
- Line length: Não especificado (padrão Biome)

**Linting:**
- Tool: Biome 1.9.4 (substitui ESLint)
- Config: `biome.json`
- Run: `bun run lint` ou `biome check .`

## Import Organization

**Order:**
1. Node built-ins (node:crypto, node:fs)
2. External packages (react, zod, @supabase/*)
3. Internal workspace packages (@midpoker/*)
4. Relative imports (., ..)
5. Type imports (`import type`)

**Grouping:**
- Sem linhas em branco entre imports do mesmo grupo
- Separação visual por comentários quando necessário

**Path Aliases:**
- `@/` para src/ em alguns pacotes
- Workspace protocol: `@midpoker/*` para pacotes internos

## Error Handling

**Patterns:**
- tRPC routers: Throw `TRPCError` com código específico
- Server actions: Return `{ error: string }` ou throw
- Try/catch em operações de I/O
- **TECH DEBT**: Alguns routers usam `console.log()` e retornam silent failures

**Error Types:**
- Throw on: Invalid input, missing dependencies, invariant violations
- Log before throw: `logger.error({ err, context }, 'Message')`
- No silent failures em produção (ideal)

## Logging

**Framework:**
- Pino logger (`packages/logger/src/index.ts`)
- Levels: debug, info, warn, error

**Patterns:**
- Structured logging: `logger.info({ userId, action }, 'User action')`
- Log at service boundaries, not in utilities
- Context objects com metadados relevantes
- **TECH DEBT**: 20+ files ainda usam `console.log()` para erros

## Comments

**When to Comment:**
- Explain why, not what
- Document business rules: `// Users must verify email within 24 hours`
- Explain non-obvious algorithms
- **BAD**: Obvious comments like `// increment counter`

**JSDoc/TSDoc:**
- Used for exported functions
- Format: `@param`, `@returns`, `@throws`
- Example:
  ```typescript
  /**
   * Encrypts a plaintext string using AES-256-GCM.
   * @param text The plaintext string to encrypt.
   * @returns A string containing IV, auth tag, and encrypted text.
   */
  ```

**TODO Comments:**
- Format: `// TODO: description`
- Link to issue if exists: `// TODO: Fix race condition (issue #123)`
- **TECH DEBT**: 11+ TODO/FIXME encontrados sem issues linkados

## Function Design

**Size:**
- Keep under 50 lines (ideal)
- Extract helpers for complex logic

**Parameters:**
- Max 3 parameters
- Use options object for 4+: `function create(options: CreateOptions)`
- Destructure in parameter list: `function process({ id, name }: Params)`

**Return Values:**
- Explicit return statements
- Return early for guard clauses
- Type inference quando possível

## Module Design

**Exports:**
- Named exports preferred
- Default exports apenas para React components (em alguns casos)
- Example pattern:
  ```typescript
  export const apiKeyCache = {
    get: (key) => cache.get(key),
    set: (key, value) => cache.set(key, value),
  };
  ```

**Barrel Files:**
- `index.ts` re-exports public API
- Keep internal helpers private
- Avoid circular dependencies

## React Component Patterns

**Structure:**
- Use `forwardRef` for components accepting refs
- Include `displayName` for debugging
- Example:
  ```typescript
  const Card = React.forwardRef<HTMLDivElement, Props>(
    ({ className, ...props }, ref) => (
      <div ref={ref} className={cn("border", className)} {...props} />
    )
  );
  Card.displayName = "Card";
  ```

**Hooks:**
- Custom hooks com prefixo `use-`: `use-chat-params.ts`, `use-invoice-filter.ts`
- Co-located com componentes ou em `hooks/` directory

**State:**
- Zustand para global state: `apps/dashboard/src/store/*.ts`
- React Query para server state (via tRPC)
- URL params para filtros: custom `useParams` hooks

## TypeScript Patterns

**Strict Mode:**
- Enabled: `"strict": true` in tsconfig
- `noUncheckedIndexedAccess: true`
- No implicit any

**Type Safety:**
- **TECH DEBT**: 50 files com `@ts-expect-error` ou `@ts-ignore`
- Prefer explicit types over inference em public APIs
- Use `satisfies` operator para type narrowing

---

*Convention analysis: 2026-01-16*
*Update when patterns change*
