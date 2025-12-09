# AI Quickstart: Midday (Self-Hosted)

**Last Analysis Date:** 2025-11-27 22:00:00 UTC
**Git Branch:** main
**Git Status:** dirty - 150+ files modified (major simplification + AI agent tools)
**Self-Hosted Fork:** Yes - simplified version removing external dependencies

## Project Overview

Midday is an open-source financial management platform for businesses, providing invoicing, time tracking, document management, and financial analytics. This is a **self-hosted fork** that has been simplified by removing external banking integrations, billing systems, desktop app, and marketing website to focus on core functionality.

**Key Features:**
- Transaction management with AI-powered categorization
- Invoice creation, scheduling, and PDF generation
- Time tracking with project management
- Document vault with AI tagging and OCR
- Smart inbox for receipt/invoice matching
- AI assistant for financial queries
- Team collaboration with role-based access

## Architecture Overview

```
+-----------------------------------------------------------------------------------+
|                                   APPLICATIONS                                     |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +-------------------+     +--------------------+     +------------------+       |
|   |   apps/dashboard  |     |     apps/api       |     |    apps/docs     |       |
|   |   (Next.js 16)    |<--->|   (Hono + tRPC)    |     |   (Mintlify)     |       |
|   |   Port: 9000      |     |    Port: 8080      |     |                  |       |
|   +-------------------+     +--------------------+     +------------------+       |
|          |                         |                                              |
+----------|-------------------------|----------------------------------------------+
           |                         |
           v                         v
+-----------------------------------------------------------------------------------+
|                               SHARED PACKAGES                                      |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  +--------+  +-------+  +-------+  +------+  +-------+  +-----------+  +-------+ |
|  |   db   |  | email |  |  jobs |  |  ui  |  | inbox |  | documents |  | utils | |
|  +--------+  +-------+  +-------+  +------+  +-------+  +-----------+  +-------+ |
|  | Drizzle|  | React |  |Trigger|  |Radix |  |Gmail  |  |  Azure    |  |Helper | |
|  |  ORM   |  | Email |  |  .dev |  | UI   |  |OAuth  |  |  Doc AI   |  | funcs | |
|  +--------+  +-------+  +-------+  +------+  +-------+  +-----------+  +-------+ |
|                                                                                   |
|  +----------+  +----------+  +-----------+  +----------+  +-------------+        |
|  |  cache   |  | invoice  |  | location  |  | supabase |  | categories  |        |
|  +----------+  +----------+  +-----------+  +----------+  +-------------+        |
|  |  Redis   |  |   PDF    |  |  GeoIP    |  |  Auth    |  |  Default    |        |
|  +----------+  +----------+  +-----------+  +----------+  +-------------+        |
|                                                                                   |
+-----------------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------------+
|                              INFRASTRUCTURE                                        |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   +------------------+    +------------------+    +------------------+            |
|   |    Supabase      |    |   Trigger.dev    |    |      Redis       |            |
|   |  (PostgreSQL +   |    | (Background Jobs)|    |    (Caching)     |            |
|   |   Auth + RLS)    |    |                  |    |                  |            |
|   +------------------+    +------------------+    +------------------+            |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

## Data Model (38 Tables)

### Core Business Entities

```
+----------------+       +----------------+       +------------------+
|     teams      |<----->|     users      |<----->|  users_on_team   |
+----------------+       +----------------+       +------------------+
| id (PK)        |       | id (PK)        |       | team_id (FK)     |
| name           |       | full_name      |       | user_id (FK)     |
| base_currency  |       | email          |       | role             |
| plan           |       | locale         |       | created_at       |
| inbox_id       |       | timezone       |       +------------------+
| flags[]        |       | team_id (FK)   |
+----------------+       +----------------+
       |
       +---> bank_accounts, transactions, invoices, customers, etc.
