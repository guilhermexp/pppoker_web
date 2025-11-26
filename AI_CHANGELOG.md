# AI Changelog - Midday Setup & Customization

## Data: 23-24 de Novembro de 2025

Este documento registra todas as alteracoes realizadas no projeto Midday durante a sessao de configuracao e customizacao com assistencia de IA.

---

## 1. Configuracao Inicial do Ambiente

### Arquivos de Ambiente Criados/Configurados

#### `apps/dashboard/.env.local`
- Configuracao completa do Supabase (URL, Anon Key, Service Key, ID)
- Conexoes de banco de dados (PRIMARY, FRA, SJC, IAD)
- Upstash Redis (REST URL e Token)
- Resend API Key
- Engine API (URL e Key)
- Webhook Secret Key
- Invoice JWT Secret
- Polar (sandbox)

#### `apps/api/.env.local`
- Resend API Key
- Supabase (JWT Secret, Service Key, URL)
- Conexoes de banco de dados (todas as regioes)
- Engine API
- Config (ALLOWED_API_ORIGINS, LOG_LEVEL, etc.)
- Redis URL
- Environment: development

### Credenciais Configuradas
- **Supabase Project**: jehlwreuxxjbewzpvuvu
- **Database Region**: aws-1-sa-east-1 (Sao Paulo)
- **Redis**: Upstash (novel-drum-40734)

---

## 2. Correcoes de Conexao com Banco de Dados

### Problema
Conexao inicial usava formato incorreto de URL (Direct Connection em vez de Session Pooler).

### Solucao
Alterado de:
```
postgres:password@db.xxx.supabase.co
```

Para (Session Pooler):
```
postgresql://postgres.jehlwreuxxjbewzpvuvu:[PASSWORD]@aws-1-sa-east-1.pooler.supabase.com:5432/postgres
```

### Variaveis Atualizadas
- DATABASE_PRIMARY_URL
- DATABASE_FRA_URL
- DATABASE_SJC_URL
- DATABASE_IAD_URL
- DATABASE_PRIMARY_POOLER_URL
- DATABASE_SESSION_POOLER

---

## 3. Funcoes PostgreSQL Criadas

### Arquivo: `packages/db/setup-functions.sql`

#### Extensoes Habilitadas
- uuid-ossp
- vector (pgvector)
- pg_trgm

#### Schema Privado
- Criado schema `private` com permissoes apropriadas

#### Funcoes Criadas

**Funcao RLS Critica:**
```sql
private.get_teams_for_authenticated_user()
```

**Funcoes Publicas:**
- `public.extract_product_names(json)` - Extrai nomes de produtos para FTS
- `public.generate_inbox_fts(text, text)` - Gera vetor FTS para inbox
- `public.generate_inbox(int)` - Gera ID aleatorio para inbox
- `public.nanoid(int)` - Funcao estilo nanoid para codigos

#### Funcoes Stub de Analytics (28+ funcoes)
Criadas como stubs retornando valores vazios/default:
- get_revenue_v2, get_revenue_v3
- get_profit_v2, get_profit_v3, get_profit_v4
- get_burn_rate_v2, get_burn_rate_v3, get_burn_rate_v4
- get_total_balance, get_total_balance_v2, get_total_balance_v3
- get_team_bank_accounts_balances
- get_expenses, get_spending_v2, get_spending_v3, get_spending_v4
- get_runway_v2, get_runway_v3, get_runway_v4
- global_search, global_semantic_search
- get_next_invoice_number
- E outras...

---

## 4. Configuracao de Autenticacao

### Problema Inicial
Magic link causava loop infinito (usuario clicava no link do email e voltava para pagina de login).

### Solucao
Configurado GitHub OAuth no Supabase:
- **Client ID**: Ov23liroeLBhzJqboaDo
- **Client Secret**: Configurado no Supabase
- **Callback URL**: `https://jehlwreuxxjbewzpvuvu.supabase.co/auth/v1/callback`

---

## 5. Dados de Usuario Criados

