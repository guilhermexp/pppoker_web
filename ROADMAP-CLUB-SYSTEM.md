# Roadmap: Sistema de Gestão de Clubes e Envio de Fichas

> Documento gerado em: 2026-01-23
> Análise completa do estado atual e itens pendentes para finalização

---

## 1. Status Atual do Sistema

### Resumo Executivo

O Mid Poker é um sistema **maduro e funcional** para gestão de clubes PPPoker. Os principais módulos estão implementados:

| Módulo | Status | Completude |
|--------|--------|------------|
| Gestão de Jogadores | ✅ Completo | 95% |
| Gestão de Agentes | ✅ Completo | 90% |
| Sessões de Jogo | ✅ Completo | 95% |
| Importação de Dados | ✅ Completo | 90% |
| Sistema de Transações | ⚠️ Parcial | 70% |
| Acertos Semanais | ✅ Completo | 85% |
| Analytics/Dashboard | ✅ Completo | 85% |
| Envio de Fichas (Manual) | ❌ Não implementado | 0% |
| Liga/SuperUnion | ⚠️ Parcial | 60% |

---

## 2. O que Está Implementado

### 2.1 Gestão de Jogadores
- ✅ CRUD completo (criar, editar, deletar, listar)
- ✅ Filtros avançados (tipo, status, agente, rake, saldo)
- ✅ Status: ativo, inativo, suspenso, blacklist
- ✅ Hierarquia de agentes (agente → super agente)
- ✅ Métricas de atividade (última sessão, sessões nas últimas 4 semanas)
- ✅ Scores de risco (VIP, shark)
- ✅ Limites de crédito por jogador
- ✅ Saldo de fichas e crédito

### 2.2 Gestão de Agentes
- ✅ Lista de agentes com estatísticas
- ✅ Jogadores gerenciados por agente
- ✅ Configuração de rakeback %
- ✅ Cálculo de comissões
- ✅ Hierarquia super agente

### 2.3 Sessões de Jogo
- ✅ Tipos: Cash Game, MTT, Sit & Go, Spin
- ✅ Variantes: NLH, PLO4/5/6, OFC, Mixed
- ✅ Métricas: rake, buy-in, cash-out, mãos jogadas
- ✅ Participantes por sessão
- ✅ Filtros por data, tipo, variante

### 2.4 Sistema de Importação
- ✅ Upload de planilhas Excel PPPoker
- ✅ 17 regras de validação
- ✅ Preview em 10 abas antes de processar
- ✅ Suporte a planilha de clube (7 abas)
- ✅ Suporte a planilha de liga (4 abas)
- ✅ Classificação automática de transações (12 tipos)
- ✅ Workflow: upload → validação → processamento → commit

### 2.5 Sistema de Transações (Histórico)
- ✅ Visualização de transações importadas
- ✅ 12 tipos de transação classificados automaticamente
- ✅ Filtros: tipo, jogador, data, valor
- ✅ Breakdown por crédito e fichas
- ✅ Detalhamento: PPSR, Ring, MTT, Custom Ring
- ✅ Deleção com atualização de saldos

### 2.6 Acertos Semanais (Settlements)
- ✅ Criação manual de acertos
- ✅ Fechamento automático de semana (`closeWeek`)
- ✅ Status: pendente → parcial → completo → disputado → cancelado
- ✅ Registro de pagamentos
- ✅ Cálculo de rakeback automático
- ✅ Preview antes de fechar semana

### 2.7 Analytics/Dashboard
- ✅ Widgets: sessões, rake, jogadores, agentes
- ✅ Breakdown de rake (PPST, PPSR)
- ✅ Resultado geral e resultado do banco
- ✅ Top jogadores por saldo
- ✅ Lista de devedores
- ✅ Tendência de rake (últimas semanas)
- ✅ Distribuição por tipo de jogo
- ✅ Distribuição por região

---

## 3. O que Falta Implementar

### 3.1 🔴 CRÍTICO: Envio Manual de Fichas

**Status: Não implementado**

O sistema atualmente só registra transações via importação. Não existe funcionalidade para:

- [ ] Enviar fichas de um jogador para outro
- [ ] Solicitar fichas (request workflow)
- [ ] Aprovar/rejeitar solicitações
- [ ] Envio de crédito entre jogadores
- [ ] Transferência entre agente e jogadores
- [ ] Histórico de envios manuais

**Impacto:** Operadores precisam registrar envios fora do sistema e depois importar

