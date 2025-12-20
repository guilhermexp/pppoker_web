<p align="center">
	<h1 align="center"><b>Mid Poker</b></h1>
<p align="center">
    Plataforma de Gestão Financeira para Poker
    <br />
    <br />
    <a href="https://mid.poker">Website</a>
    ·
    <a href="https://app.mid.poker">Dashboard</a>
    ·
    <a href="https://docs.mid.poker">Docs</a>
  </p>
</p>

## Sobre o Mid Poker

Mid Poker é uma plataforma completa de gestão financeira projetada especificamente para jogadores de poker. Integra diversas funcionalidades em um único sistema coeso, permitindo controle total sobre bankroll, sessões e análises financeiras.

## Funcionalidades

**Rastreamento de Sessões**: Controle em tempo real das sessões de poker com análises detalhadas de performance e rentabilidade.

**Gestão de Bankroll**: Acompanhamento completo do bankroll com métricas, gráficos e alertas de gestão de risco.

**Faturamento**: Criação de faturas web-based para patrocínios, stakes e acordos financeiros.

**Magic Inbox**: Correspondência automática de recibos e comprovantes com transações, simplificando o controle financeiro.

**Vault**: Armazenamento seguro para documentos importantes como contratos e acordos de stake.

**Exportação**: Exportação fácil de dados financeiros em CSV para contabilidade e declaração de impostos.

**Assistente IA**: Insights personalizados sobre situação financeira, padrões de gastos e análise de performance.

## Stack Tecnológica

### Arquitetura
- Monorepo com Turborepo
- Bun (runtime e package manager)
- React 19 + TypeScript
- Next.js 16 (com Turbopack)
- Supabase (database, auth, storage)
- Shadcn/ui + TailwindCSS

### Hospedagem
- Supabase (database, storage, realtime, auth)
- Vercel (Dashboard)
- API própria (tRPC + Hono)

### Serviços
- Trigger.dev (background jobs)
- Resend (emails transacionais)
- GitHub Actions (CI/CD)
- GoCardless (conexão bancária EU)
- Plaid (conexão bancária US/CA)
- OpenAI + Mistral + Gemini (IA)

## Estrutura do Projeto

```
apps/
├── api          # Backend tRPC + Hono
├── dashboard    # Aplicação principal Next.js
├── docs         # Documentação (Mintlify)

packages/
├── db           # Schema e queries (Drizzle)
├── email        # Templates de email (React Email)
├── invoice      # Geração de faturas PDF
├── jobs         # Background jobs (Trigger.dev)
├── supabase     # Cliente e middleware Supabase
├── ui           # Componentes UI (Shadcn)
├── utils        # Utilitários compartilhados
```

## Desenvolvimento Local

### Pré-requisitos
- [Bun](https://bun.sh/) >= 1.0
- [Node.js](https://nodejs.org/) >= 20
- Conta [Supabase](https://supabase.com/)

### Setup

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/mid.git
cd mid

# Instale as dependências
bun install

# Configure as variáveis de ambiente
cp .env.example .env.local

# Inicie o desenvolvimento
bun run dev
```

O dashboard estará disponível em `http://localhost:9000` e a API em `http://localhost:8080`.

## Mudanças Recentes

### Versão Atual (Dezembro 2024)
- Migração para Next.js 16 com `proxy.ts` (substituindo `middleware.ts`)
- Atualização do pdfjs-dist para v5.4.296
- Tabela `activities` para sistema de notificações
- Internacionalização completa (EN/PT)
- Sistema de multi-agentes IA (OpenAI gpt-4o-mini)
- Rebranding completo para Mid Poker

### Independência do Upstream
Este projeto é um fork independente, com as seguintes customizações:
- Domínio próprio (mid.poker)
- Branding personalizado
- Remoção de analytics de terceiros
- Configurações próprias de email e integrações

## Licença

Este projeto é baseado em código open-source. Consulte o arquivo LICENSE para mais detalhes.

## Contato

- Email: contato@mid.poker
- Website: https://mid.poker
