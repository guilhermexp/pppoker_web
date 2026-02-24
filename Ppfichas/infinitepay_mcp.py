#!/usr/bin/env python3
"""
InfinitePay MCP Server
Gera links de pagamento e verifica status via API InfinitePay.
Sincroniza pedidos com o banco de dados via REST endpoint interno.

Uso:
    python3 infinitepay_mcp.py

Variáveis de ambiente:
    FASTCHIPS_API_URL  — URL da API Hono (ex: http://localhost:3101)
    FASTCHIPS_API_KEY  — chave interna para autenticar chamadas
    FASTCHIPS_TEAM_ID  — team_id para registrar pedidos no DB
"""

import os
import sys
import json
import asyncio
import time
from pathlib import Path
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

try:
    import httpx
except ImportError:
    print("httpx não encontrado. Instale com: pip install httpx", file=sys.stderr)
    sys.exit(1)

# ── Configuração ───────────────────────────────────────────
INFINITEPAY_API_URL = "https://api.infinitepay.io"
HANDLE = "xperience_solutions"

FASTCHIPS_API_URL = os.environ.get("FASTCHIPS_API_URL", "http://localhost:3101")
FASTCHIPS_API_KEY = os.environ.get("FASTCHIPS_API_KEY", "")
FASTCHIPS_TEAM_ID = os.environ.get("FASTCHIPS_TEAM_ID", "")

# ── Pedidos em memória (sessão) ────────────────────────────
_orders: dict[str, dict] = {}

app = Server("infinitepay")


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _generate_order_nsu(player_uid: int | None) -> str:
    """Gera NSU no formato xp_{player_uid}_{timestamp}."""
    uid_part = player_uid if player_uid else "anon"
    return f"xp_{uid_part}_{int(time.time())}"