### 3.2 🔴 CRÍTICO: Sistema de Crédito em Tempo Real

**Status: Não implementado**

- [ ] Dashboard de crédito por jogador
- [ ] Solicitação de crédito pelo jogador
- [ ] Aprovação de crédito pelo agente/operador
- [ ] Alertas de limite de crédito
- [ ] Cobrança automática de crédito vencido
- [ ] Relatório de crédito pendente

### 3.3 🟡 IMPORTANTE: Melhorias no Sistema de Acertos

- [ ] Geração automática de acertos após importação
- [ ] Reconciliação de acertos vs transações
- [ ] Workflow de disputa completo (UI)
- [ ] Bulk operations (atualizar múltiplos acertos)
- [ ] Templates de acerto recorrente
- [ ] Agendamento automático de fechamento

### 3.4 🟡 IMPORTANTE: Exportação e Relatórios

- [ ] Exportar dashboard para PDF
- [ ] Exportar transações para CSV/Excel
- [ ] Exportar lista de jogadores
- [ ] Relatórios programados por email
- [ ] Relatório de comissões por agente
- [ ] Relatório de performance por período

### 3.5 🟡 IMPORTANTE: Sistema de Alertas

**Status: Schema existe, UI incompleta**

- [x] Schema de alertas no banco (poker_alerts)
- [ ] Geração automática de alertas
- [ ] Painel de alertas no dashboard
- [ ] Notificações push/email
- [ ] Configuração de thresholds por usuário

Tipos de alerta já mapeados:
- `liquidity_low` / `liquidity_critical`
- `shark_detected`
- `churn_risk`
- `high_debt`
- `collusion_suspected`
- `unusual_activity`

### 3.6 🟢 NICE TO HAVE: Melhorias de UX

- [ ] Modal de detalhes da transação (infra existe, não implementado)
- [ ] Edição de transações (só deleção existe)
- [ ] Undo/desfazer importação
- [ ] Histórico de alterações (audit log)
- [ ] Busca global (jogadores, transações, sessões)
- [ ] Atalhos de teclado

### 3.7 🟢 NICE TO HAVE: Liga/SuperUnion

- [ ] Dashboard dedicado para ligas
- [ ] Comparativo entre clubes da liga
- [ ] Ranking de clubes
- [ ] Acertos inter-clubes
- [ ] Relatórios consolidados de liga

---

## 4. Roadmap Sugerido

### Fase 1: MVP Envio de Fichas (2-3 semanas)

**Objetivo:** Permitir envio manual de fichas entre jogadores

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 1.1 | Criar endpoint `poker.transactions.create` | Alta | 2d |
| 1.2 | Validação: saldo suficiente, limites | Alta | 1d |
| 1.3 | Atualização automática de saldos | Alta | 1d |
| 1.4 | UI: Modal de envio de fichas | Alta | 2d |
| 1.5 | UI: Seletor de jogador destino | Alta | 1d |
| 1.6 | UI: Confirmação antes de enviar | Alta | 0.5d |
| 1.7 | Testes unitários e integração | Alta | 2d |

**Entregáveis:**
- Botão "Enviar Fichas" na página de jogadores
- Modal com: jogador origem, jogador destino, valor, tipo
- Validação de saldo e limites
- Histórico de envios manuais

### Fase 2: Sistema de Solicitações (1-2 semanas)

**Objetivo:** Workflow de solicitação/aprovação de fichas

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 2.1 | Schema: `poker_chip_requests` table | Alta | 1d |
| 2.2 | Endpoints: create, list, approve, reject | Alta | 2d |
| 2.3 | UI: Lista de solicitações pendentes | Alta | 1d |
| 2.4 | UI: Aprovar/rejeitar solicitação | Alta | 1d |
| 2.5 | Notificações de novas solicitações | Média | 1d |

**Entregáveis:**
- Jogadores podem solicitar fichas
- Agentes/operadores veem fila de solicitações
- Aprovação com um clique
- Histórico de solicitações

### Fase 3: Crédito em Tempo Real (2 semanas)

**Objetivo:** Gestão completa de crédito

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 3.1 | Dashboard de crédito por jogador | Alta | 2d |
| 3.2 | Solicitação de crédito | Alta | 1d |
| 3.3 | Aprovação com limite automático | Alta | 1d |
| 3.4 | Alertas de limite excedido | Média | 1d |
| 3.5 | Relatório de crédito pendente | Média | 1d |
| 3.6 | Cobrança automática (opcional) | Baixa | 2d |

