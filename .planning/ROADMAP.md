# Roadmap: Auditoria do Fluxo de Clubes

## Overview

Auditoria sistemática do fluxo completo de gestão de clubes no Mid Poker, desde a experiência do usuário até a consistência do banco de dados. O roadmap segue a jornada do usuário: mapeamento da UX atual → auditoria de validação de planilhas → auditoria da lógica crítica de fechamento semanal → verificação de consistência do banco → relatório final com recomendações priorizadas.

## Domain Expertise

None

## Phases

- [x] **Phase 1: Mapeamento do Fluxo UX** - Mapear jornada completa do usuário e identificar todos os componentes envolvidos
- [ ] **Phase 2: Auditoria de Validação** - Auditar sistema de validação de planilhas e lógica de importação
- [ ] **Phase 3: Auditoria de Fechamento Semanal** - Auditar lógica crítica de settlements, cálculos de rake e transações
- [ ] **Phase 4: Verificação de Consistência** - Verificar alinhamento com banco de dados e integridade dos dados
- [ ] **Phase 5: Relatório Final** - Consolidar achados e gerar relatório de recomendações priorizadas

## Phase Details

### Phase 1: Mapeamento do Fluxo UX
**Goal**: Documentar a jornada completa do usuário desde entrada na seção de clubes até fechamento da semana, identificando todos os componentes, rotas, e lógica envolvida.

**Depends on**: Nothing (primeira fase)

**Research**: Unlikely (análise de código existente, leitura de componentes e routers)

**Plans**: 2 plans

Plans:
- [x] 01-01: Mapear fluxo frontend (componentes, rotas, actions, hooks)
- [x] 01-02: Mapear fluxo backend (routers tRPC, schemas, queries do banco)

### Phase 2: Auditoria de Validação
**Goal**: Auditar completamente o sistema de validação de planilhas (12+ regras), verificando corretude, completude, e identificando gaps.

**Depends on**: Phase 1

**Research**: Unlikely (análise de lógica de validação existente em `apps/dashboard/src/lib/poker/validation.ts` e routers de import)

**Plans**: 2 plans

Plans:
- [ ] 02-01: Auditar regras de validação (12+ regras: estrutura, IDs, transações, sessões)
- [ ] 02-02: Auditar lógica de processamento e transformação de dados

### Phase 3: Auditoria de Fechamento Semanal
**Goal**: Auditar a lógica crítica de fechamento semanal (settlements), verificando precisão matemática dos cálculos de rake, saldos, transações, e settlements.

**Depends on**: Phase 2

**Research**: Unlikely (análise de lógica de settlements existente, cálculos matemáticos, queries)

**Plans**: 3 plans

Plans:
- [ ] 03-01: Auditar cálculos de settlements (matemática, saldos, status tracking)
- [ ] 03-02: Auditar cálculos de rake e distribuição
- [ ] 03-03: Auditar fluxo de transações e balanço

### Phase 4: Verificação de Consistência
**Goal**: Verificar alinhamento completo com banco de dados, queries corretas, transações atômicas, e consistência de dados.

**Depends on**: Phase 3

**Research**: Unlikely (análise de queries existentes em `packages/db/src/queries/`, schemas, e lógica de acesso a dados)

**Plans**: 2 plans

Plans:
- [ ] 04-01: Auditar queries e integridade de dados (atomicidade, consistência)
- [ ] 04-02: Verificar alinhamento schema-código e RLS policies

### Phase 5: Relatório Final
**Goal**: Consolidar todos os achados, identificar gaps e problemas, e gerar relatório de recomendações priorizadas com plano de ação.

**Depends on**: Phase 4

**Research**: Unlikely (consolidação de análises anteriores)

**Plans**: 1 plan

Plans:
- [ ] 05-01: Gerar relatório completo com achados, gaps, e recomendações priorizadas

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Mapeamento do Fluxo UX | 2/2 | Complete | 2026-01-21 |
| 2. Auditoria de Validação | 0/2 | Not started | - |
| 3. Auditoria de Fechamento Semanal | 0/3 | Not started | - |
| 4. Verificação de Consistência | 0/2 | Not started | - |
| 5. Relatório Final | 0/1 | Not started | - |
