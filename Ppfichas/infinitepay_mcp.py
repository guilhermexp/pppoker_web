#!/usr/bin/env python3
"""
InfinitePay MCP Server
Gera links de pagamento e verifica status via API InfinitePay.
Sincroniza pedidos com o banco de dados via REST endpoint interno.

Uso:
    python3 infinitepay_mcp.py

Variaveis de ambiente:
    FASTCHIPS_API_URL  — URL da API Hono (ex: http://localhost:3101)
    FASTCHIPS_API_KEY  — chave interna para autenticar chamadas
    FASTCHIPS_TEAM_ID  — team_id para registrar pedidos no DB
"""

import os
import sys
import json
import asyncio
import time
import secrets
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

try:
    import httpx
except ImportError:
    print("httpx nao encontrado. Instale com: pip install httpx", file=sys.stderr)
    sys.exit(1)

# ── Configuracao ───────────────────────────────────────────
INFINITEPAY_API_URL = "https://api.infinitepay.io"
HANDLE = "xperience_solutions"

FASTCHIPS_API_URL = os.environ.get("FASTCHIPS_API_URL", "http://localhost:3101")
FASTCHIPS_API_KEY = os.environ.get("FASTCHIPS_API_KEY", "")
FASTCHIPS_TEAM_ID = os.environ.get("FASTCHIPS_TEAM_ID", "")
# URL publica da API para webhook (InfinitePay precisa acessar de fora)
INFINITEPAY_WEBHOOK_URL = os.environ.get("INFINITEPAY_WEBHOOK_URL", "")

# ── Pedidos em memoria (sessao) ────────────────────────────
_orders: dict[str, dict] = {}

app = Server("infinitepay")


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _generate_order_nsu() -> str:
    """Gera NSU com componente aleatorio."""
    return f"xp_{int(time.time())}_{secrets.token_hex(4)}"


async def _sync_order_to_db(order: dict) -> dict | None:
    """Sincroniza pedido com DB via REST endpoint interno."""
    if not FASTCHIPS_API_KEY or not FASTCHIPS_TEAM_ID:
        return None

    url = f"{FASTCHIPS_API_URL}/api/payment-orders"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": FASTCHIPS_API_KEY,
    }
    payload = {
        "teamId": FASTCHIPS_TEAM_ID,
        **order,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"error": f"HTTP {resp.status_code}: {resp.text}"}
    except Exception as e:
        return {"error": str(e)}


