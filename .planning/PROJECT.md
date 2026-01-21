# Auditoria do Fluxo de Clubes - Mid Poker

## What This Is

Auditoria completa do fluxo de gestão de clubes no Mid Poker, analisando toda a lógica desde a experiência do usuário (entrar na seção de clubes, adicionar planilha, validar, aprovar, iniciar fechamento semanal, até fechar semana completa). O objetivo é identificar gaps na lógica, problemas de implementação, verificar alinhamento com banco de dados, e gerar recomendações de correções.

## Core Value

A lógica de fechamento semanal (settlements) deve estar matematicamente correta e consistente. Todos os cálculos, saldos, rake, transações e settlements devem ser precisos e auditáveis.

## Requirements

### Validated

<!-- Sistema já implementa estas funcionalidades -->

- ✓ Importação de planilhas Excel do PPPoker (7 abas para clube, 4 abas para league) — existing
- ✓ Sistema de validação com 12+ regras (estrutura, IDs de jogadores, balanço de transações, totais de sessões) — existing
- ✓ Gestão de clubes com hierarquia de jogadores/agentes (agent_id, super_agent_id) — existing
- ✓ Sessões de poker (cash_game, mtt, sit_n_go, spin) — existing
- ✓ Transações de chips (12 tipos diferentes) — existing
- ✓ Settlements semanais com status tracking — existing
- ✓ Dashboard Next.js 16 com tRPC type-safe API — existing
- ✓ Validação de schemas com Zod (35+ schemas) — existing
- ✓ Database layer com Drizzle ORM e PostgreSQL — existing
- ✓ Queries reutilizáveis organizadas por domínio (43 arquivos de queries) — existing

### Active

<!-- Escopo desta auditoria -->

- [ ] Mapear fluxo completo de UX: entrada na seção de clubes → adicionar planilha → validar → aprovar → iniciar fechamento → fechar semana completa
- [ ] Auditar sistema de validação de planilhas (12+ regras): verificar se todas as regras estão corretas e completas
- [ ] Auditar lógica de fechamento semanal: matemática dos settlements, cálculo de rake, saldos, transações
- [ ] Verificar alinhamento com banco de dados: queries corretas, transações atômicas, consistência de dados
- [ ] Identificar gaps e problemas: lógica quebrada, validações faltando, estados inconsistentes, bugs
- [ ] Documentar toda a análise: fluxo completo, componentes envolvidos, queries do banco, lógica de negócio
- [ ] Gerar relatório de recomendações: lista priorizada de correções necessárias, impacto, e plano de ação

### Out of Scope

- Análise de performance e otimizações — foco é corretude lógica, não velocidade de queries ou melhorias de performance
- Módulos de League/SuperUnion — apenas fluxo de clubes individuais, não multi-clube

## Context

**Sistema Existente:**
- Plataforma de gestão financeira para operadores de clubes PPPoker, agentes, e jogadores profissionais
- Monorepo Turborepo + Bun com arquitetura clara: API (Hono+tRPC) + Dashboard (Next.js) + DB (Drizzle)
- 37+ routers tRPC organizados por domínio
- Codebase já mapeado em `.planning/codebase/` (7 documentos)

**Domínio Crítico:**
- Importação de planilhas Excel do PPPoker
- Validação de dados (12+ regras)
- Transformação em dados estruturados para análise e settlements

**Poker Module:**
- Core feature do sistema
- Entidades principais: `poker_players`, `poker_sessions`, `poker_session_players`, `poker_chip_transactions`, `poker_settlements`, `poker_imports`
- Routers: `players.ts`, `sessions.ts`, `transactions.ts`, `settlements.ts`, `analytics.ts`, `poker-import.ts`

**Tech Debt Conhecido:**
- 50+ arquivos com `@ts-expect-error` ou `@ts-ignore`
- 20+ arquivos usando `console.log()` em vez de Pino logger
- 11+ comentários TODO/FIXME sem issues linkadas
- Maioria dos routers sem testes de error handling
- **Gap crítico**: Apenas 10 arquivos de teste existem, os 37+ tRPC routers e lógica de importação poker não têm testes

## Constraints

- **Escopo**: Apenas fluxo de clubes (poker module), não incluir League/SuperUnion
- **Foco**: Corretude lógica e consistência de dados, não performance
- **Abordagem**: Auditoria e documentação, não implementação de correções nesta fase

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Priorizar fechamento semanal como core value | Matemática dos settlements é crítica - erros afetam dinheiro real dos usuários | — Pending |
| Excluir análise de performance | Primeiro garantir que está correto, depois otimizar | — Pending |
| Excluir módulos de League da auditoria | Reduzir escopo para focar em fluxo principal de clubes | — Pending |

---
*Last updated: 2026-01-21 after initialization*
