# Integracao InfinitePay

Documentacao da integracao de pagamentos via InfinitePay no sistema Fastchips/Xperience Poker.

## Visao Geral

A InfinitePay e usada para gerar links de pagamento (Pix/cartao) para venda de fichas.
O fluxo e independente do PPPoker — pagamento e validacao de fichas sao etapas separadas.

```
Operador solicita venda
  → gerar_link_pagamento (MCP) → InfinitePay API
  → Link de checkout gerado
  → Cliente paga (Pix ou cartao)
  → InfinitePay chama webhook automaticamente
  → DB atualiza pedido para "pago"
  → Agente confirma e envia fichas (PPPoker, separado)
```

## Componentes

### 1. MCP Server (`Ppfichas/infinitepay_mcp.py`)

Servidor MCP com 3 ferramentas:

| Ferramenta | Tipo | Descricao |
|---|---|---|
| `gerar_link_pagamento` | Escrita | Gera link de checkout InfinitePay |
| `verificar_pagamento` | Leitura | Verifica status via `payment_check` |
| `listar_pedidos_pendentes` | Leitura | Lista pedidos em aberto na sessao |

**Variaveis de ambiente:**

| Variavel | Descricao |
|---|---|
| `FASTCHIPS_API_URL` | URL da API interna (ex: `http://localhost:3101`) |
| `FASTCHIPS_API_KEY` | Chave para autenticar sync com DB |
| `FASTCHIPS_TEAM_ID` | ID do time no Supabase |
| `INFINITEPAY_WEBHOOK_URL` | URL publica do webhook (ex: `https://api.example.com/infinitepay/webhook`) |

### 2. Webhook (`apps/api/src/rest/routers/infinitepay-webhook.ts`)

Endpoint publico que recebe confirmacoes de pagamento da InfinitePay.

- **Rota:** `POST /infinitepay/webhook`
- **Auth:** Nenhuma (InfinitePay chama direto)
- **Montado:** Antes do middleware protegido

**Payload recebido pela InfinitePay:**
```json
{
  "invoice_slug": "abc123",
  "amount": 1000,
  "paid_amount": 1010,
  "installments": 1,
  "capture_method": "pix",
  "transaction_nsu": "UUID",
  "order_nsu": "xp_1234567890",
  "receipt_url": "https://recibo.infinitepay.io/abc",
  "items": [{"description": "500 Fichas", "quantity": 1, "price": 1000}]
}
```

**Comportamento:**
- Busca pedido no DB por `order_nsu`
- Atualiza status para `pago` com dados do pagamento
- Merge incremental: nao sobrescreve dados existentes com null
- InfinitePay pode chamar multiplas vezes (primeira sem detalhes, segunda completa)
- Responde `200 OK` rapidamente (InfinitePay re-envia se receber `400`)

### 3. Payment Orders (`apps/api/src/rest/routers/payment-orders.ts`)

Endpoint interno para o MCP sincronizar pedidos com o banco.

- **POST /payment-orders** — Upsert pedido (auth via `x-api-key`)
- **GET /payment-orders** — Listar pedidos de um time

### 4. Banco de Dados

**Tabela:** `fastchips_payment_orders`

| Coluna | Tipo | Descricao |
|---|---|---|
| `order_nsu` | text | ID do pedido (unico por time) |
| `status` | enum | `link_gerado`, `pago`, `fichas_enviadas`, `cancelado`, `erro` |
| `fichas` | int | Quantidade de fichas a entregar |
| `valor_reais` | numeric | Valor em reais |
| `checkout_url` | text | URL do checkout |
| `transaction_nsu` | text | ID da transacao InfinitePay |
| `slug` | text | Codigo da fatura InfinitePay |
| `capture_method` | text | `pix` ou `credit_card` |
| `paid_amount` | numeric | Valor pago (em reais) |
| `installments` | int | Numero de parcelas |
| `paid_at` | timestamp | Data/hora do pagamento |
| `metadata` | jsonb | `receipt_url`, `webhook_received_at`, `raw_items` |

## API InfinitePay

### Gerar Link

```
POST https://api.infinitepay.io/invoices/public/checkout/links
```