### Fase 4: Relatórios e Exportação (1-2 semanas)

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 4.1 | Exportar transações CSV/Excel | Alta | 1d |
| 4.2 | Exportar jogadores CSV | Alta | 0.5d |
| 4.3 | Relatório PDF de comissões | Média | 2d |
| 4.4 | Relatório PDF de acertos | Média | 2d |
| 4.5 | Agendamento de relatórios (jobs) | Baixa | 2d |

### Fase 5: Sistema de Alertas (1 semana)

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 5.1 | Trigger automático de alertas | Média | 2d |
| 5.2 | Painel de alertas no dashboard | Média | 1d |
| 5.3 | Configuração de thresholds | Baixa | 1d |
| 5.4 | Notificações por email | Baixa | 1d |

### Fase 6: Melhorias de Acertos (1 semana)

| # | Task | Prioridade | Estimativa |
|---|------|------------|------------|
| 6.1 | Auto-gerar acertos após import | Alta | 1d |
| 6.2 | Bulk update de acertos | Média | 1d |
| 6.3 | Reconciliação vs transações | Média | 2d |
| 6.4 | Workflow de disputa completo | Baixa | 1d |

---

## 5. Arquitetura Proposta para Envio de Fichas

### Schema Sugerido

```sql
-- Nova tabela para requests
CREATE TABLE poker_chip_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id),
  requester_player_id UUID NOT NULL REFERENCES poker_players(id),
  target_player_id UUID REFERENCES poker_players(id), -- null = request to club
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'chips' | 'credit'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
  note TEXT,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Endpoints Sugeridos

```typescript
// poker/chip-requests.ts
router({
  // Criar solicitação
  create: protectedProcedure
    .input(createChipRequestSchema)
    .mutation(async ({ ctx, input }) => { ... }),

  // Listar solicitações (com filtros)
  list: protectedProcedure
    .input(listChipRequestsSchema)
    .query(async ({ ctx, input }) => { ... }),

  // Aprovar solicitação
  approve: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Rejeitar solicitação
  reject: protectedProcedure
    .input(z.object({ requestId: z.string().uuid(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => { ... }),

  // Cancelar solicitação (pelo solicitante)
  cancel: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => { ... }),
})
```

### Endpoint de Envio Direto

```typescript
// Adicionar ao poker/transactions.ts
create: protectedProcedure
  .input(z.object({
    senderPlayerId: z.string().uuid(),
    recipientPlayerId: z.string().uuid(),
    amount: z.number().positive(),
    type: z.enum(['chips', 'credit']),
    note: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 1. Validar saldo do sender
    // 2. Validar limites
    // 3. Criar transação transfer_out para sender
    // 4. Criar transação transfer_in para recipient
    // 5. Atualizar saldos de ambos
    // 6. Retornar transações criadas
  }),
```

---

## 6. Priorização Final

### Deve ter (MVP)
1. **Envio manual de fichas** - Crítico para operação diária
2. **Exportação de transações** - Necessário para contabilidade
3. **Auto-geração de acertos após import** - Reduz trabalho manual

### Deveria ter
4. Sistema de solicitações de fichas
5. Dashboard de crédito
6. Painel de alertas

### Poderia ter
7. Relatórios PDF
8. Agendamento de relatórios
9. Notificações por email
10. Melhorias de liga/SuperUnion

---

## 7. Débitos Técnicos a Considerar

Do `CLAUDE.md`:

- 50+ arquivos com `@ts-expect-error` ou `@ts-ignore`
- 20+ arquivos usando `console.log()` ao invés de Pino logger
- 11+ TODO/FIXME sem issues linkadas
- **Apenas 10 arquivos de teste** - 37+ routers sem cobertura

### Recomendação

Antes de adicionar features novas, considerar:
1. Adicionar testes para routers críticos (imports, transactions, settlements)
2. Migrar console.log para Pino
3. Resolver os @ts-expect-error mais críticos

---

## 8. Conclusão

O sistema está **85% completo** para gestão básica de clubes. O gap mais crítico é a **falta de envio manual de fichas**, que força operadores a usar processos externos.

**Próximos passos recomendados:**
1. Implementar Fase 1 (MVP Envio de Fichas)
2. Adicionar testes para routers de transações
3. Implementar exportação CSV básica
4. Avaliar necessidade de sistema de solicitações

---

*Este documento deve ser atualizado conforme o desenvolvimento avança.*