### Usuario
- **ID**: 145e66ee-bf64-4582-8722-370616db21d3
- **Email**: guilherme-varela@hotmail.com
- **Locale**: pt-PT
- **Team ID**: 00000000-0000-0000-0000-000000000001

### Tabela users_on_team
Criada manualmente com estrutura:
- id (uuid)
- user_id (uuid)
- team_id (uuid)
- role (owner/member)
- created_at

---

## 6. Suporte a Idioma Portugues

### Arquivos de Traducao

#### Criados/Atualizados
- `apps/dashboard/src/locales/pt.ts` - 79+ novas chaves de traducao
- `apps/dashboard/src/locales/en.ts` - Chaves correspondentes em ingles

#### Configuracao i18n
- `apps/dashboard/src/middleware.ts` - Adicionado "pt" em locales
- `apps/dashboard/src/locales/client.ts` - Import do pt.ts
- `apps/dashboard/src/locales/server.ts` - Import do pt.ts

### Componente de Selecao de Idioma
Criado: `apps/dashboard/src/components/language-settings.tsx`
- Permite trocar idioma via UI
- Adicionado na pagina Account > Date & Locale

### Componentes Atualizados para i18n (11 arquivos)
1. `main-menu.tsx` - Navegacao do sidebar
2. `widgets/header.tsx` - Saudacoes e mensagens
3. `widgets/customize.tsx` - Botoes Personalizar/Salvar
4. `widgets/runway.tsx` - Widget Cash Runway
5. `widgets/cash-flow.tsx` - Widget Cash Flow
6. `widgets/account-balances.tsx` - Widget Account Balances
7. `widgets/profit-analysis.tsx` - Widget Profit & Loss
8. `widgets/revenue-forecast.tsx` - Widget Forecast
9. `widgets/revenue-summary.tsx` - Widget Revenue Summary
10. `widgets/growth-rate.tsx` - Widget Growth Rate
11. `widgets/customer-lifetime-value.tsx` - Widget CLV

### Traducoes Adicionadas

**Sidebar (22 chaves):**
- Visao Geral, Transacoes, Caixa de Entrada, Faturas
- Rastreador, Clientes, Cofre, Aplicativos, Configuracoes
- Categorias, Conectar banco, Importar, Criar novo
- Produtos, Todos, Instalados, Geral, Cobranca
- Conexoes Bancarias, Membros, Notificacoes, Desenvolvedor

**Dashboard (7 chaves):**
- Saudacoes: Bom dia, Boa tarde, Boa noite
- Mensagens do dashboard
- Personalizar, Salvar

**Titulos de Widgets (8 chaves):**
- Fluxo de Caixa, Saldo das Contas, Lucros e Perdas
- Previsao, Resumo de Receita, Taxa de Crescimento
- Valor Vitalicio do Cliente

**Descricoes de Widgets (16 chaves):**
- Seu fluxo de caixa em meses
- Posicao liquida de caixa
- Nenhuma conta conectada
- Seu lucro liquido medio
- Projecao de receita
- E outras...

**Acoes de Widgets (8 chaves):**
- Ver fluxo, Ver analise de fluxo de caixa
- Ver saldo das contas, Ver analise detalhada
- Ver detalhes da previsao, Ver tendencias de receita
- Ver analise de crescimento, Ver todos os clientes

---

## 7. Apps Removidos

Os seguintes apps foram removidos do monorepo por nao serem necessarios:

- `apps/desktop` - App desktop (Tauri)
- `apps/engine` - Engine (Cloudflare Worker)
- `apps/website` - Site institucional

### Estrutura Final de Apps
```
apps/
  api/        - API backend (Hono)
  dashboard/  - Dashboard web (Next.js)
  docs/       - Documentacao
```

---

## 8. Como Acessar em Portugues

### Opcao 1 - URL Direta
Acesse: `http://localhost:3001/pt/`

### Opcao 2 - Configuracoes
1. Va em Account > Date & Locale
2. No seletor "Idiomas", escolha "Portugues"

---

## 9. Comandos para Rodar o Projeto

