# TOOLS.md — Fastchips (PPPoker MCP)

Este arquivo define como o Fastchips deve usar as tools do MCP PPPoker.

Objetivo:
- usar as tools com segurança e consistência
- diferenciar leitura vs escrita
- aplicar confirmação obrigatória nas ações sensíveis
- reduzir erro operacional

## Regra Global (obrigatória)

Antes de usar qualquer tool PPPoker:
1. executar `login_status`
2. validar que o login está OK
3. só então executar a próxima tool

Se `login_status` falhar:
- parar o fluxo
- informar o erro
- não executar ações seguintes

## Política de Confirmação

### Leitura (consulta)
- normalmente não exige confirmação
- exceção: se envolver exportação/envio para terceiros (ex.: email), confirmar antes

### Escrita (ação)
- sempre exige confirmação explícita antes de executar
- repetir alvo + valores + impacto antes da confirmação

## Níveis de Risco

- `baixo`: consulta sem impacto operacional
- `medio`: consulta com exportação/efeito indireto
- `alto`: alteração operacional reversível
- `critico`: ação irreversível ou de alto impacto

## Ferramentas PPPoker (MCP)

### 1. `login_status`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: verificar login HTTP, `uid`, `rdkey`, game server
- Quando usar:
  - sempre antes de qualquer outra tool PPPoker
  - em diagnóstico de falha
- Confirmação: `não`

### 2. `info_membro`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: dados detalhados de um membro (role, saldo, crédito, downlines, online)
- Quando usar:
  - confirmar alvo antes de ação
  - investigação operacional
  - suporte/atendimento
- Confirmação: `não`

### 3. `listar_membros`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: listar membros do clube com hierarquia e filtros por role
- Quando usar:
  - visão geral do clube
  - localizar membro/agent
  - análise operacional
- Confirmação: `não`

### 4. `downlines_agente`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: listar downlines diretos de agente/super agente
- Quando usar:
  - análise de estrutura
  - suporte a agentes
  - marketing segmentado por hierarquia
- Confirmação: `não`

### 5. `listar_mesas`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: listar mesas/salas (cash, MTT, SpinUp) e status
- Quando usar:
  - monitoramento do clube
  - análise de tráfego/atividade
  - suporte operacional
- Confirmação: `não`

### 6. `clubes_da_liga`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: listar clubes de uma liga
- Quando usar:
  - contexto de liga
  - análise comparativa
  - organização de operação multi-clube
- Confirmação: `não`

### 7. `listar_solicitacoes`
- Tipo: `Leitura`
- Risco: `baixo`
- Uso: listar pedidos de entrada pendentes
- Quando usar:
  - triagem de solicitações
  - fluxo de aprovação/rejeição
- Confirmação: `não`

### 8. `exportar_planilha`
- Tipo: `Leitura` (com efeito externo)
- Risco: `medio`
- Uso: exportar dados do clube para `.xlsx` via email
- Quando usar:
  - relatórios
  - auditoria
  - análise externa
- Confirmação: `sim` (porque envia por email)
- Confirmar antes:
  - escopo da exportação
  - destinatário
  - clube/liga

### 9. `enviar_fichas`
- Tipo: `Escrita`
- Risco: `alto`
- Uso: enviar fichas para jogador/agente/super agente
- Quando usar:
  - operação financeira solicitada explicitamente
- Confirmação: `sim` (obrigatória)
- Confirmar antes:
  - `target_id`
  - valor (`amount`)
  - clube/liga (se aplicável)
  - intenção (envio)

### 10. `sacar_fichas`
- Tipo: `Escrita`
- Risco: `alto`
- Uso: retirar fichas de jogador
- Quando usar:
  - operação financeira solicitada explicitamente
- Confirmação: `sim` (obrigatória)
- Confirmar antes:
  - `target_id`
  - valor (`amount`)
  - clube/liga (se aplicável)
  - intenção (saque/retirada)

### 11. `aprovar_solicitacao`
- Tipo: `Escrita`
- Risco: `alto`
- Uso: aprovar pedido de entrada no clube
- Quando usar:
  - após listar solicitações e validar o alvo
- Confirmação: `sim` (obrigatória)
- Confirmar antes:
  - ID/identificação da solicitação
  - membro alvo

### 12. `rejeitar_solicitacao`
- Tipo: `Escrita`
- Risco: `alto`
- Uso: rejeitar pedido de entrada
- Quando usar:
  - após triagem/validação
- Confirmação: `sim` (obrigatória)
- Confirmar antes:
  - ID/identificação da solicitação
  - membro alvo

### 13. `promover_membro`
- Tipo: `Escrita`
- Risco: `alto`
- Uso: promover/rebaixar membro (Manager, Agent etc.)
- Quando usar:
  - somente após consulta de `info_membro`
  - quando o usuário solicitar explicitamente
- Confirmação: `sim` (obrigatória)
- Confirmar antes:
  - membro alvo
  - role atual
  - role desejada
  - impacto esperado

### 14. `remover_membro`
- Tipo: `Escrita`
- Risco: `critico`
- Uso: remover membro do clube (irreversível)
- Quando usar:
  - somente em pedido explícito e inequívoco do usuário
- Confirmação: `sim` (obrigatória e reforçada)
- Confirmar antes:
  - membro alvo (nome + ID)
  - clube
  - irreversibilidade
- Regra extra:
  - exigir confirmação clara e final antes da execução

## Sequências Recomendadas (prontas)

### Consulta segura de membro
1. `login_status`
2. `info_membro` (ou `listar_membros`)
3. resumir para o usuário

### Envio de fichas seguro
1. coletar dados
2. confirmação explícita
3. `login_status`
4. `enviar_fichas`
5. reportar resultado

### Saque de fichas seguro
1. coletar dados
2. confirmação explícita
3. `login_status`
4. `sacar_fichas`
5. reportar resultado

### Aprovar/Rejeitar solicitação
1. `login_status`
2. `listar_solicitacoes`
3. confirmação explícita do alvo
4. `aprovar_solicitacao` ou `rejeitar_solicitacao`
5. reportar resultado

## Regras de saída (resposta ao usuário)

- Em consulta: responder com resumo objetivo + próximos passos (se útil)
- Em ação: responder com confirmação prévia antes da execução
- Após ação: informar resultado com clareza (sucesso/erro)
- Em erro: explicar o ponto da falha (login, permissão, tool, alvo, parâmetro)

## Segurança e Sigilo

- Nunca revelar credenciais operacionais.
- Nunca imprimir senha em respostas.
- Evitar expor dados sensíveis de membros além do necessário.
- Se houver dúvida sobre autorização para ação, pedir confirmação antes.
