# Mid Poker - Data Model

Este documento descreve o modelo de dados completo da aplicação Mid Poker.

## Visão Geral

O sistema é uma plataforma de gestão financeira empresarial com as seguintes funcionalidades principais:

- **Gestão Financeira**: Contas bancárias, transações, categorização automática
- **Faturamento**: Invoices, clientes, produtos
- **Documentos**: Upload, processamento e classificação de documentos
- **Time Tracking**: Projetos, entradas de tempo, relatórios
- **Inbox Inteligente**: Recebimento e matching automático de notas fiscais
- **Multi-tenancy**: Suporte a múltiplas empresas/times
- **OAuth Provider**: Sistema completo de autenticação para apps terceiros

---

## Diagrama de Entidade-Relacionamento

### Core: Usuários e Times

```mermaid
erDiagram
    auth_users ||--o| users : "extends"
    users ||--o{ users_on_team : "belongs to"
    teams ||--o{ users_on_team : "has"
    teams ||--o{ user_invites : "has"
    users ||--o{ user_invites : "invited by"

    auth_users {
        uuid id PK
        varchar email UK
        varchar encrypted_password
        jsonb raw_user_meta_data
        timestamp created_at
    }

    users {
        uuid id PK,FK
        text full_name
        text email
        text avatar_url
        uuid team_id FK
        text locale
        boolean week_starts_on_monday
        text timezone
        numeric time_format
    }

    teams {
        uuid id PK
        text name
        text logo_url
        text inbox_id UK
        text email
        text base_currency
        text country_code
        smallint fiscal_year_start_month
        plans_enum plan
        jsonb export_settings
    }

    users_on_team {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        teamRoles_enum role
    }

    user_invites {
        uuid id PK
        uuid team_id FK
        text email
        text code UK
        uuid invited_by FK
        teamRoles_enum role
    }
```

### Financeiro: Contas e Transações

```mermaid
erDiagram
    teams ||--o{ bank_connections : "has"
    bank_connections ||--o{ bank_accounts : "has"
    teams ||--o{ bank_accounts : "has"
    bank_accounts ||--o{ transactions : "has"
    teams ||--o{ transactions : "has"
    users ||--o{ transactions : "assigned to"
    transaction_categories ||--o{ transactions : "categorizes"
    teams ||--o{ transaction_categories : "has"

    bank_connections {
        uuid id PK
        text institution_id
        text name
        text logo_url
        text access_token
        bank_providers_enum provider
        connection_status_enum status
        timestamp expires_at
    }

    bank_accounts {
        uuid id PK
        uuid bank_connection_id FK
        uuid team_id FK
        text name
        text currency
        numeric balance
        account_type_enum type
        boolean enabled
        boolean manual
    }

    transactions {
        uuid id PK
        uuid bank_account_id FK
        uuid team_id FK
        uuid assigned_id FK
        text category_slug FK
        date date
        text name
        numeric amount
        text currency
        transactionMethods_enum method
        transactionStatus_enum status
        text note
        boolean recurring
        transaction_frequency_enum frequency
        tsvector fts_vector
    }

    transaction_categories {
        uuid id
        text slug PK
        uuid team_id PK,FK
        text name
        text color
        boolean system
        numeric tax_rate
        uuid parent_id FK
    }
```

### Faturamento: Invoices e Clientes

```mermaid
erDiagram
    teams ||--o{ customers : "has"
    teams ||--o{ invoices : "has"
    customers ||--o{ invoices : "has"
    users ||--o{ invoices : "created by"
    teams ||--o| invoice_templates : "has"
    teams ||--o{ invoice_products : "has"

    customers {
        uuid id PK
        uuid team_id FK
        text name
        text email
        text billing_email
        text phone
        text website
        text vat_number
        text address_line_1
        text city
        text state
        text zip
        text country_code
        tsvector fts
    }

    invoices {
        uuid id PK
        uuid team_id FK
        uuid customer_id FK
        uuid user_id FK
        text invoice_number
        timestamp issue_date
        timestamp due_date
        numeric amount
        numeric subtotal
        numeric tax
        numeric vat
        numeric discount
        text currency
        invoice_status_enum status
        jsonb line_items
        jsonb customer_details
        jsonb payment_details
        timestamp paid_at
        timestamp sent_at
        tsvector fts
    }

    invoice_templates {
        uuid id PK
        uuid team_id FK,UK
        text logo_url
        text currency
        jsonb payment_details
        jsonb from_details
        invoice_size_enum size
        invoice_delivery_type_enum delivery_type
        boolean include_vat
        boolean include_tax
    }

    invoice_products {
        uuid id PK
        uuid team_id FK
        text name
        text description
        numeric price
        text currency
        text unit
        integer usage_count
    }
```