```bash
# Instalar dependencias
bun install

# Rodar em desenvolvimento
bun run dev

# Ou rodar apps separadamente
bun run dev:dashboard  # porta 3001
bun run dev:api        # porta 3003
```

---

## 10. Alteracao de Portas

### Configuracao
- **Dashboard**: Alterado de 3001 para **9000**
- **API**: Alterado de 3003 para **8080**

### Arquivos Modificados
- `apps/dashboard/package.json` - porta 9000
- `apps/api/package.json` - porta 8080
- `apps/dashboard/.env.local` - NEXT_PUBLIC_URL e NEXT_PUBLIC_API_URL
- `apps/api/.env.local` - ALLOWED_API_ORIGINS e MIDDAY_DASHBOARD_URL

---

## 11. Correcoes de Erros 500 no tRPC

### Funcoes SQL Faltando
Adicionadas em `packages/db/setup-functions.sql`:

```sql
-- Funcoes para tracker_projects
CREATE OR REPLACE FUNCTION public.total_duration(project tracker_projects)
CREATE OR REPLACE FUNCTION public.get_project_total_amount(project tracker_projects)
CREATE OR REPLACE FUNCTION public.get_assigned_users_for_project(project tracker_projects)
```

### Colunas Renomeadas (CamelCase -> snake_case)
O Drizzle usa `casing: "snake_case"` mas algumas colunas estavam em camelCase:

```sql
ALTER TABLE invoice_products RENAME COLUMN "isActive" TO is_active;
ALTER TABLE bank_accounts RENAME COLUMN "baseBalance" TO base_balance;
ALTER TABLE customers RENAME COLUMN "billingEmail" TO billing_email;
ALTER TABLE transactions RENAME COLUMN "baseAmount" TO base_amount;
```

### Schema de Busca Corrigido
- `apps/api/src/schemas/search.ts` - Removido `.uuid()` de transactionId (usa nanoid)

---

## 12. Remocao de Bloqueios de Integracao Bancaria

### Problema
O app original exigia conexao com provedores bancarios (Plaid, GoCardless, etc.) para funcionar.

### Solucao
Criado fluxo de contas manuais para permitir uso sem integracao bancaria.

### Componentes Criados/Modificados

#### Novo Modal de Criar Conta
`apps/dashboard/src/components/modals/create-bank-account-modal.tsx`
- Formulario com nome e moeda
- Moedas: BRL, USD, EUR, GBP
- Abre automaticamente sheet de criar transacao apos sucesso

#### ConnectBankMessage Atualizado
`apps/dashboard/src/components/chat/connect-bank-message.tsx`
- Mudou de `step="connect"` para `createAccount: true`
- Permite criar conta manual em vez de forcar integracao

#### Empty States Atualizados
`apps/dashboard/src/components/tables/transactions/empty-states.tsx`
- Traduzido para portugues
- Usa AddAccountButton para criar conta manual

#### AddTransactions Atualizado
`apps/dashboard/src/components/add-transactions.tsx`
- Opcao "Criar conta" abre modal de conta manual
- Traduzido para portugues

#### AddAccountButton Criado
`apps/dashboard/src/components/add-account-button.tsx`
- Botao reutilizavel para abrir modal de criar conta

#### GlobalSheets Atualizado
`apps/dashboard/src/components/sheets/global-sheets.tsx`
- Adicionado CreateBankAccountModal

---

## 13. Traducoes Adicionais (Sessao 24/11)

### Vault (Cofre)
- no_results, no_results_description, clear_filters
- Titulo, placeholder de busca, tipos de arquivo

### Customers (Clientes)
- no_active_client, most_active_client, inactive_clients
- no_revenue_client, top_revenue_client, new_customers
- search_customers, create_customer
- Metricas e contagens

### Chat (Assistente AI)
- create_account_title, create_account_description
- 40+ comandos de sugestao traduzidos:
  - /mostrar ultimas transacoes
  - /mostrar queima de caixa
  - /mostrar fluxo de caixa
  - /encontrar transacoes sem tag
  - /analisar padroes de gastos
  - E muitos outros...

### Search (Busca)
- find_anything: "Buscar qualquer coisa..."