```

### Complete Entity List

| Entity | Description | Key Relationships |
|--------|-------------|-------------------|
| **teams** | Organization/workspace | Has many users, transactions, invoices |
| **users** | User profiles | Belongs to team, has settings |
| **users_on_team** | Team membership | Links users to teams with roles |
| **user_invites** | Pending invitations | Belongs to team |
| **transactions** | Financial transactions | Belongs to team, bank_account, category |
| **transaction_categories** | Custom categories | Belongs to team |
| **transaction_tags** | Tag assignments | Links transactions to tags |
| **transaction_attachments** | Receipt attachments | Belongs to transaction |
| **transaction_embeddings** | Vector embeddings | For AI matching |
| **transaction_enrichments** | Enriched merchant data | Belongs to transaction |
| **transaction_match_suggestions** | AI match suggestions | Links inbox to transactions |
| **bank_accounts** | Manual/connected accounts | Belongs to team |
| **bank_connections** | Provider connections | Belongs to team (legacy) |
| **invoices** | Customer invoices | Belongs to team, customer |
| **invoice_templates** | Invoice layouts | Belongs to team |
| **invoice_products** | Reusable line items | Belongs to team |
| **invoice_comments** | Invoice collaboration | Belongs to invoice |
| **customers** | Business clients | Belongs to team |
| **customer_tags** | Customer categorization | Links customers to tags |
| **tracker_projects** | Time tracking projects | Belongs to team, customer |
| **tracker_entries** | Time entries | Belongs to project |
| **tracker_reports** | Shared time reports | Belongs to project |
| **tracker_project_tags** | Project categorization | Links projects to tags |
| **documents** | Vault files | Belongs to team |
| **document_tags** | Document categorization | Belongs to team |
| **document_tag_assignments** | Tag assignments | Links documents to tags |
| **document_tag_embeddings** | Vector embeddings | For AI tagging |
| **inbox** | Incoming receipts/invoices | Belongs to team |
| **inbox_accounts** | Gmail connections | Belongs to team |
| **inbox_embeddings** | Vector embeddings | For AI matching |
| **tags** | Reusable tags | Belongs to team |
| **reports** | Financial reports | Belongs to team |
| **apps** | Third-party integrations | Belongs to team |
| **activities** | Activity feed | Belongs to team |
| **notification_settings** | User preferences | Belongs to user |
| **exchange_rates** | Currency rates | Global table |
| **api_keys** | API authentication | Belongs to team |
| **oauth_applications** | OAuth clients | For API access |
| **oauth_authorization_codes** | OAuth flow | Temporary codes |
| **oauth_access_tokens** | OAuth tokens | API authentication |
| **short_links** | URL shortening | For sharing |
| **transaction_category_embeddings** | Category vectors | For AI categorization |

### Key Enums

```typescript
accountTypeEnum: "depository" | "credit" | "other_asset" | "loan" | "other_liability"
invoiceStatusEnum: "draft" | "overdue" | "paid" | "unpaid" | "canceled" | "scheduled"
trackerStatusEnum: "in_progress" | "completed"
inboxStatusEnum: "processing" | "pending" | "archived" | "new" | "analyzing" | "suggested_match" | "no_match" | "done" | "deleted"
teamRolesEnum: "owner" | "member"
plansEnum: "trial" | "starter" | "pro"
```

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Runtime** | Bun | 1.2.22 |
| **Language** | TypeScript | 5.9.x |
| **Frontend** | Next.js | 16.0.x |
| **UI Library** | React | 19.2.x |
| **Backend** | Hono | 4.10.x |
| **API Layer** | tRPC | 11.7.x |
| **Database** | PostgreSQL (Supabase) | - |
| **ORM** | Drizzle | 0.44.x |
| **Auth** | Supabase Auth | - |
| **Jobs** | Trigger.dev | 4.1.x |
| **AI/LLM** | OpenAI + AI SDK | 5.0.x |
| **Email** | React Email + Resend | - |
| **Caching** | Redis | - |
| **UI Components** | Radix UI + Tailwind | - |
| **Monorepo** | Turbo | 2.6.x |

## Setup Instructions

### Prerequisites
- Bun 1.2.22+
- PostgreSQL (via Supabase)
- Redis (optional, for caching)
- Trigger.dev account (for background jobs)

### Environment Variables

**API (`apps/api/.env`):**
```bash
# Supabase
SUPABASE_JWT_SECRET=
SUPABASE_SERVICE_KEY=
SUPABASE_URL=

# Database (Drizzle)
DATABASE_PRIMARY_URL=
DATABASE_SESSION_POOLER=

# LLMs
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=

# Jobs
TRIGGER_PROJECT_ID=
TRIGGER_SECRET_KEY=

# Email
RESEND_API_KEY=

# Config
ALLOWED_API_ORIGINS="http://localhost:9000"
MIDDAY_DASHBOARD_URL="http://localhost:9000"
INVOICE_JWT_SECRET=
MIDDAY_ENCRYPTION_KEY=