### Documentos e Inbox

```mermaid
erDiagram
    teams ||--o{ documents : "has"
    teams ||--o{ document_tags : "has"
    documents ||--o{ document_tag_assignments : "has"
    document_tags ||--o{ document_tag_assignments : "has"
    teams ||--o{ inbox : "has"
    teams ||--o{ inbox_accounts : "has"
    inbox ||--o| transactions : "matches"
    inbox ||--o| transaction_attachments : "creates"

    documents {
        uuid id PK
        uuid team_id FK
        uuid owner_id FK
        text name
        text title
        text body
        text content
        text summary
        date date
        jsonb metadata
        document_processing_status_enum processing_status
        tsvector fts
    }

    document_tags {
        uuid id PK
        uuid team_id FK
        text name
        text slug UK
    }

    inbox {
        uuid id PK
        uuid team_id FK
        uuid transaction_id FK
        uuid attachment_id FK
        text file_name
        numeric amount
        text currency
        date date
        inbox_status_enum status
        inbox_type_enum type
        text display_name
        tsvector fts
    }

    inbox_accounts {
        uuid id PK
        uuid team_id FK
        text email UK
        text external_id UK
        inbox_account_providers_enum provider
        inbox_account_status_enum status
    }
```

### Time Tracking

```mermaid
erDiagram
    teams ||--o{ tracker_projects : "has"
    customers ||--o{ tracker_projects : "associated with"
    tracker_projects ||--o{ tracker_entries : "has"
    users ||--o{ tracker_entries : "assigned to"
    tracker_projects ||--o{ tracker_reports : "has"
    tracker_projects ||--o{ tracker_project_tags : "has"
    tags ||--o{ tracker_project_tags : "has"

    tracker_projects {
        uuid id PK
        uuid team_id FK
        uuid customer_id FK
        text name
        text description
        numeric rate
        text currency
        bigint estimate
        boolean billable
        trackerStatus_enum status
    }

    tracker_entries {
        uuid id PK
        uuid project_id FK
        uuid team_id FK
        uuid assigned_id FK
        date date
        timestamp start
        timestamp stop
        bigint duration
        text description
        numeric rate
        boolean billed
    }

    tracker_reports {
        uuid id PK
        uuid team_id FK
        uuid project_id FK
        uuid created_by FK
        text link_id
        text short_link
    }
```

### OAuth e Integrações

```mermaid
erDiagram
    teams ||--o{ oauth_applications : "owns"
    users ||--o{ oauth_applications : "created by"
    oauth_applications ||--o{ oauth_authorization_codes : "has"
    oauth_applications ||--o{ oauth_access_tokens : "has"
    users ||--o{ oauth_access_tokens : "has"
    teams ||--o{ apps : "has"
    teams ||--o{ api_keys : "has"

    oauth_applications {
        uuid id PK
        uuid team_id FK
        uuid created_by FK
        text name
        text slug UK
        text client_id UK
        text client_secret
        text[] redirect_uris
        text[] scopes
        boolean is_public
        text status
    }

    oauth_access_tokens {
        uuid id PK
        uuid application_id FK
        uuid user_id FK
        uuid team_id FK
        text token UK
        text refresh_token UK
        text[] scopes
        timestamp expires_at
        boolean revoked
    }

    api_keys {
        uuid id PK
        uuid user_id FK
        uuid team_id FK
        text name
        text key_hash UK
        text[] scopes
        timestamp last_used_at
    }

    apps {
        uuid id PK
        uuid team_id FK
        uuid created_by FK
        text app_id
        jsonb config
        jsonb settings
    }
```

### AI & Embeddings