### Trial
- pro_trial: "Teste Pro - {days} {dayText} restantes"

### Bank Account (Conta Bancaria)
- create_title, name_label, name_placeholder, name_description
- currency_label, currency_placeholder, currency_description
- create_button, add_account

### Transactions (Transacoes)
- no_transactions, no_transactions_description
- no_results, no_results_description, clear_filters

### Transaction Create (Criar Transacao)
- title, expense, income, type_description
- description_label, description_placeholder, description_helper
- amount_label, amount_placeholder, amount_helper
- currency_label, currency_helper
- account_label, account_placeholder, account_helper
- date_label, date_placeholder, date_helper
- category_label, category_helper
- assign_label, assign_helper
- attachment, attachment_description
- exclude_analytics, exclude_analytics_description
- note, note_description, note_placeholder
- create_button

### Chat Store Traduzido
`apps/dashboard/src/store/chat.ts`
- Todas as 40+ sugestoes de comandos traduzidas para portugues
- Comandos alterados de /show, /find, /analyze para /mostrar, /encontrar, /analisar

---

## 14. Formulario de Criar Transacao Traduzido

### Arquivos Modificados
- `apps/dashboard/src/components/forms/transaction-create-form.tsx`
- `apps/dashboard/src/components/sheets/transaction-create-sheet.tsx`

### Campos Traduzidos
- Tipo (Despesa/Receita)
- Descricao
- Valor
- Moeda
- Conta
- Data
- Categoria
- Atribuir
- Anexo
- Excluir das analises
- Nota
- Botao Criar

---

## 15. Fluxo Completo de Uso

### Criar Conta Bancaria Manual
1. Ir em Transacoes
2. Clicar em "Adicionar conta"
3. Preencher nome e moeda
4. Clicar em "Criar"
5. Sheet de criar transacao abre automaticamente

### Adicionar Transacao
1. Preencher descricao
2. Informar valor (positivo ou negativo conforme tipo)
3. Selecionar conta, data, categoria
4. Opcionalmente: anexar comprovante, adicionar nota
5. Clicar em "Criar"

---

## 16. Proximos Passos Recomendados

1. **Implementar funcoes de analytics reais** - Substituir stubs por queries reais
2. **Configurar Trigger.dev** - Para jobs em background
3. **Configurar Polar** - Para billing/subscriptions
4. **Importacao de transacoes** - CSV/OFX para importar historico
5. **Relatorios** - Exportar dados em PDF/Excel

---

## Notas Tecnicas

- **Stack**: Next.js 16, Hono, tRPC, Drizzle ORM, Supabase, Bun
- **Database**: PostgreSQL via Supabase (Session Pooler)
- **i18n**: next-international
- **Auth**: Supabase Auth com GitHub OAuth
- **Portas**: Dashboard (9000), API (8080)

---

## Erros Conhecidos (Nao Bloqueantes)

### Error in getInboxSearch
- Aparece no console da API
- Causa: Funcionalidade de AI matching que usa embeddings
- Impacto: Nenhum - funcionalidade avancada nao configurada
- Solucao: Ignorar ou configurar tabelas de embeddings

### SSR QueryClient Error
- Aparece no console do navegador
- Causa: Hidratacao SSR com React Query
- Impacto: Nenhum - app recupera no cliente
- Solucao: Nao requer acao

---