# Cache
REDIS_URL=redis://localhost:6379
```

**Dashboard (`apps/dashboard/.env`):**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# URLs
NEXT_PUBLIC_URL=http://localhost:9000
NEXT_PUBLIC_API_URL=http://localhost:8080

# Jobs
TRIGGER_SECRET_KEY=
TRIGGER_PROJECT_ID=

# AI
OPENAI_API_KEY=

# Document Processing
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=

# Google Maps (for location features)
NEXT_PUBLIC_GOOGLE_API_KEY=
```

### Installation

```bash
# Install dependencies
bun install

# Run both API and Dashboard in development
bun dev

# Or run individually
bun dev:api       # API on port 8080
bun dev:dashboard # Dashboard on port 9000
```

### Database Setup

```bash
# Run migrations (in packages/db)
cd packages/db
bunx drizzle-kit push

# Setup RLS functions (run in Supabase SQL editor)
# See: packages/db/setup-functions.sql
```

## Key Workflows

### 1. Authentication Flow
```
User -> Supabase Auth -> JWT Token -> API validates via SUPABASE_JWT_SECRET
                      -> Dashboard uses @supabase/ssr for session management
```

### 2. Transaction Management
```
Manual Entry -> API (tRPC) -> Database
            -> Trigger.dev job for enrichment
            -> AI categorization via embeddings
```

### 3. Invoice Generation
```
Create Invoice -> Generate PDF (React PDF) -> Store in Supabase Storage
              -> Schedule via Trigger.dev
              -> Email via Resend
```

### 4. Document/Inbox Processing
```
Upload/Email -> Trigger.dev job -> Azure Document Intelligence (OCR)
            -> Extract metadata -> AI matching with transactions
            -> Suggest matches via embeddings
```

### 5. AI Assistant
```
User Query -> OpenAI API -> Tool calls (get transactions, create invoice, etc.)
          -> Stream response via AI SDK
```

## Multi-Agent AI System

The AI assistant uses a **multi-agent architecture** with specialized agents for different domains:

### Architecture
```
+------------------+
|   User Query     |
+--------+---------+
         |
         v
+------------------+
|  Triage Agent    |  <-- Routes to appropriate specialist
|  (GPT-4o-mini)   |
+--------+---------+
         |
    +----+----+--------------------+
    |         |                    |
    v         v                    v
+--------+ +--------+      +-------------+
|Trans.  | |Invoice |      | Other       |
|Agent   | |Agent   |      | Agents...   |
+--------+ +--------+      +-------------+
```

### Agent Definitions

Located in `apps/api/src/ai/agents/`:

| Agent | File | Description |
|-------|------|-------------|
| **Triage** | `triage.ts` | Routes queries to specialized agents |
| **Transactions** | `transactions.ts` | Financial operations (CRUD transactions, categories, customers, bank accounts) |
| **Invoices** | `invoices.ts` | Invoice operations (CRUD invoices) |

### AI Tools

Located in `apps/api/src/ai/tools/`:

#### Transaction Tools
| Tool | File | Description |
|------|------|-------------|
| `getTransactions` | `get-transactions.ts` | Search and filter transactions |
| `createTransaction` | `create-transaction.ts` | Create new transaction (expense/income) |
| `updateTransaction` | `update-transaction.ts` | Update existing transaction |
| `deleteTransaction` | `delete-transaction.ts` | Delete transaction |

#### Category Tools
| Tool | File | Description |
|------|------|-------------|
| `getCategories` | `get-categories.ts` | List transaction categories |
| `createCategory` | `create-category.ts` | Create new category |
| `updateCategory` | `update-category.ts` | Update existing category |
| `deleteCategory` | `delete-category.ts` | Delete category |

#### Customer Tools
| Tool | File | Description |
|------|------|-------------|
| `getCustomers` | `get-customers.ts` | List customers |
| `createCustomer` | `create-customer.ts` | Create new customer |
| `updateCustomer` | `update-customer.ts` | Update existing customer |
| `deleteCustomer` | `delete-customer.ts` | Delete customer |

#### Bank Account Tools
| Tool | File | Description |
|------|------|-------------|
| `getBankAccounts` | `get-bank-accounts.ts` | List bank accounts |
| `createBankAccount` | `create-bank-account.ts` | Create new bank account |
| `updateBankAccount` | `update-bank-account.ts` | Update existing bank account |
| `deleteBankAccount` | `delete-bank-account.ts` | Delete bank account |

