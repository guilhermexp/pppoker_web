# TOOLS.md — Fastchips

Este arquivo define como o Fastchips deve usar ferramentas.

## REGRA FUNDAMENTAL: Runtime vs [APPROVAL]

Você tem apenas **5 ferramentas MCP de leitura** disponíveis no runtime.
**TODAS as ações de escrita usam o formato [APPROVAL]**, NÃO chamadas MCP.

Se tentar chamar uma ferramenta que não está no runtime (ex: `mcp_pppoker_gerar_link_pagamento`, `mcp_infinitepay_gerar_link_pagamento`), **vai dar erro**.

## Regra Global (obrigatória)

Antes de usar qualquer tool PPPoker de leitura:
1. executar `mcp_pppoker_login_status`
2. validar que o login está OK (uid=13352472)
3. só então executar a próxima tool de leitura

Se `login_status` falhar:
- parar o fluxo
- informar o erro
- não executar ações seguintes

## Parâmetros Padrão dos Clubes

| Operação | clube_id | liga_id | Motivo |
|----------|----------|---------|--------|
| enviar_fichas / sacar_fichas | `4191918` | `3357` | Clube operacional de fichas |
| info_membro / listar_membros | `4366162` | `1765` | Clube principal Xperience |
| exportar_planilha | `4366162` | `1765` | Dados do clube principal |

**IMPORTANTE**: Sempre passar `clube_id` e `liga_id` explicitamente nas chamadas.
Se o operador não especificar o clube, usar os defaults acima conforme o tipo de operação.

## Validação de UIDs PPPoker

- UIDs de jogadores PPPoker têm 7-8 dígitos (ex: 13357477, 11470719, 2914397)
- Se receber UID com 9+ dígitos, perguntar ao operador se está correto
- Antes de `enviar_fichas` ou `sacar_fichas`, usar `info_membro(uid=X)` para confirmar que o jogador existe
- Se `info_membro` retornar erro, NÃO prosseguir com o envio

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

## Ferramentas de LEITURA (chamada MCP direta — disponíveis no runtime)

### 1. `mcp_pppoker_login_status`
- Uso: verificar login HTTP, `uid`, `rdkey`, game server
- Quando: sempre antes de qualquer outra tool PPPoker
- Confirmação: não

### 2. `mcp_pppoker_info_membro`
- Uso: dados detalhados de um membro (role, saldo, crédito, downlines, online)
- Quando: confirmar alvo antes de ação, investigação, suporte
- Confirmação: não

### 3. `mcp_pppoker_listar_membros`
- Uso: listar membros do clube com hierarquia e filtros por role
- Quando: visão geral do clube, localizar membro
- Confirmação: não

### 4. `mcp_pppoker_downlines_agente`
- Uso: listar downlines diretos de agente/super agente
- Quando: análise de estrutura, suporte a agentes
- Confirmação: não

### 5. `mcp_pppoker_listar_solicitacoes`
- Uso: listar pedidos de entrada pendentes
- Quando: triagem de solicitações
- Confirmação: não

## Ações de ESCRITA (usar [APPROVAL] — NÃO chamar como MCP tool!)

Estas ações NÃO estão no runtime MCP. Se tentar chamá-las, vai dar erro.
Use SEMPRE o formato [APPROVAL] conforme descrito no SOUL.md.

### `enviar_fichas`
- Uso: enviar fichas para jogador/agente
- Params: `{"target_id": UID, "amount": VALOR}`
- Risco: alto

### `sacar_fichas`
- Uso: retirar fichas de jogador
- Params: `{"target_id": UID, "amount": VALOR}`
- Risco: alto

### `gerar_link_pagamento`
- Uso: gerar link checkout InfinitePay (Pix/cartão)
- Params: `{"descricao": "X fichas PPPoker", "valor_reais": X, "fichas": X, "target_player_id": UID}`
- **OBRIGATÓRIO**: `target_player_id` = UID PPPoker do jogador que vai receber as fichas (para envio automático após pagamento)
- Risco: medio
- Retorna: `checkout_url` e `order_nsu`
- Após pagamento confirmado pelo webhook, fichas são enviadas automaticamente

### `verificar_pagamento`
- Uso: verificar status de pagamento
- Params: `{"order_nsu": "NSU"}`
- Risco: baixo

### `listar_pedidos_pendentes`
- Uso: listar pedidos em aberto
- Params: `{}`
- Risco: baixo

### `aprovar_solicitacao` / `rejeitar_solicitacao`
- Uso: aprovar/rejeitar pedido de entrada no clube
- Risco: alto

### `promover_membro`
- Uso: promover/rebaixar membro (Manager, Agent etc.)
- Risco: alto

### `remover_membro`
- Uso: remover membro do clube (irreversível)
- Risco: critico

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

### Venda de fichas com pagamento
1. coletar dados (jogador UID, fichas, valor)
2. confirmação explícita do operador
3. `gerar_link_pagamento` (incluir `target_player_id`!) → enviar link ao jogador
4. aguardar pagamento (webhook atualiza DB)
5. fichas sao enviadas AUTOMATICAMENTE pelo sistema apos pagamento confirmado
6. reportar conclusão ao operador

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