# ─────────────────────────────────────────────────────────────
# Tools
# ─────────────────────────────────────────────────────────────

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="gerar_link_pagamento",
            description=(
                "Gera um link de checkout InfinitePay para receber pagamento. "
                "O link permite pagamento via Pix ou cartao. "
                "Apos gerar o link, envie ao cliente e use verificar_pagamento para confirmar. "
                "PARAMETROS OBRIGATORIOS: descricao, valor_reais, fichas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "descricao": {
                        "type": "string",
                        "description": (
                            "[OBRIGATORIO] Descricao do item no checkout. "
                            "Exemplo: '500 Fichas - Xperience Poker'."
                        )
                    },
                    "valor_reais": {
                        "type": "number",
                        "description": (
                            "[OBRIGATORIO] Valor em reais (BRL). "
                            "Exemplo: 10.00 para R$ 10,00."
                        )
                    },
                    "fichas": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATORIO] Quantidade de fichas a entregar apos pagamento confirmado. "
                            "Campo interno — nao enviado para InfinitePay."
                        )
                    },
                    "order_nsu": {
                        "type": "string",
                        "description": (
                            "[OPCIONAL] Identificador do pedido no seu sistema. "
                            "Se nao informado, sera gerado automaticamente."
                        )
                    },
                    "customer_name": {
                        "type": "string",
                        "description": "[OPCIONAL] Nome do comprador."
                    },
                    "customer_email": {
                        "type": "string",
                        "description": "[OPCIONAL] Email do comprador."
                    },
                    "customer_phone": {
                        "type": "string",
                        "description": "[OPCIONAL] Telefone do comprador (ex: +5511999887766)."
                    },
                    "redirect_url": {
                        "type": "string",
                        "description": (
                            "[OPCIONAL] URL para redirecionar o cliente apos pagamento concluido."
                        )
                    },
                },
                "required": ["descricao", "valor_reais", "fichas"]
            }
        ),

        types.Tool(
            name="verificar_pagamento",
            description=(
                "Verifica o status de um pagamento InfinitePay. "
                "Retorna se o pagamento foi aprovado, valor pago, metodo, etc. "
                "Use SEMPRE antes de enviar fichas para confirmar que o pagamento foi efetuado. "
                "PARAMETRO OBRIGATORIO: order_nsu."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "order_nsu": {
                        "type": "string",
                        "description": "[OBRIGATORIO] ID do pedido retornado por gerar_link_pagamento."
                    },
                    "transaction_nsu": {
                        "type": "string",
                        "description": (
                            "[OPCIONAL] ID da transacao (recebido via redirect ou webhook). "
                            "Melhora a precisao da consulta."
                        )
                    },
                    "slug": {
                        "type": "string",
                        "description": (
                            "[OPCIONAL] Codigo da fatura InfinitePay (recebido via redirect ou webhook)."
                        )
                    },
                },
                "required": ["order_nsu"]
            }
        ),

        types.Tool(
            name="listar_pedidos_pendentes",
            description=(
                "Lista todos os pedidos de pagamento em aberto nesta sessao. "
                "Mostra pedidos com status link_gerado (aguardando pagamento) "
                "e pago (aguardando envio de fichas). "
                "Nao requer parametros."
            ),
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:

    # ── gerar_link_pagamento ────────────────────────────────
    if name == "gerar_link_pagamento":
        descricao = arguments["descricao"]
        valor_reais = float(arguments["valor_reais"])
        fichas = int(arguments["fichas"])

        if valor_reais <= 0:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": "valor_reais deve ser positivo"
            }))]

        if fichas <= 0:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": "fichas deve ser positivo"
            }))]

        order_nsu = arguments.get("order_nsu") or _generate_order_nsu()
        valor_centavos = int(round(valor_reais * 100))

        # Payload conforme doc oficial InfinitePay
        checkout_payload: dict = {
            "handle": HANDLE,
            "items": [
                {
                    "description": descricao,
                    "quantity": 1,
                    "price": valor_centavos,
                }
            ],
            "order_nsu": order_nsu,
        }

        # Dados do cliente (opcional) — objeto customer conforme doc
        customer: dict = {}
        if arguments.get("customer_name"):
            customer["name"] = arguments["customer_name"]
        if arguments.get("customer_email"):
            customer["email"] = arguments["customer_email"]
        if arguments.get("customer_phone"):
            customer["phone_number"] = arguments["customer_phone"]
        if customer:
            checkout_payload["customer"] = customer

        # URL de redirecionamento pos-pagamento (opcional)
        if arguments.get("redirect_url"):
            checkout_payload["redirect_url"] = arguments["redirect_url"]

        # Webhook para receber confirmacao automatica de pagamento
        if INFINITEPAY_WEBHOOK_URL:
            checkout_payload["webhook_url"] = INFINITEPAY_WEBHOOK_URL

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{INFINITEPAY_API_URL}/invoices/public/checkout/links",
                    json=checkout_payload,
                    headers={"Content-Type": "application/json"},
                )

                if resp.status_code not in (200, 201):
                    return [types.TextContent(type="text", text=json.dumps({
                        "status": "error",
                        "step": "infinitepay_api",
                        "http_status": resp.status_code,
                        "error": resp.text[:500],
                    }, indent=2))]

                data = resp.json()

        except httpx.TimeoutException:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "step": "infinitepay_api",
                "error": "Timeout ao conectar com InfinitePay"
            }))]
        except Exception as e:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "step": "infinitepay_api",
                "error": str(e)
            }))]

        checkout_url = data.get("checkout_url") or data.get("url")
        slug = data.get("slug") or data.get("id")

        # Salvar em memoria
        order = {
            "orderNsu": order_nsu,
            "status": "link_gerado",
            "fichas": fichas,
            "valorReais": valor_reais,
            "checkoutUrl": checkout_url,
            "slug": slug,
            "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        _orders[order_nsu] = order

        # Sincronizar com DB
        await _sync_order_to_db(order)

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "order_nsu": order_nsu,
            "checkout_url": checkout_url,
            "fichas": fichas,
            "valor_reais": valor_reais,
            "slug": slug,
            "proximo_passo": (
                f"Envie o link ao cliente. "
                f"Apos pagamento, use verificar_pagamento(order_nsu='{order_nsu}') "
                f"para confirmar antes de enviar fichas."
            ),
        }, indent=2))]

    # ── verificar_pagamento ─────────────────────────────────
    elif name == "verificar_pagamento":
        order_nsu = arguments["order_nsu"]
        transaction_nsu = arguments.get("transaction_nsu")
        slug = arguments.get("slug")

        # Buscar na memoria local
        local_order = _orders.get(order_nsu)

        # Se nao temos slug, tentar pegar do pedido salvo
        if not slug and local_order:
            slug = local_order.get("slug")

        # Endpoint oficial: POST /invoices/public/checkout/payment_check
        check_payload: dict = {
            "handle": HANDLE,
            "order_nsu": order_nsu,
        }
        if transaction_nsu:
            check_payload["transaction_nsu"] = transaction_nsu
        if slug:
            check_payload["slug"] = slug

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{INFINITEPAY_API_URL}/invoices/public/checkout/payment_check",
                    json=check_payload,
                    headers={"Content-Type": "application/json"},
                )

                if resp.status_code not in (200, 201):
                    return [types.TextContent(type="text", text=json.dumps({
                        "status": "error",
                        "step": "infinitepay_api",
                        "http_status": resp.status_code,
                        "error": f"Nao foi possivel verificar o pedido {order_nsu}",
                        "detail": resp.text[:500],
                    }, indent=2))]

                data = resp.json()

        except Exception as e:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "step": "infinitepay_api",
                "error": str(e)
            }))]

        # Interpretar resposta conforme doc:
        # { success, paid, amount, paid_amount, installments, capture_method }
        is_paid = data.get("paid", False) is True
        capture_method = data.get("capture_method")
        paid_amount_raw = data.get("paid_amount")
        paid_amount = float(paid_amount_raw) / 100 if paid_amount_raw is not None else None
        amount_raw = data.get("amount")
        amount = float(amount_raw) / 100 if amount_raw is not None else None
        installments = data.get("installments")
        resp_transaction_nsu = data.get("transaction_nsu") or transaction_nsu

        result: dict = {
            "status": "success",
            "order_nsu": order_nsu,
            "paid": is_paid,
            "capture_method": capture_method,
            "amount": amount,
            "paid_amount": paid_amount,
            "installments": installments,
            "transaction_nsu": resp_transaction_nsu,
        }

        if local_order:
            result["fichas"] = local_order["fichas"]

        # Atualizar memoria e DB se pago
        if is_paid and local_order:
            local_order["status"] = "pago"
            local_order["transactionNsu"] = resp_transaction_nsu
            local_order["captureMethod"] = capture_method
            local_order["paidAmount"] = paid_amount
            local_order["installments"] = installments
            local_order["paidAt"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            _orders[order_nsu] = local_order
            await _sync_order_to_db(local_order)

            result["proximo_passo"] = (
                f"Pagamento CONFIRMADO! "
                f"Agora confirme os dados do jogador e envie as {local_order['fichas']} fichas."
            )
        elif is_paid:
            result["proximo_passo"] = (
                "Pagamento CONFIRMADO! Confirme os dados do jogador e envie as fichas."
            )
        else:
            result["proximo_passo"] = (
                "Pagamento AINDA NAO confirmado. Aguarde o cliente pagar e verifique novamente."
            )

        return [types.TextContent(type="text", text=json.dumps(result, indent=2))]

    # ── listar_pedidos_pendentes ────────────────────────────
    elif name == "listar_pedidos_pendentes":
        pendentes = []
        for nsu, order in _orders.items():
            if order.get("status") in ("link_gerado", "pago"):
                pendentes.append({
                    "order_nsu": nsu,
                    "status": order["status"],
                    "fichas": order["fichas"],
                    "valor_reais": order.get("valorReais"),
                    "checkout_url": order.get("checkoutUrl"),
                    "created_at": order.get("createdAt"),
                })

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "total": len(pendentes),
            "pedidos": pendentes,
            "nota": (
                "Pedidos com status 'link_gerado' aguardam pagamento. "
                "Pedidos com status 'pago' aguardam envio de fichas."
            ),
        }, indent=2))]

    else:
        return [types.TextContent(type="text", text=json.dumps({
            "error": f"Tool '{name}' nao reconhecida"
        }))]


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
