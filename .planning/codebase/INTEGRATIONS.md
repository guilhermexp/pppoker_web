# External Integrations

**Analysis Date:** 2026-01-16

## APIs & External Services

**AI/ML Services:**
- **OpenAI** - GPT models via `@ai-sdk/openai` ^2.0.71
  - Environment: `OPENAI_API_KEY`
  - Files: `apps/api/src/ai/agents`, `apps/dashboard/src/lib/agent-utils.ts`

- **Google Generative AI** - Gemini via `@ai-sdk/google` ^2.0.42
  - Environment: `NEXT_PUBLIC_GOOGLE_API_KEY`
  - Usage: Document classification, categorization
  - Files: `packages/documents/`, `packages/categories/`

- **Mistral AI** - Mistral models via `@ai-sdk/mistral` ^2.0.24
  - Environment: `MISTRAL_API_KEY`
  - Files: `packages/documents/package.json`

**Google Maps API:**
- Environment: `NEXT_PUBLIC_GOOGLE_API_KEY`
- Usage: Address autocomplete
- Packages: `@react-google-maps/api` ^2.20.7, `use-places-autocomplete` ^4.0.1
- Files: `apps/dashboard/src/components/search-address-input.tsx`

**VatCheckAPI:**
- Environment: `VATCHECKAPI_API_KEY`
- Purpose: VAT validation for EU transactions

## Data Storage

**Supabase - PostgreSQL + Auth + Storage:**
- Versions: `@supabase/supabase-js` ^2.84.0, `@supabase/ssr` ^0.7.0
- Environment:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_SUPABASE_ID`
  - `SUPABASE_SERVICE_KEY`
- Files:
  - `packages/supabase/src/client/server.ts` - Server-side client
  - `packages/supabase/src/client/client.ts` - Browser client
  - `packages/supabase/src/client/middleware.ts` - Next.js middleware

**PostgreSQL via Drizzle ORM:**
- Connection: `packages/db/drizzle.config.ts`
- Environment: `DATABASE_SESSION_POOLER`
- ORM: Drizzle 0.45.1
- Migrations: `packages/db/migrations/`

**Redis - Caching:**
- Docker: `docker-compose.yml` (redis:alpine on port 6379)
- Client: `redis` ^5.10.0
- Cache modules: `packages/cache/src/` (api-key, user, team, chat, widget)
- Environment: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Authentication & Identity

**Supabase Auth:**
- Implementation: Supabase client SDK with SSR
- Token storage: httpOnly cookies via `@supabase/ssr`
- Session management: JWT refresh tokens handled by Supabase

**OAuth Integrations:**
- GitHub OAuth (implied by `GITHUB_TOKEN` env var)
- Slack OAuth: `packages/app-store/src/slack/`
- Environment: `NEXT_PUBLIC_SLACK_OAUTH_REDIRECT_URL`, `SLACK_CLIENT_SECRET`

## Email & Notifications

**Resend - Email delivery:**
- Package: `resend` ^6.4.2
- Environment: `RESEND_API_KEY`, `RESEND_AUDIENCE_ID`
- Files: `apps/api/src/services/resend.ts`, `apps/dashboard/src/utils/resend.ts`
- Templates: `packages/email/emails/` (React Email components)

**React Email - Email templating:**
- Packages: `@react-email/components`, `@react-email/render`
- Dev server: `packages/email/package.json` (email dev -p 3003)
- Email types: API keys, invoices, transactions, trials

## Job Scheduling

**Trigger.dev ^4.1.2:**
- Environment: `TRIGGER_SECRET_KEY`, `TRIGGER_PROJECT_ID`
- Config: `packages/jobs/trigger.config.ts`
- Runtime: Node with 60s max duration
- Tasks: `packages/jobs/src/tasks/`

## Integrations & Apps

**Slack Integration:**
- Packages: `@slack/bolt` ^4.6.0, `@slack/web-api` ^7.12.0
- Files: `packages/app-store/src/slack/`
- OAuth: `apps/dashboard/src/app/api/apps/slack/oauth_callback/route.ts`

**Xero:**
- Config: `packages/app-store/src/xero/config.ts`

**QuickBooks:**
- Config: `packages/app-store/src/quick-books/config.ts`

**Cal.com:**
- Config: `packages/app-store/src/cal/config.ts`

**Raycast:**
- Config: `packages/app-store/src/raycast/config.ts`

## Document Processing

**Azure Document Intelligence:**
- Environment: `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT`, `AZURE_DOCUMENT_INTELLIGENCE_KEY`
- Purpose: Document analysis and OCR

**LangChain - Document processing:**
- Packages: `@langchain/community` 1.0.3, `@langchain/core` 1.0.5
- Files: `packages/documents/src/`

**Document Parsers:**
- `unpdf` ^1.4.0 - PDF extraction
- `mammoth` ^1.11.0 - Word documents
- `officeparser` 5.2.2 - Office documents
- `sharp` 0.34.5 - Image processing

## Analytics & Monitoring

**OpenPanel - Product analytics:**
- Environment: `NEXT_PUBLIC_OPENPANEL_CLIENT_ID`, `OPENPANEL_SECRET_KEY`

**Plain - Customer support:**
- Package: `@team-plain/typescript-sdk` ^5.11.0
- Environment: `PLAIN_API_KEY`

## File Upload & Storage

**Supabase Storage:**
- Proxy: `apps/dashboard/src/app/api/proxy/route.ts`
- File serving: `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/`

**Tus Protocol - Resumable uploads:**
- Package: `tus-js-client` 4.3.1
- Purpose: Large file uploads with resume capability

## Webhooks & Security

**Webhook Authentication:**
- Environment: `WEBHOOK_SECRET_KEY=6c369443-1a88-444e-b459-7e662c1fff9e` ⚠️ (hardcoded in .env-example)
- HMAC SHA256: `apps/dashboard/src/app/api/webhook/registered/route.ts`

**Invoice Security:**
- Environment: `INVOICE_JWT_SECRET=secret` ⚠️ (default in .env-example)
- Package: `jose` ^6.1.2 for JWT/encryption
- Files: `packages/invoice/src/token/`

## Deployment

**Vercel Functions:**
- Package: `@vercel/functions` ^3.3.4

**Docker:**
- Base: `oven/bun:1.2.22`
- Files: `Dockerfile.api`, `Dockerfile.dashboard`
- Compose: `docker-compose.yml` (Redis service)

## Environment Configuration

**Required Variables:**
```
Supabase: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY
Database: DATABASE_SESSION_POOLER
Redis: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
Resend: RESEND_API_KEY, RESEND_AUDIENCE_ID
Trigger.dev: TRIGGER_SECRET_KEY, TRIGGER_PROJECT_ID
AI: OPENAI_API_KEY, MISTRAL_API_KEY, NEXT_PUBLIC_GOOGLE_API_KEY
GitHub: GITHUB_TOKEN
Plain: PLAIN_API_KEY
OpenPanel: NEXT_PUBLIC_OPENPANEL_CLIENT_ID, OPENPANEL_SECRET_KEY
Azure: AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY
Webhooks: WEBHOOK_SECRET_KEY
Invoice: INVOICE_JWT_SECRET
```

**Config Files:**
- `apps/dashboard/.env-example`
- `apps/api/.env-template`
- `packages/jobs/.env-template`

---

*Integration audit: 2026-01-16*
*Update when adding/removing external services*
