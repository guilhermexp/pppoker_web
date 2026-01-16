# Technology Stack

**Analysis Date:** 2026-01-16

## Languages

**Primary:**
- TypeScript 5.9.3 - Todos os códigos da aplicação (`package.json`, `apps/*/package.json`)
- TSX/React 19.2 - Componentes frontend e email (`apps/dashboard/src`, `packages/email`)

**Secondary:**
- CSS/Tailwind - Estilização (`apps/dashboard/tailwind.config.ts`, `packages/ui/tailwind.config.ts`)

## Runtime

**Environment:**
- Bun 1.2.22 - Runtime principal (`package.json` packageManager: "bun@1.2.22")
- Docker - Containers para API e Dashboard (`Dockerfile.api`, `Dockerfile.dashboard`)

**Package Manager:**
- Bun 1.2.22 - Gerenciador de pacotes
- Lockfile: `bun.lock`
- Monorepo: Turbo workspaces com 20+ pacotes

## Frameworks

**Core:**
- Next.js 16.0.4 - Frontend framework com App Router (`apps/dashboard/package.json`)
- Hono 4.10.6 - Backend HTTP framework (`apps/api/package.json`)
- tRPC 11.7.1 - Type-safe API layer (`apps/api/package.json`)

**Testing:**
- Bun Test - Framework de testes nativo
- Testes co-localizados com código fonte (`*.test.ts`)

**Build/Dev:**
- Turbo 2.6.1 - Orquestração de monorepo (`package.json`)
- Biome 1.9.4 - Linting e formatação (`biome.json`)
- TypeScript 5.9.3 - Compilação e type checking

## Key Dependencies

**AI/ML Stack:**
- `ai` ^5.0.101 - Vercel AI SDK
- `@ai-sdk/openai` ^2.0.71 - ChatGPT integration
- `@ai-sdk/google` ^2.0.42 - Google Generative AI
- `@ai-sdk/mistral` ^2.0.24 - Mistral AI
- `@mistralai/mistralai` ^1.10.0 - Mistral client direto

**Database & Backend:**
- `@supabase/supabase-js` ^2.84.0 - Auth e real-time
- `drizzle-orm` 0.45.1 - ORM PostgreSQL (`packages/db`)
- `pg` ^8.16.3 - PostgreSQL driver
- `redis` ^5.10.0 - Caching layer

**RPC & API:**
- `@trpc/server` ^11.7.1 - Server-side RPC
- `@trpc/client` ^11.7.1 - Client-side RPC
- `@hono/trpc-server` ^0.4.0 - Integração Hono+tRPC
- `@hono/zod-openapi` ^1.1.4 - OpenAPI docs

**Email & Notifications:**
- `resend` ^6.4.2 - Serviço de email
- `@react-email/components` 1.0.1 - Templates
- `react-email` 5.0.4 - Rendering de emails

**State & Data Management:**
- `@tanstack/react-query` ^5.90.10 - Server state
- `@tanstack/react-table` ^8.21.3 - Tabelas
- `zustand` ^5.0.8 - Client state
- `zod` ^4.1.13 - Schema validation

**Document Processing:**
- `@langchain/community` 1.0.3 - Chains
- `unpdf` ^1.4.0 - PDF parsing
- `mammoth` ^1.11.0 - Word documents
- `officeparser` 5.2.2 - Office files

**UI & Styling:**
- `@radix-ui/*` - Componentes UI primitivos
- `tailwindcss` ^3.4.0 - CSS framework
- `framer-motion` ^12.23.24 - Animações
- `recharts` 2.15.3 - Gráficos
- `lucide-react` ^0.554.0 - Ícones

**File Handling:**
- `xlsx` ^0.18.5 - Excel
- `papaparse` ^5.5.3 - CSV
- `sharp` 0.34.5 - Processamento de imagens
- `jspdf` ^3.0.4 - Geração de PDF

**Logging:**
- `pino` ^10.1.0 - Structured logging
- `pino-pretty` ^13.1.2 - Pretty printer

## Configuration

**Environment:**
- Variáveis de ambiente via arquivos `.env`
- Templates: `apps/dashboard/.env-example`, `apps/api/.env-template`
- Configurações críticas: Supabase, Resend, Trigger.dev, OpenAI, Google Maps

**Build:**
- `tsconfig.json` - Root TypeScript config
- `biome.json` - Lint e format rules
- `turbo.json` - Build pipeline
- `apps/dashboard/tailwind.config.ts` - Tailwind config
- `packages/db/drizzle.config.ts` - Database config
- `packages/jobs/trigger.config.ts` - Job scheduler config

## Platform Requirements

**Development:**
- macOS/Linux/Windows com Bun 1.2.22+
- Docker para containers
- PostgreSQL (via Supabase)
- Redis (local ou Upstash)

**Production:**
- Docker containers (Bun base image)
- Supabase (PostgreSQL + Auth + Storage)
- Vercel Functions (`@vercel/functions` ^3.3.4)
- Trigger.dev (background jobs)
- Upstash Redis (caching)

---

*Stack analysis: 2026-01-16*
*Update after major dependency changes*