```mermaid
erDiagram
    transactions ||--o| transaction_embeddings : "has"
    inbox ||--o| inbox_embeddings : "has"
    inbox ||--o{ transaction_match_suggestions : "has"
    transactions ||--o{ transaction_match_suggestions : "suggested for"

    transaction_embeddings {
        uuid id PK
        uuid transaction_id FK,UK
        uuid team_id FK
        vector_768 embedding
        text source_text
        text model
    }

    inbox_embeddings {
        uuid id PK
        uuid inbox_id FK,UK
        uuid team_id FK
        vector_768 embedding
        text source_text
        text model
    }

    transaction_match_suggestions {
        uuid id PK
        uuid team_id FK
        uuid inbox_id FK
        uuid transaction_id FK
        numeric confidence_score
        numeric amount_score
        numeric embedding_score
        text match_type
        jsonb match_details
        text status
    }

    transaction_category_embeddings {
        text name PK
        vector_768 embedding
        boolean system
        text model
    }

    document_tag_embeddings {
        text slug PK
        vector_768 embedding
        text name
        text model
    }
```

---

## Enums

### Tipos de Conta
```sql
CREATE TYPE account_type AS ENUM (
  'depository',    -- Conta corrente/poupança
  'credit',        -- Cartão de crédito
  'other_asset',   -- Outros ativos
  'loan',          -- Empréstimos
  'other_liability' -- Outras obrigações
);
```

### Provedores Bancários
```sql
CREATE TYPE bank_providers AS ENUM (
  'gocardless',    -- Open Banking EU
  'plaid',         -- Open Banking US
  'teller',        -- Banking API US
  'enablebanking'  -- Open Banking EU
);
```

### Status de Conexão
```sql
CREATE TYPE connection_status AS ENUM (
  'connected',
  'disconnected',
  'unknown'
);
```

### Métodos de Transação
```sql
CREATE TYPE transactionMethods AS ENUM (
  'payment',
  'card_purchase',
  'card_atm',
  'transfer',
  'ach',
  'wire',
  'interest',
  'deposit',
  'fee',
  'other',
  'unknown'
);
```

### Status de Transação
```sql
CREATE TYPE transactionStatus AS ENUM (
  'posted',    -- Confirmada
  'pending',   -- Pendente
  'excluded',  -- Excluída dos relatórios
  'completed', -- Completa
  'archived'   -- Arquivada
);
```

### Frequência de Transação
```sql
CREATE TYPE transaction_frequency AS ENUM (
  'weekly',
  'biweekly',
  'monthly',
  'semi_monthly',
  'annually',
  'irregular',
  'unknown'
);
```

### Status de Invoice
```sql
CREATE TYPE invoice_status AS ENUM (
  'draft',     -- Rascunho
  'unpaid',    -- Não paga
  'paid',      -- Paga
  'overdue',   -- Vencida
  'canceled',  -- Cancelada
  'scheduled'  -- Agendada
);
```

### Tipo de Entrega de Invoice
```sql
CREATE TYPE invoice_delivery_type AS ENUM (
  'create',          -- Apenas criar
  'create_and_send', -- Criar e enviar
  'scheduled'        -- Envio agendado
);
```

### Status do Inbox
```sql
CREATE TYPE inbox_status AS ENUM (
  'new',              -- Novo item
  'processing',       -- Processando
  'pending',          -- Aguardando ação
  'analyzing',        -- Analisando com AI
  'suggested_match',  -- Match sugerido
  'no_match',         -- Sem match encontrado
  'done',             -- Processado
  'archived',         -- Arquivado
  'deleted'           -- Deletado
);
```

### Tipo de Inbox
```sql
CREATE TYPE inbox_type AS ENUM (
  'invoice',  -- Nota fiscal
  'expense'   -- Comprovante de despesa
);
```

### Status de Processamento de Documento
```sql
CREATE TYPE document_processing_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed'
);
```

### Tipos de Atividade
```sql
CREATE TYPE activity_type AS ENUM (
  -- Transações
  'transactions_enriched',
  'transactions_created',
  'transactions_categorized',
  'transactions_assigned',
  'transactions_exported',
  'transaction_attachment_created',
  'transaction_category_created',

  -- Inbox
  'inbox_new',
  'inbox_auto_matched',
  'inbox_needs_review',
  'inbox_cross_currency_matched',
  'inbox_match_confirmed',

  -- Invoices
  'invoice_created',
  'invoice_sent',
  'invoice_paid',
  'invoice_overdue',
  'invoice_duplicated',
  'invoice_scheduled',
  'invoice_reminder_sent',
  'invoice_cancelled',
  'draft_invoice_created',

  -- Documentos
  'document_uploaded',
  'document_processed',

  -- Tracker
  'tracker_entry_created',
  'tracker_project_created',

  -- Clientes
  'customer_created'
);
```