async def _sync_order_to_db(order: dict, action: str = "upsert") -> dict | None:
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
                "Gera um link de checkout InfinitePay para venda de fichas. "
                "O link permite pagamento via Pix ou cartão. "
                "Após gerar o link, envie ao jogador e use verificar_pagamento para confirmar. "
                "NUNCA envie fichas sem verificar o pagamento primeiro. "
                "PARÂMETROS OBRIGATÓRIOS: descricao, valor_reais, fichas."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "descricao": {
                        "type": "string",
                        "description": (
                            "[OBRIGATÓRIO] Descrição do item no checkout. "
                            "Exemplo: '500 Fichas - Xperience Poker'."
                        )
                    },
                    "valor_reais": {
                        "type": "number",
                        "description": (
                            "[OBRIGATÓRIO] Valor em reais (BRL). "
                            "Exemplo: 10.00 para R$ 10,00."
                        )
                    },
                    "fichas": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] Quantidade de fichas a entregar após pagamento confirmado. "
                            "Exemplo: 500."
                        )
                    },
                    "player_uid": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] UID PPPoker do jogador. "
                            "Se informado, facilita rastreamento e envio automático."
                        )
                    },
                    "player_nome": {
                        "type": "string",
                        "description": "[OPCIONAL] Nome do jogador."
                    },
                    "player_email": {
                        "type": "string",
                        "description": "[OPCIONAL] Email do jogador."
                    },
                    "player_telefone": {
                        "type": "string",
                        "description": "[OPCIONAL] Telefone do jogador."
                    }
                },
                "required": ["descricao", "valor_reais", "fichas"]
            }
        ),

        types.Tool(
            name="verificar_pagamento",
            description=(
                "Verifica o status de um pagamento InfinitePay pelo order_nsu. "
                "Retorna se o pagamento foi aprovado, valor pago, método, etc. "
                "Use SEMPRE antes de enviar fichas para confirmar que o pagamento foi efetuado. "
                "PARÂMETRO OBRIGATÓRIO: order_nsu."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "order_nsu": {
                        "type": "string",
                        "description": (
                            "[OBRIGATÓRIO] ID do pedido retornado por gerar_link_pagamento. "
                            "Formato: xp_{player_uid}_{timestamp}."
                        )
                    }
                },
                "required": ["order_nsu"]
            }
        ),

        types.Tool(
            name="listar_pedidos_pendentes",
            description=(
                "Lista todos os pedidos de pagamento em aberto nesta sessão. "
                "Mostra pedidos com status link_gerado (aguardando pagamento) "
                "e pago (aguardando envio de fichas). "
                "Não requer parâmetros."
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
        player_uid = arguments.get("player_uid")
        player_nome = arguments.get("player_nome")
        player_email = arguments.get("player_email")
        player_telefone = arguments.get("player_telefone")

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

        order_nsu = _generate_order_nsu(player_uid)
        valor_centavos = int(valor_reais * 100)

        # Montar payload InfinitePay
        checkout_payload = {
            "handle": HANDLE,
            "amount": valor_centavos,
            "order_nsu": order_nsu,
            "items": [
                {
                    "description": descricao,
                    "quantity": 1,
                    "amount": valor_centavos,
                }
            ],
        }

        if player_nome:
            checkout_payload["customer_name"] = player_nome
        if player_email:
            checkout_payload["customer_email"] = player_email
        if player_telefone:
            checkout_payload["customer_phone_number"] = player_telefone

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

        checkout_url = data.get("checkout_url") or data.get("url") or data.get("link")
        slug = data.get("slug") or data.get("id")

        # Salvar em memória
        order = {
            "orderNsu": order_nsu,
            "status": "link_gerado",
            "fichas": fichas,
            "valorReais": valor_reais,
            "checkoutUrl": checkout_url,
            "slug": slug,
            "playerUid": player_uid,
            "playerNome": player_nome,
            "playerEmail": player_email,
            "playerTelefone": player_telefone,
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
                f"Envie o link ao jogador. "
                f"Após pagamento, use verificar_pagamento(order_nsu='{order_nsu}') "
                f"para confirmar antes de enviar fichas."
            ),
        }, indent=2))]

    # ── verificar_pagamento ─────────────────────────────────
    elif name == "verificar_pagamento":
        order_nsu = arguments["order_nsu"]

        # Buscar na memória local
        local_order = _orders.get(order_nsu)

        # Consultar InfinitePay
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{INFINITEPAY_API_URL}/invoices/public/checkout/links/{order_nsu}",
                    headers={"Content-Type": "application/json"},
                )

                if resp.status_code == 404:
                    # Tentar endpoint alternativo
                    resp = await client.get(
                        f"{INFINITEPAY_API_URL}/invoices/public/{order_nsu}",
                        headers={"Content-Type": "application/json"},
                    )

                if resp.status_code not in (200, 201):
                    return [types.TextContent(type="text", text=json.dumps({
                        "status": "error",
                        "step": "infinitepay_api",
                        "http_status": resp.status_code,
                        "error": f"Não foi possível verificar o pedido {order_nsu}",
                        "detail": resp.text[:500],
                    }, indent=2))]

                data = resp.json()

        except Exception as e:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "step": "infinitepay_api",
                "error": str(e)
            }))]

        # Interpretar resposta
        payment_status = data.get("status", "").lower()
        is_paid = payment_status in ("paid", "approved", "captured", "confirmed")

        transaction_nsu = data.get("transaction_nsu") or data.get("nsu")
        capture_method = data.get("capture_method") or data.get("payment_method")
        paid_amount_raw = data.get("paid_amount") or data.get("amount")
        paid_amount = float(paid_amount_raw) / 100 if paid_amount_raw else None
        installments = data.get("installments")
        paid_at = data.get("paid_at") or data.get("updated_at")

        result = {
            "status": "success",
            "order_nsu": order_nsu,
            "paid": is_paid,
            "payment_status": payment_status,
            "transaction_nsu": transaction_nsu,
            "capture_method": capture_method,
            "paid_amount": paid_amount,
            "installments": installments,
            "paid_at": paid_at,
        }

        if local_order:
            result["fichas"] = local_order["fichas"]
            result["player_uid"] = local_order.get("playerUid")

        # Atualizar memória e DB se pago
        if is_paid and local_order:
            local_order["status"] = "pago"
            local_order["transactionNsu"] = transaction_nsu
            local_order["captureMethod"] = capture_method
            local_order["paidAmount"] = paid_amount
            local_order["installments"] = installments
            local_order["paidAt"] = paid_at
            _orders[order_nsu] = local_order
            await _sync_order_to_db(local_order)

            result["proximo_passo"] = (
                f"Pagamento CONFIRMADO! Agora use enviar_fichas("
                f"target_id={local_order.get('playerUid')}, "
                f"amount={local_order['fichas']}, "
                f"order_nsu='{order_nsu}') para entregar as fichas. "
                f"Após enviar, o pedido será marcado como fichas_enviadas."
            )
        elif is_paid:
            result["proximo_passo"] = (
                f"Pagamento CONFIRMADO! Use enviar_fichas(order_nsu='{order_nsu}') para entregar as fichas ao jogador."
            )
        else:
            result["proximo_passo"] = (
                "Pagamento AINDA NÃO confirmado. Aguarde o jogador pagar e verifique novamente."
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
                    "player_uid": order.get("playerUid"),
                    "player_nome": order.get("playerNome"),
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
            "error": f"Tool '{name}' não reconhecida"
        }))]


# ─────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await app.run(read_stream, write_stream, app.create_initialization_options())

if __name__ == "__main__":
    asyncio.run(main())
