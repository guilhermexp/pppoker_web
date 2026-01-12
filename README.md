<p align="center">
	<h1 align="center"><b>Mid Poker</b></h1>
<p align="center">
    Plataforma Completa de Gestao Financeira para Clubes de Poker
    <br />
    <br />
    <a href="https://middaydashboard-production.up.railway.app">Dashboard</a>
  </p>
</p>

## O que e o Mid Poker?

Mid Poker e uma plataforma de gestao financeira projetada para **operadores de clubes PPPoker**, **agentes** e **jogadores profissionais**. O sistema centraliza o controle de jogadores, sessoes, transacoes, acertos semanais e analytics em um unico lugar.

### Problema que Resolve

Gerenciar um clube de poker envolve:
- Dezenas ou centenas de jogadores ativos
- Milhares de transacoes de fichas/credito por mes
- Agentes e super-agentes com hierarquia de comissoes
- Acertos semanais complexos com multiplos jogadores
- Importacao manual de dados do PPPoker

**Mid Poker automatiza tudo isso**, transformando planilhas Excel exportadas do PPPoker em dados estruturados, validados e prontos para analise.

---

## Para Quem e Este App?

| Perfil | O que pode fazer |
|--------|------------------|
| **Operador de Clube** | Gerenciar jogadores, importar dados, fechar acertos semanais, acompanhar rake e resultado do banco |
| **Agente** | Visualizar jogadores vinculados, comissoes, rakeback |
| **Jogador Profissional** | Controlar bankroll pessoal, sessoes, transacoes |
| **Liga/SuperUnion** | Coordenar multiplos clubes em uma estrutura hierarquica |

---

## Modulos Principais

### 1. Gestao de Poker (Clubes PPPoker)

O modulo central do sistema para operadores de clubes:

#### Jogadores e Agentes
- Cadastro completo com ID PPPoker, apelido, memorando
- Hierarquia: Jogador → Agente → Super-Agente
- Saldos em tempo real (fichas, credito, limite)
- Classificacoes: VIP, Shark, Risco
- Status: Ativo, Inativo, Suspenso, Blacklist

#### Sessoes de Jogo
- Cash Games (PPSR) e Torneios (PPST)
- Variantes: NLH, PLO4-6, 6+, AOF, OFC, Mixed
- Metricas: rake total, buy-in, cash-out, maos jogadas
- Suporte a HU (Heads Up) e mesas especiais

#### Transacoes
- Tipos: Buy-in, Cash-out, Credito, Rake, Comissao, Rakeback, Jackpot, Ajuste, Transferencia
- Rastreamento completo: remetente, destinatario, valores
- Historico com filtros avancados

#### Acertos Semanais
- Fechamento automatico de periodo
- Status: Pendente, Parcial, Concluido, Disputado
- Registro de pagamentos e metodo

#### Importacao de Dados
- Upload de planilhas Excel do PPPoker
- Validacao automatica com 12+ regras de integridade
- Preview completo antes de processar
- Suporte a clubes individuais e ligas/SuperUnions

#### Analytics
- Rake bruto por periodo
- Resultado do banco (fichas in vs out)
- Top jogadores por saldo
- Devedores (saldo negativo)
- Distribuicao por tipo de jogo
- Tendencia de rake semanal

### 2. Gestao Financeira Geral

Funcionalidades herdadas da plataforma base:

#### Transacoes Bancarias
- Conexao com bancos via Plaid (US/CA) e GoCardless (EU)
- Categorizacao automatica com IA
- Importacao de extratos CSV

#### Faturamento
- Criacao de faturas para stakes e patrocinios
- Lembretes automaticos de pagamento
- Rastreamento de status

#### Magic Inbox
- Upload de recibos e comprovantes
- Matching automatico com transacoes
- OCR e extracao de dados

#### Vault
- Armazenamento seguro de documentos
- Contratos, acordos de stake, comprovantes
- Organizacao com tags e pastas

#### Exportacao
- Relatorios em CSV para contabilidade
- Dados formatados para declaracao de impostos

### 3. Assistente IA

- Analise de performance financeira
- Insights sobre padroes de gastos
- Previsoes de fluxo de caixa
- Respostas contextuais sobre seus dados

---

## Fluxo de Trabalho Tipico

### Para Operador de Clube

```
1. IMPORTAR DADOS
   └── Upload da planilha semanal do PPPoker
   └── Validacao automatica (estrutura, IDs, valores)
   └── Preview em 10 abas: Geral, Detalhado, Partidas, etc.
   └── Aprovar e processar

2. REVISAR DADOS
   └── Dashboard com metricas do periodo
   └── Verificar novos jogadores cadastrados
   └── Analisar transacoes e sessoes

3. FECHAR ACERTOS
   └── Gerar acertos semanais automaticamente
   └── Revisar valores por jogador/agente
   └── Registrar pagamentos realizados

4. ACOMPANHAR RESULTADOS
   └── Rake total coletado
   └── Resultado do banco
   └── Jogadores com saldo negativo
   └── Performance por tipo de jogo
```

### Para Jogador Individual

```
1. CONECTAR CONTAS
   └── Vincular banco para importar transacoes
   └── Ou importar manualmente via CSV

2. REGISTRAR SESSOES
   └── Adicionar sessoes de poker jogadas
   └── Categorizar buy-ins e cash-outs

3. ANALISAR PERFORMANCE
   └── Graficos de evolucao do bankroll
   └── Lucro/prejuizo por periodo
   └── Gastos vs ganhos
```

---

## Estrutura de Dados

### Entidades Principais

