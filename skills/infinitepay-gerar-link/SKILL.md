# Skill: InfinitePay Gerar Link

## Objetivo
Gerar link de pagamento (Pix/cartao) para receber pagamento de fichas.

## IMPORTANTE
A InfinitePay e independente do PPPoker. NAO incluir parametros PPPoker (player_uid, player_nome etc.) na geracao do link.

## Quando usar
- Cliente solicita compra de fichas via pagamento
- Operacao de venda precisa gerar cobranca imediata

## Ferramenta esperada
- mcp_infinitepay_gerar_link_pagamento

## Parametros
- **Obrigatorios**: descricao, valor_reais, fichas
- **Opcionais**: order_nsu, customer_name, customer_email, customer_phone, redirect_url

## Fluxo
1. Confirmar valor e quantidade de fichas com o operador.
2. Gerar link: `gerar_link_pagamento(descricao="X Fichas - Xperience Poker", valor_reais=X, fichas=X)`
3. Retornar `checkout_url` para enviar ao cliente e `order_nsu` para rastreamento.
4. Informar que o webhook atualizara o DB automaticamente quando pago.

## Regras
1. NAO incluir player_uid, player_nome ou qualquer parametro PPPoker.
2. Valor em reais (nao centavos) — a conversao e feita pela tool.
3. Webhook URL e adicionado automaticamente pela tool.
4. Em erro, retornar causa e orientacao para nova tentativa.
5. Nao expor chaves/tokens em resposta.