#### Invoice Tools
| Tool | File | Description |
|------|------|-------------|
| `getInvoices` | `get-invoices.ts` | List invoices |
| `createInvoice` | `create-invoice.ts` | Create new invoice |
| `updateInvoice` | `update-invoice.ts` | Update existing invoice |
| `deleteInvoice` | `delete-invoice.ts` | Delete invoice |

### Tool Implementation Pattern

All tools follow a consistent pattern using the AI SDK:

```typescript
import { tool } from "ai";
import { z } from "zod";

export const myTool = ({ teamId, userId, db }: ToolContext) =>
  tool({
    description: "Description for the AI to understand when to use this tool",
    parameters: z.object({
      param1: z.string().describe("Description of param1"),
      // ... more parameters
    }),
    execute: async ({ param1 }) => {
      // Implementation
      return { success: true, data: result };
    },
  });
```

### Adding New Tools

1. Create tool file in `apps/api/src/ai/tools/`
2. Export from `apps/api/src/ai/tools/index.ts`
3. Add to appropriate agent in `apps/api/src/ai/agents/`

## tRPC Router Structure

```typescript
appRouter = {
  // Core entities
  transactions: transactionsRouter,
  bankAccounts: bankAccountsRouter,
  bankConnections: bankConnectionsRouter,
  customers: customersRouter,
  invoice: invoiceRouter,
  invoiceProducts: invoiceProductsRouter,
  invoiceTemplate: invoiceTemplateRouter,

  // Time tracking
  trackerEntries: trackerEntriesRouter,
  trackerProjects: trackerProjectsRouter,

  // Documents
  documents: documentsRouter,
  documentTags: documentTagsRouter,
  documentTagAssignments: documentTagAssignmentsRouter,
  inbox: inboxRouter,
  inboxAccounts: inboxAccountsRouter,

  // Organization
  team: teamRouter,
  user: userRouter,
  apps: appsRouter,

  // Features
  search: searchRouter,
  reports: reportsRouter,
  notifications: notificationsRouter,
  notificationSettings: notificationSettingsRouter,
  transactionCategories: transactionCategoriesRouter,
  transactionAttachments: transactionAttachmentsRouter,
  transactionTags: transactionTagsRouter,
  tags: tagsRouter,
  widgets: widgetsRouter,

  // API/OAuth
  apiKeys: apiKeysRouter,
  oauthApplications: oauthApplicationsRouter,
  shortLinks: shortLinksRouter,

  // AI
  chats: chatsRouter,
  chatFeedback: chatFeedbackRouter,
  suggestedActions: suggestedActionsRouter,
}
```

## Background Jobs (Trigger.dev)

| Job | Description |
|-----|-------------|
| `generateInvoice` | PDF generation and delivery |
| `sendInvoiceReminder` | Overdue invoice reminders |
| `processDocument` | OCR and metadata extraction |
| `processAttachment` | Transaction attachment processing |
| `importTransactions` | CSV/file import |
| `exportTransactions` | Export to CSV/XLSX |
| `deleteTeam` | Cascade team deletion |
| `inviteTeamMembers` | Send invitation emails |
| `updateBaseCurrency` | Recalculate base amounts |
| `embedTransaction` | Generate vector embeddings |
| `initialInboxSetup` | Gmail inbox sync |
| `inboxSlackUpload` | Slack integration uploads |
| `notification` | Activity notifications |

## Local Modifications (Self-Hosted Simplifications)

### Removed Components

| Component | Reason |
|-----------|--------|
| **apps/engine** | Banking aggregation service (Plaid, GoCardless, Teller, EnableBanking) - removed external dependencies |
| **apps/desktop** | Tauri desktop app - focus on web-only |
| **apps/website** | Marketing site - not needed for self-hosting |
| **Polar billing** | Subscription management - removed, plans are now manual |
| **Sentry** | Error tracking - removed for privacy |
| **OpenPanel/analytics** | Analytics - removed for privacy |

### Removed Features

- Bank connection providers (Plaid, GoCardless, Teller, EnableBanking)
- Automatic transaction sync from banks
- Subscription billing and plan management
- Desktop application
- Marketing website and blog

### Modified Behavior

- Bank accounts are now **manual only** - import via CSV or manual entry
- Plans (`trial`, `starter`, `pro`) exist in schema but are not enforced
- No external analytics or error tracking
- Simplified authentication (removed some OAuth providers)

### Files Changed