*Changelog atualizado por Claude Code em 24/11/2025 - 05:00*
\n+---
\n+## 17. Limpeza e Remoções Seguras para Self-Hosting (24/11/2025)
\n+### Objetivo
- Remover componentes não essenciais para uso pessoal/self-hosted, mantendo funcionamento completo do dashboard e da API.
\n+### Itens Removidos
- Cliente Desktop (`packages/desktop-client`) e todos os usos no dashboard.
- Módulo de Events/Analytics (`packages/events`) e instrumentações associadas.
- Sentry no dashboard (configs, imports, wrappers e instrumentação).
- Billing/Polar no dashboard e na API (rotas, utils, router e dependências).
\n+### Dependências Removidas
- Dashboard: `@midday/desktop-client`, `@midday/events`, `@sentry/nextjs`, `@polar-sh/checkout`, `@polar-sh/nextjs`, `@polar-sh/sdk`.
- API: `@polar-sh/sdk`.
\n+### Arquivos Removidos
- `midday/packages/desktop-client/`
- `midday/packages/events/`
- `midday/apps/dashboard/sentry.server.config.ts`
- `midday/apps/dashboard/sentry.edge.config.ts`
- `midday/apps/dashboard/src/utils/polar.ts`
- `midday/apps/dashboard/src/utils/plans.ts`
- `midday/apps/dashboard/src/app/api/checkout/route.ts`
- `midday/apps/dashboard/src/app/api/portal/route.ts`
- `midday/apps/dashboard/src/app/api/webhook/polar/route.ts`
- `midday/apps/dashboard/src/app/[locale]/(app)/(sidebar)/settings/billing/page.tsx`
- `midday/apps/dashboard/src/app/[locale]/(app)/(sidebar)/upgrade/page.tsx`
- `midday/apps/dashboard/src/components/plans.tsx`
- `midday/apps/api/src/utils/polar.ts`
- `midday/apps/api/src/schemas/polar.ts`
- `midday/apps/api/src/trpc/routers/billing.ts`
\n+### Principais Arquivos Editados
- `apps/dashboard/package.json` (remoção de dependências desktop/events/polar/sentry).
- `apps/dashboard/tailwind.config.ts` (remove plugin do desktop; `plugins: []`).
- `apps/dashboard/next.config.ts` (remove `withSentryConfig`; exporta `config` direto).
- `apps/dashboard/src/instrumentation.ts` e `instrumentation-client.ts` (no-op).
- `apps/dashboard/src/app/[locale]/layout.tsx` (remove Provider de analytics).
- `apps/dashboard/src/actions/safe-action.ts` (remove `setupAnalytics` e tracking em metadados).
- `apps/dashboard/src/app/api/auth/callback/route.ts`, `webhook/registered/route.ts`, `webhook/inbox/route.ts` (remove tracking).
- Componentes ajustados para web-only:
  - `src/components/open-url.tsx`, `desktop-provider.tsx`, `desktop-header.tsx`, `desktop-traffic-light.tsx`.
  - `src/components/unified-app.tsx`, `src/components/search/search.tsx`.
  - `src/components/apple-sign-in.tsx`, `google-sign-in.tsx`, `github-sign-in.tsx`.
  - `src/lib/download.ts`.
- Billing UI ajustado para mensagem neutra:
  - `src/components/upgrade-content.tsx`, `src/components/modals/choose-plan-modal.tsx`.
- Trial gating desativado:
  - `src/utils/trial.ts` (`shouldShowUpgradeContent` retorna `false`).
- API router:
  - `apps/api/src/trpc/routers/_app.ts` (remove `billing`).
- `apps/api/package.json` (remove `@polar-sh/sdk`).
\n+### Verificação e Build
- `bun install` — sucesso (dependências removidas e instalação ok).
- `bun run build:dashboard` — sucesso (compilado com Next 16 + Turbopack).
- Busca por resíduos: nenhuma ocorrência de `@midday/events`, `@sentry/nextjs`, `@polar-sh/*` no workspace.
- `bun run typecheck` — erros não relacionados às remoções em `packages/ui` (tipos de `react-syntax-highlighter`).
\n+### Impacto Funcional
- Desktop: integração Tauri removida; comportamento web-only com `window.open` e no-ops.
- Analytics: tracking removido; erros visíveis via console.
- Sentry: sem captura automática; instrumentação no-op.
- Billing/Polar: removido; páginas/rotas substituídas por mensagens informativas; sem bloqueio por trial (gating desativado).
\n+### Próximos Passos
- Validar navegação end-to-end em dev (`bun run dev:dashboard`).
- Opcional: adicionar logger leve (p.ex. Pino) para agregação de erros.
- Se reativar billing futuramente, encapsular módulo com feature flag.
\n+---
\n+*Changelog atualizado por Claude Code em 24/11/2025 - 12:00*
