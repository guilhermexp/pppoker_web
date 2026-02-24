# Skill: InfinitePay Verificar Pagamento

## Objetivo
Confirmar o estado de um pagamento e orientar a acao operacional seguinte.

## Quando usar
- Usuario pergunta se pagamento foi aprovado
- Fluxo de entrega de fichas depende de confirmacao de pagamento
- OBRIGATORIO antes de enviar fichas em venda

## Ferramenta esperada
- mcp_infinitepay_verificar_pagamento

## Parametros
- **Obrigatorio**: order_nsu (retornado por gerar_link_pagamento)
- **Opcionais**: transaction_nsu, slug (melhoram precisao — vem do webhook)

## Fluxo
1. Validar order_nsu do pedido.
2. Consultar status: `verificar_pagamento(order_nsu="xp_...")`
3. Responder status atual (pendente ou pago).
4. Se pago, orientar envio de fichas via PPPoker.
5. Se pendente, orientar aguardar (webhook atualiza DB automaticamente).

## Regras
1. Nao marcar pagamento como pago sem retorno explicito da ferramenta.
2. O `payment_check` funciona melhor com `transaction_nsu` e `slug` que chegam via webhook. Sem eles, pode retornar falso negativo.
3. Preferir aguardar webhook antes de verificar manualmente.
4. Nao expor dados sensiveis de credenciais.