**Payload:**
```json
{
  "handle": "xperience_solutions",
  "items": [
    {
      "quantity": 1,
      "price": 1000,
      "description": "500 Fichas - Xperience Poker"
    }
  ],
  "order_nsu": "xp_1234567890",
  "webhook_url": "https://api.example.com/infinitepay/webhook",
  "customer": {
    "name": "Joao Silva",
    "email": "joao@email.com",
    "phone_number": "+5511999887766"
  }
}
```

**Campos importantes:**
- `price` em centavos (R$ 10,00 = 1000)
- `handle` sem o `$` (InfiniteTag)
- `customer` e objeto (nao campos top-level)
- `order_nsu` e opcional (InfinitePay gera se nao informado)
- `webhook_url` e `redirect_url` sao opcionais

**Resposta:**
```json
{
  "url": "https://checkout.infinitepay.io/xperience_solutions?lenc=..."
}
```

### Verificar Pagamento

```
POST https://api.infinitepay.io/invoices/public/checkout/payment_check
```

**Payload:**
```json
{
  "handle": "xperience_solutions",
  "order_nsu": "xp_1234567890",
  "transaction_nsu": "UUID",
  "slug": "invoice-slug"
}
```

**Resposta (pago):**
```json
{
  "success": true,
  "paid": true,
  "amount": 1000,
  "paid_amount": 1010,
  "installments": 1,
  "capture_method": "pix"
}
```

**Resposta (nao pago):**
```json
{
  "success": false,
  "paid": false,
  "amount": 0,
  "paid_amount": 0
}
```

**IMPORTANTE:** O `payment_check` funciona melhor com `transaction_nsu` e `slug` — dados que vem via webhook ou redirect. Sem eles, pode retornar `paid: false` mesmo que o pagamento tenha sido feito.

## Fluxo Completo de Venda

```
1. Operador: "Vende 500 fichas pro jogador X"
2. Agente calcula: 500 fichas = R$ 500 (1:1)
3. Agente pede confirmacao
4. Operador confirma
5. gerar_link_pagamento(descricao, valor_reais=500, fichas=500)
   → InfinitePay gera checkout URL
   → MCP salva pedido no DB (status: link_gerado)
6. Agente envia link ao operador/jogador
7. Jogador paga (Pix ou cartao)
8. InfinitePay chama webhook → DB atualiza para "pago"
9. Agente verifica: verificar_pagamento(order_nsu)
10. Pagamento confirmado → login_status → enviar_fichas
11. Pedido finalizado (status: fichas_enviadas)
```

## Setup Local (Desenvolvimento)

Para testar webhook localmente, a InfinitePay precisa de URL publica:

```bash
# Instalar cloudflared
brew install cloudflared

# Criar tunnel para a API local
cloudflared tunnel --url http://localhost:3101

# Copiar URL gerada (ex: https://xxx.trycloudflare.com)
# Configurar no env do MCP: INFINITEPAY_WEBHOOK_URL=https://xxx.trycloudflare.com/infinitepay/webhook
```

## Setup Producao

1. Configurar `INFINITEPAY_WEBHOOK_URL` com URL publica da API
2. Endpoint: `https://{API_DOMAIN}/infinitepay/webhook`
3. Sem auth necessaria no webhook (InfinitePay chama direto)

## Testes

```bash
# Rodar testes unitarios
bun test apps/api/src/rest/routers/infinitepay-webhook.test.ts
```

## Arquivos

| Arquivo | Descricao |
|---|---|
| `Ppfichas/infinitepay_mcp.py` | MCP server InfinitePay |
| `apps/api/src/rest/routers/infinitepay-webhook.ts` | Webhook endpoint |
| `apps/api/src/rest/routers/payment-orders.ts` | CRUD de pedidos |
| `apps/api/src/rest/routers/infinitepay-webhook.test.ts` | Testes |
| `apps/api/src/schemas/fastchips/payment-orders.ts` | Schemas Zod |
| `packages/db/migrations/0016_fastchips_payment_orders.sql` | Migration DB |
| `~/.nanobot/config.json` | Config MCP (infinitepay server) |