Key deletions:
- `apps/engine/*` - Entire banking engine
- `apps/desktop/*` - Desktop app
- `apps/website/*` - Marketing site
- `apps/dashboard/src/actions/institutions/*` - Bank linking actions
- `apps/dashboard/src/components/*-connect.tsx` - Bank connection components
- `packages/engine-client/*` - Engine SDK
- `packages/events/*` - Analytics events
- Banking-related jobs in `packages/jobs/src/tasks/bank/*`

## i18n Support

The dashboard supports multiple languages via `next-international`:

- **Supported Languages:** English (en), Swedish (sv), Portuguese (pt)
- **Location:** `apps/dashboard/src/locales/`
- **Usage:** `useI18n()` hook for client, `getI18n()` for server

```typescript
// Client component
const t = useI18n();
t('invoice.status.paid');

// Server component
const t = await getI18n();
```

### Translation Key Structure

```typescript
{
  // Transaction methods, categories, etc.
  transaction_methods: { card_purchase, payment, transfer, ... },
  transaction_categories: { ... },

  // UI Settings
  language: { title, description, placeholder },
  locale: { title, description, placeholder },
  timezone: { title, description, placeholder },

  // Notifications
  notifications: { transactions_created, invoice_paid, ... },

  // Navigation
  navigation: {
    settings: { general, bank_connections, members, ... },
    account: { general, date_locale, security, ... },
  },

  // Actions and dialogs
  actions: { edit, delete, cancel, confirm, ... },
  dialogs: { are_you_sure, delete_confirmation, edit_customer, ... },

  // Forms
  forms: {
    sections: { general, details },
    labels: { name, email, phone, address_line_1, ... },
    placeholders: { name, email, search_address, ... },
    descriptions: { billing_email, expense_tags, ... },
    buttons: { cancel, create, update, save },
    status: { active, inactive },
  },

  // Tables
  table: {
    columns: { name, email, invoices, projects, ... },
    actions: { edit, delete, remove, edit_customer, ... },
  },

  // Toast messages
  toast: { copied_to_clipboard, saved_successfully, ... },

  // Validation
  validation: { name_required, email_invalid, ... },

  // Empty states
  empty_states: { not_found, no_results, ... },

  // AI Transaction creation
  transaction_create: { title, expense, income, ... },
}
```

## Analytics Stub Functions

The following analytics functions exist as stubs for future implementation:

| Function | Location | Purpose |
|----------|----------|---------|
| `trackEvent` | Removed | General event tracking |
| `trackPageView` | Removed | Page view tracking |
| `identifyUser` | Removed | User identification |

These were previously connected to OpenPanel but have been removed for privacy. Implement your own analytics provider if needed.

## Development Tips

1. **Database Schema Changes:** Edit `packages/db/src/schema.ts`, then run `bunx drizzle-kit push`
2. **Add tRPC Router:** Create in `apps/api/src/trpc/routers/`, add to `_app.ts`
3. **Background Jobs:** Add to `packages/jobs/src/tasks/`, register in Trigger.dev
4. **UI Components:** Shared components in `packages/ui/src/components/`
5. **Email Templates:** `packages/email/emails/`, preview with `bun email`
6. **AI Tools:** Create in `apps/api/src/ai/tools/`, export from index, add to agent

## Troubleshooting

### Trigger.dev Not Configured

If you see `ApiClientMissingError: You need to set the TRIGGER_SECRET_KEY`, the AI tools will still work but background jobs (like embedding transactions) will be skipped. This is handled gracefully with try-catch in the tools.

```typescript
// Example from create-transaction.ts
try {
  await tasks.trigger("embed-transaction", { transactionIds: [id], teamId });
} catch {
  // Trigger.dev not configured - skip embedding
}
```

### Redis Connection Errors

Redis is optional for development. If you see `ECONNREFUSED` errors for Redis, the app will continue to work but without caching.

### Database Connection

Ensure your Supabase instance is running and the connection strings in `.env` are correct:
- `DATABASE_PRIMARY_URL` - Direct connection for migrations
- `DATABASE_SESSION_POOLER` - Pooled connection for app queries

## Health Endpoints

- `GET /health` - Basic health check
- `GET /health/pools` - Connection pool status
- `GET /health/db` - Database connection test

## API Documentation

OpenAPI documentation available at:
- Development: `http://localhost:8080/` (Scalar UI)
- Spec: `http://localhost:8080/openapi`

---

*This documentation was generated for the self-hosted fork of Midday. For the full product documentation, visit [midday.ai/docs](https://midday.ai/docs)*
