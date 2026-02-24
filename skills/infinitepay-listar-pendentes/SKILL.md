# Skill: InfinitePay Listar Pendentes

## Objetivo
Listar pedidos pendentes para acompanhamento operacional e follow-up.

## Quando usar
- Revisao de pagamentos nao concluidos
- Rotina de cobranca/acompanhamento
- Verificar pedidos aguardando pagamento ou envio de fichas

## Ferramenta esperada
- mcp_infinitepay_listar_pedidos_pendentes

## Fluxo
1. Consultar pendencias: `listar_pedidos_pendentes()`
2. Consolidar lista com order_nsu, valor, fichas, status e data.
3. Classificar: `link_gerado` = aguardando pagamento, `pago` = aguardando envio de fichas.
4. Sugerir proximas acoes (cobrar cliente, enviar fichas, aguardar).

## Regras
1. Se nao houver pendentes, responder "sem pendencias".
2. Nao inferir pagamento concluido sem verificacao especifica.
3. Manter resposta curta e acionavel.