### Planos
```sql
CREATE TYPE plans AS ENUM (
  'trial',   -- Período de teste
  'starter', -- Plano inicial
  'pro'      -- Plano profissional
);
```

### Roles de Time
```sql
CREATE TYPE teamRoles AS ENUM (
  'owner',  -- Proprietário
  'member'  -- Membro
);
```

---

## Índices Importantes

### Full-Text Search
```sql
-- Transações
CREATE INDEX idx_transactions_fts ON transactions USING GIN(fts_vector);

-- Invoices
CREATE INDEX idx_invoices_fts ON invoices USING GIN(fts);

-- Clientes
CREATE INDEX idx_customers_fts ON customers USING GIN(fts);

-- Documentos
CREATE INDEX idx_documents_fts ON documents USING GIN(fts);

-- Inbox
CREATE INDEX idx_inbox_fts ON inbox USING GIN(fts);
```

### Vector Similarity (pgvector)
```sql
-- Embeddings de transações
CREATE INDEX idx_transaction_embeddings_vector
  ON transaction_embeddings
  USING hnsw(embedding vector_cosine_ops);

-- Embeddings de inbox
CREATE INDEX idx_inbox_embeddings_vector
  ON inbox_embeddings
  USING hnsw(embedding vector_cosine_ops);

-- Embeddings de categorias
CREATE INDEX idx_category_embeddings_vector
  ON transaction_category_embeddings
  USING hnsw(embedding vector_cosine_ops);
```

### Performance
```sql
-- Transações por data
CREATE INDEX idx_transactions_team_date
  ON transactions(team_id, date DESC);

-- Transações por nome (busca)
CREATE INDEX idx_transactions_team_name
  ON transactions(team_id, name);

-- Activities (notificações)
CREATE INDEX idx_activities_notifications
  ON activities(team_id, priority, status, created_at DESC);
```

---

## Row-Level Security (RLS)

Todas as tabelas implementam políticas de segurança a nível de linha:

```sql
-- Exemplo: Política para transações
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions from their team"
  ON transactions FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM users_on_team
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert transactions to their team"
  ON transactions FOR INSERT
  WITH CHECK (
    team_id IN (
      SELECT team_id FROM users_on_team
      WHERE user_id = auth.uid()
    )
  );
```

---

## Relacionamentos Chave

| Tabela Pai | Tabela Filha | Tipo | ON DELETE |
|------------|--------------|------|-----------|
| teams | bank_connections | 1:N | CASCADE |
| bank_connections | bank_accounts | 1:N | SET NULL |
| bank_accounts | transactions | 1:N | SET NULL |
| teams | transaction_categories | 1:N | CASCADE |
| transaction_categories | transactions | 1:N | SET NULL |
| teams | customers | 1:N | CASCADE |
| customers | invoices | 1:N | SET NULL |
| teams | tracker_projects | 1:N | CASCADE |
| tracker_projects | tracker_entries | 1:N | CASCADE |
| teams | documents | 1:N | CASCADE |
| inbox | transactions | N:1 | SET NULL |
| oauth_applications | oauth_access_tokens | 1:N | CASCADE |

---

## Estatísticas do Schema

| Métrica | Valor |
|---------|-------|
| Total de Tabelas | 43 |
| Enums | 18 |
| Tabelas com FTS | 6 |
| Tabelas com Embeddings | 5 |
| Índices Vetoriais | 5 |

---

## Considerações de Performance

1. **Particionamento**: Considerar particionar `transactions` por `team_id` e `date` para grandes volumes
2. **Archiving**: Transações antigas podem ser movidas para tabela de arquivo
3. **Embeddings**: Usar índices HNSW para busca vetorial eficiente
4. **FTS**: Todos os campos de busca usam `tsvector` com índices GIN
5. **Conexões**: Pool de conexões via Supabase/pgBouncer

---

*Última atualização: Dezembro 2024*