```
Team (Organizacao)
├── poker_players (jogadores e agentes)
│   ├── tipo: player | agent
│   ├── hierarquia: agent_id, super_agent_id
│   └── saldos: chip_balance, credit_limit
│
├── poker_sessions (sessoes de jogo)
│   ├── tipo: cash_game | mtt | sit_n_go | spin
│   ├── totais: rake, buy_in, cash_out
│   └── poker_session_players (jogadores na sessao)
│
├── poker_chip_transactions (movimentacoes)
│   ├── tipo: buy_in | cash_out | credit | rake | ...
│   └── valores: credit, chips, amount
│
├── poker_settlements (acertos)
│   ├── status: pending | partial | completed
│   └── valores: amount, paid_amount
│
└── poker_imports (importacoes)
    ├── status: pending | validating | completed
    └── raw_data: dados originais do Excel
```

---

## Tipos de Planilha Suportados

### Planilha de Clube (7 abas)
Dados de um **unico clube** exportados do PPPoker:
- Geral (48 colunas) - Resumo por jogador
- Detalhado (137 colunas) - Breakdown por variante
- Partidas - Sessoes de jogo
- Transacoes (21 colunas) - Movimentacoes
- Detalhes do usuario (12 colunas) - Cadastro
- Retorno de taxa (7 colunas) - Rakeback
- Demonstrativo - Disclaimer (ignorado)

### Planilha de Liga (4 abas)
Dados de **multiplos clubes** em uma SuperUnion:
- Geral do PPST - Resumo torneios por liga
- Jogos PPST - Detalhes de cada torneio
- Geral do PPSR - Resumo cash games (pendente)
- Jogos PPSR - Detalhes cash games (pendente)

---

## Stack Tecnologica

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 19, Next.js 16, TypeScript, Tailwind CSS |
| **UI Components** | Shadcn/ui, Radix UI, Framer Motion |
| **Backend** | tRPC, Hono, Node.js com Bun |
| **Database** | Supabase (PostgreSQL), Drizzle ORM |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Jobs** | Trigger.dev |
| **Email** | Resend, React Email |
| **IA** | OpenAI, Mistral, Google Gemini |
| **Banco** | Plaid (US/CA), GoCardless (EU) |

---

## Estrutura do Projeto

```
apps/
├── api/                 # Backend tRPC + Hono
│   └── src/
│       ├── schemas/     # Validacao Zod
│       │   └── poker/   # Schemas do modulo poker
│       └── trpc/
│           └── routers/
│               └── poker/  # Routers: players, sessions, etc.
│
├── dashboard/           # Frontend Next.js
│   └── src/
│       ├── app/         # Paginas (App Router)
│       │   └── [locale]/(app)/(sidebar)/
│       │       └── poker/  # Paginas do modulo poker
│       ├── components/
│       │   ├── poker/   # Componentes do clube
│       │   ├── league/  # Componentes da liga
│       │   └── widgets/poker/  # Widgets do dashboard
│       ├── lib/
│       │   ├── poker/   # Types e validation
│       │   └── league/  # Types e validation
│       └── hooks/       # React hooks
│
├── docs/                # Documentacao (Mintlify)
│
packages/
├── db/                  # Schema e migrations
├── email/               # Templates de email
├── invoice/             # Geracao de PDF
├── jobs/                # Background jobs
├── supabase/            # Cliente Supabase
├── ui/                  # Componentes UI
└── utils/               # Utilitarios
```

---

## Desenvolvimento Local

### Pre-requisitos

- [Bun](https://bun.sh/) >= 1.0
- [Node.js](https://nodejs.org/) >= 20
- Conta [Supabase](https://supabase.com/)

### Setup

```bash
# Clone o repositorio
git clone https://github.com/seu-usuario/mid.git
cd mid

# Instale as dependencias
bun install

# Configure as variaveis de ambiente
cp .env.example .env.local

# Inicie o desenvolvimento
bun run dev
```

O dashboard estara disponivel em `http://localhost:9000` e a API em `http://localhost:8080`.

---

## Seguranca

- **Row Level Security (RLS)**: Todos os dados isolados por `team_id`
- **Autenticacao**: Supabase Auth com tokens JWT
- **Validacao**: Zod em todas as inputs da API
- **HTTPS**: Obrigatorio em producao

---

## Documentacao Tecnica

| Documento | Descricao |
|-----------|-----------|
| [docs/Poker_Integration](./docs/Poker_Integration/) | Arquitetura do modulo poker |
| [docs/Planilha_Basica_PPP](./docs/Planilha_Basica_PPP/) | Mapeamento planilha de clube |
| [docs/Planilha_Liga_PPP](./docs/Planilha_Liga_PPP/) | Mapeamento planilha de liga |

---

## Roadmap

### Implementado
- [x] Gestao de jogadores e agentes
- [x] Sessoes de jogo (Cash, MTT, SitNGo, Spin)
- [x] Transacoes de fichas/credito
- [x] Acertos semanais
- [x] Importacao de planilhas (clubes)
- [x] Dashboard com analytics
- [x] Validador de dados com 12+ regras

### Em Desenvolvimento
- [ ] Importacao de planilhas de liga (PPSR)
- [ ] Processamento backend de ligas
- [ ] Alertas automaticos (shark, churn, fraude)
- [ ] Notificacoes push

### Planejado
- [ ] App mobile (React Native)
- [ ] Integracao direta com API PPPoker
- [ ] Relatorios automaticos semanais
- [ ] Multi-moeda

---

## Licenca

Este projeto e baseado em codigo open-source. Consulte o arquivo LICENSE para mais detalhes.

## Contato

- Dashboard: https://middaydashboard-production.up.railway.app
