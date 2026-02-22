#!/usr/bin/env python3
"""
PPPoker MCP Server
Expõe operações do PPPoker como tools para agentes Claude.

Uso:
    python3 pppoker_mcp.py

Configurar no Claude Desktop (~/.claude/claude_desktop_config.json):
{
  "mcpServers": {
    "pppoker": {
      "command": "python3",
      "args": ["/caminho/para/Ppfichas/pppoker_mcp.py"]
    }
  }
}
"""

import sys
import json
import asyncio
from pathlib import Path
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp import types

# Import do nosso cliente PPPoker (usa diretório deste arquivo, sem path hardcoded)
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
from pppoker_direct_api import (
    http_login, crypto_password, xxtea_encode_for_http,
    PPPokerClient, build_add_coin_req, build_export_game_data_req,
    encode_varint, build_message, parse_response, PAPEL_NOME
)

# ── Conta operadora ───────────────────────────────────────────
DEFAULT_USERNAME = "FastchipsOnline"
DEFAULT_PASSWORD = "pppokerchips0000"

# ── Defaults testados e confirmados ───────────────────────────
# enviar_fichas / sacar_fichas:
#   clube 4191918 (liga 3357) → jogador exemplo: 11470719 ✓
DEFAULT_CLUBE    = 4191918
DEFAULT_LIGA     = 3357
DEFAULT_TARGET   = 11470719   # jogador de teste confirmado

# exportar_planilha:
#   clube 4366162 (liga 1765) → export confirmado ✓
DEFAULT_CLUBE_EXPORT = 4366162
DEFAULT_LIGA_EXPORT  = 1765
# ─────────────────────────────────────────────────────────────

app = Server("pppoker")


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def do_login() -> dict:
    """Faz HTTP login e retorna uid, rdkey, gserver_ip."""
    return http_login(DEFAULT_USERNAME, DEFAULT_PASSWORD)


def get_client(login_result: dict) -> PPPokerClient | None:
    """Cria e autentica um cliente TCP a partir de um login_result."""
    client = PPPokerClient(login_result['uid'], login_result['rdkey'])
    server = login_result.get('gserver_ip') or None
    if not client.connect(server):
        return None
    if not client.login():
        client.close()
        return None
    return client


# ─────────────────────────────────────────────────────────────
# Tools
# ─────────────────────────────────────────────────────────────

@app.list_tools()
async def list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="enviar_fichas",
            description=(
                "Envia fichas PPPoker para qualquer nível da hierarquia do clube: "
                "jogador, agente ou super agente. "
                "O servidor roteia automaticamente para o saldo correto com base no papel do destinatário: "
                "jogador → saldo de jogo; agente → caixa do agente; super agente → caixa do super agente. "
                "O login HTTP é feito automaticamente — não é necessário fornecer credenciais. "
                "PARÂMETROS OBRIGATÓRIOS: target_id e amount. "
                "PARÂMETROS OPCIONAIS: clube_id e liga_id (use os valores corretos do clube alvo; "
                "cada clube tem seu próprio ID e sua própria liga)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "target_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID numérico de quem vai RECEBER as fichas. "
                            "Pode ser jogador, agente ou super agente — o servidor roteia automaticamente. "
                            "Jogador → saldo de jogo. Agente/Super Agente → caixa (chip store). "
                            "Exemplo jogador: 11470719. Exemplo agente: 2914397. "
                            "Exemplo super agente: 11470719 (clube 4366162)."
                        )
                    },
                    "amount": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] Quantidade de fichas a enviar. "
                            "Valor inteiro positivo. Exemplo: 500. "
                            "O protocolo multiplica por 100 internamente (centavos), "
                            "mas você deve passar o valor face — ex: 500 envia 500 fichas."
                        )
                    },
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID numérico do clube onde a transferência ocorre. "
                            "Cada clube tem um ID único. Exemplo: 4191918. "
                            "Se não informado, usa o clube padrão configurado no servidor."
                        ),
                        "default": DEFAULT_CLUBE
                    },
                    "liga_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID numérico da liga/federação à qual o clube pertence. "
                            "Cada clube está vinculado a uma liga. Exemplo: 3357. "
                            "Deve corresponder à liga do clube_id informado. "
                            "Se não informado, usa a liga padrão configurada no servidor."
                        ),
                        "default": DEFAULT_LIGA
                    }
                },
                "required": ["target_id", "amount"]
            }
        ),

        types.Tool(
            name="sacar_fichas",
            description=(
                "Retira/saca fichas de um jogador dentro de um clube. "
                "Usa o mesmo protocolo de transferência com valor negativo. "
                "Requer que a conta operadora tenha permissão de agente no clube. "
                "PARÂMETROS OBRIGATÓRIOS: target_id e amount. "
                "PARÂMETROS OPCIONAIS: clube_id e liga_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "target_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID numérico do jogador de quem as fichas serão RETIRADAS. "
                            "Exemplo: 11470719."
                        )
                    },
                    "amount": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] Quantidade de fichas a retirar. "
                            "Valor inteiro positivo (a negação é aplicada automaticamente). "
                            "Exemplo: 500 retira 500 fichas do jogador."
                        )
                    },
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID numérico do clube onde ocorre a operação. "
                            "Deve ser um clube onde a conta operadora tem permissão de agente."
                        ),
                        "default": DEFAULT_CLUBE
                    },
                    "liga_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID da liga/federação correspondente ao clube_id. "
                            "Deve ser a liga vinculada ao clube informado."
                        ),
                        "default": DEFAULT_LIGA
                    }
                },
                "required": ["target_id", "amount"]
            }
        ),

        types.Tool(
            name="login_status",
            description=(
                "Verifica se o login HTTP da conta operadora está funcionando. "
                "Retorna uid (ID do usuário), rdkey (token de sessão) e servidor de jogo. "
                "Útil para diagnóstico — não requer parâmetros."
            ),
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),

        types.Tool(
            name="info_membro",
            description=(
                "Busca informações detalhadas de um membro específico de um clube PPPoker. "
                "Retorna: nome, papel (Dono/Gestor/Super Agente/Agente/Membro), título personalizado, "
                "avatar, data de entrada, última vez ativo, status online, "
                "saldo do caixa (para agentes/super agentes), crédito concedido, "
                "e lista de downlines (UIDs) para agentes. "
                "PARÂMETRO OBRIGATÓRIO: uid (ID do membro). "
                "PARÂMETRO OPCIONAL: clube_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "uid": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID numérico do membro a consultar. "
                            "Pode ser jogador, agente ou super agente."
                        )
                    },
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID do clube onde o membro está. "
                            f"Padrão de export: {DEFAULT_CLUBE_EXPORT}."
                        ),
                        "default": DEFAULT_CLUBE_EXPORT
                    }
                },
                "required": ["uid"]
            }
        ),

        types.Tool(
            name="listar_membros",
            description=(
                "Lista todos os membros de um clube PPPoker com hierarquia completa. "
                "Retorna nome, papel, título, status online, saldo do caixa, e downlines "
                "para cada membro. Pode ser filtrado por papel. "
                "PARÂMETRO OBRIGATÓRIO: clube_id. "
                "PARÂMETRO OPCIONAL: papel (filtro: 'todos', 'agente', 'super_agente', "
                "'membro', 'gestor', 'dono')."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube a listar membros. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "papel": {
                        "type": "string",
                        "description": (
                            "[OPCIONAL] Filtrar por papel. Valores: "
                            "'todos' (padrão), 'dono', 'gestor', 'super_agente', "
                            "'agente', 'membro'."
                        ),
                        "default": "todos"
                    }
                },
                "required": ["clube_id"]
            }
        ),

        types.Tool(
            name="downlines_agente",
            description=(
                "Lista os downlines (membros diretos) de um agente ou super agente. "
                "Retorna todos os jogadores e sub-agentes que estão sob o agente informado. "
                "PARÂMETROS OBRIGATÓRIOS: clube_id e agente_uid."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "agente_uid": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do agente ou super agente. "
                            f"Exemplo agente: {2914397}. Exemplo super agente: {11470719}."
                        )
                    }
                },
                "required": ["clube_id", "agente_uid"]
            }
        ),

        types.Tool(
            name="exportar_planilha",
            description=(
                "Exporta dados de jogo do clube para planilha Excel (.xlsx) enviada por email. "
                "O servidor PPPoker envia o arquivo diretamente para o email informado. "
                "A conta operadora precisa ter permissão de exportação no clube. "
                "PARÂMETROS OBRIGATÓRIOS: email, date_start, date_end. "
                "PARÂMETROS OPCIONAIS: clube_id e liga_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {
                        "type": "string",
                        "description": (
                            "[OBRIGATÓRIO] Endereço de email que vai RECEBER a planilha. "
                            "Exemplo: 'guilherme-varela@hotmail.com'. "
                            "O PPPoker envia o arquivo .xlsx diretamente para este email."
                        )
                    },
                    "date_start": {
                        "type": "string",
                        "description": (
                            "[OBRIGATÓRIO — SEMPRE PERGUNTAR AO USUÁRIO] "
                            "Data de início do período a exportar. Nunca assuma uma data padrão. "
                            "Formato: YYYYMMDD (ano 4 dígitos + mês 2 dígitos + dia 2 dígitos). "
                            "Exemplo: '20250901' para 1 de setembro de 2025."
                        )
                    },
                    "date_end": {
                        "type": "string",
                        "description": (
                            "[OBRIGATÓRIO — SEMPRE PERGUNTAR AO USUÁRIO] "
                            "Data de fim do período a exportar. Nunca assuma uma data padrão. "
                            "Formato: YYYYMMDD. Exemplo: '20250907'. "
                            "Máximo recomendado: 7 dias por exportação (períodos muito longos retornam erro -3)."
                        )
                    },
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID numérico do clube cujos dados serão exportados. "
                            "A conta operadora deve ter permissão de exportação neste clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        ),
                        "default": DEFAULT_CLUBE_EXPORT
                    },
                    "liga_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID da liga/federação vinculada ao clube. "
                            "Deve corresponder exatamente ao clube_id informado — "
                            f"liga errada retorna erro -5. Exemplo: {DEFAULT_LIGA_EXPORT}."
                        ),
                        "default": DEFAULT_LIGA_EXPORT
                    }
                },
                "required": ["email", "date_start", "date_end"]
            }
        ),

        types.Tool(
            name="listar_mesas",
            description=(
                "Lista todas as salas/mesas de um clube PPPoker (torneios MTT e cash games). "
                "Retorna: nome da mesa, tipo de jogo (NLH, PLO4, PLO5, MTT, etc.), "
                "status (rodando/parada/registrando), jogadores atuais/máximo, "
                "buy-in, rake, prize pool, horário agendado, e mais. "
                "PARÂMETRO OBRIGATÓRIO: clube_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube para listar mesas. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "apenas_ativas": {
                        "type": "boolean",
                        "description": (
                            "[OPCIONAL] Se true, retorna apenas mesas que estão rodando agora. "
                            "Se false ou omitido, retorna todas (ativas + inativas)."
                        ),
                        "default": False
                    }
                },
                "required": ["clube_id"]
            }
        ),

        types.Tool(
            name="clubes_da_liga",
            description=(
                "Lista todos os clubes que fazem parte de uma liga/federação PPPoker. "
                "Retorna: nome do clube, avatar, quantidade de membros máxima, "
                "saldo, data de ingresso e status. "
                "PARÂMETRO OBRIGATÓRIO: liga_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "liga_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID da liga/federação. "
                            f"Exemplo: {DEFAULT_LIGA_EXPORT}."
                        )
                    },
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OPCIONAL] ID de um clube na liga (necessário para entrar no contexto). "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        ),
                        "default": DEFAULT_CLUBE_EXPORT
                    }
                },
                "required": ["liga_id"]
            }
        ),

        types.Tool(
            name="listar_solicitacoes",
            description=(
                "Lista solicitações de entrada pendentes em um clube PPPoker. "
                "Mostra quem pediu para entrar e está aguardando aprovação. "
                "PARÂMETRO OBRIGATÓRIO: clube_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube para ver solicitações pendentes. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    }
                },
                "required": ["clube_id"]
            }
        ),

        types.Tool(
            name="aprovar_solicitacao",
            description=(
                "Aprova uma solicitação de entrada pendente em um clube PPPoker. "
                "Primeiro use listar_solicitacoes para obter o request_id. "
                "PARÂMETROS OBRIGATÓRIOS: clube_id, request_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "request_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID da solicitação (obtido via listar_solicitacoes)."
                        )
                    }
                },
                "required": ["clube_id", "request_id"]
            }
        ),

        types.Tool(
            name="rejeitar_solicitacao",
            description=(
                "Rejeita uma solicitação de entrada pendente em um clube PPPoker. "
                "Primeiro use listar_solicitacoes para obter o request_id. "
                "PARÂMETROS OBRIGATÓRIOS: clube_id, request_id."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "request_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID da solicitação (obtido via listar_solicitacoes)."
                        )
                    }
                },
                "required": ["clube_id", "request_id"]
            }
        ),

        types.Tool(
            name="promover_membro",
            description=(
                "Promove ou rebaixa um membro do clube PPPoker. "
                "Pode promover a Agente (5), Super Agente (4), Gestor (2) ou rebaixar a Membro (10). "
                "PARÂMETROS OBRIGATÓRIOS: clube_id, target_uid, papel."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "target_uid": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] UID do membro a ser promovido/rebaixado."
                        )
                    },
                    "papel": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] Novo papel: "
                            "2=Gestor, 4=Super Agente, 5=Agente, 10=Membro. "
                            "SEMPRE PERGUNTAR ao usuário qual papel deseja antes de executar."
                        ),
                        "enum": [2, 4, 5, 10]
                    }
                },
                "required": ["clube_id", "target_uid", "papel"]
            }
        ),

        types.Tool(
            name="remover_membro",
            description=(
                "Remove (kick) um membro do clube PPPoker. "
                "AÇÃO IRREVERSÍVEL: o membro precisará solicitar entrada novamente. "
                "SEMPRE CONFIRMAR com o usuário antes de executar. "
                "PARÂMETROS OBRIGATÓRIOS: clube_id, target_uid."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "clube_id": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] ID do clube. "
                            f"Exemplo: {DEFAULT_CLUBE_EXPORT}."
                        )
                    },
                    "target_uid": {
                        "type": "integer",
                        "description": (
                            "[OBRIGATÓRIO] UID do membro a ser removido do clube."
                        )
                    }
                },
                "required": ["clube_id", "target_uid"]
            }
        ),

    ]


@app.call_tool()
async def call_tool(name: str, arguments: dict) -> list[types.TextContent]:

    # ── login_status ──────────────────────────────────────────
    if name == "login_status":
        result = do_login()
        if result['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "ok",
                "uid": result['uid'],
                "rdkey": result['rdkey'],
                "server": result.get('gserver_ip'),
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": result.get('error')
            }, indent=2))]

    # ── enviar_fichas ─────────────────────────────────────────
    elif name == "enviar_fichas":
        target_id = int(arguments["target_id"])
        amount    = int(arguments["amount"])
        clube_id  = int(arguments.get("clube_id", DEFAULT_CLUBE))
        liga_id   = int(arguments.get("liga_id",  DEFAULT_LIGA))

        # 1) HTTP login
        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        # 2) TCP connect + auth
        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        # 3) Transfer
        try:
            result = client.transfer_chips(
                target_player_id=target_id,
                amount=amount,
                clube_id=clube_id,
                liga_id=liga_id
            )
        finally:
            client.close()

        if result['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "message": f"{amount} fichas enviadas para o jogador {target_id}",
                "uid_remetente": login['uid'],
                "rdkey": login['rdkey'],
                "clube": clube_id,
                "liga": liga_id,
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "transfer", "error": result.get('error')
            }, indent=2))]

    # ── sacar_fichas ──────────────────────────────────────────
    elif name == "sacar_fichas":
        target_id = int(arguments["target_id"])
        amount    = int(arguments["amount"])
        clube_id  = int(arguments.get("clube_id", DEFAULT_CLUBE))
        liga_id   = int(arguments.get("liga_id",  DEFAULT_LIGA))

        # 1) HTTP login
        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        # 2) TCP connect + auth
        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        # 3) Withdraw — mesmo AddCoinREQ mas amount negativo
        # O campo 7 do protobuf usa int64 unsigned (varint). Para negativo
        # usamos complemento de 2 em 64 bits: -N = 2^64 - N
        import struct as _struct, time as _time
        timestamp = int(_time.time())
        txn_id = f"{clube_id}_{login['uid']}_{timestamp}"
        payload = b''
        payload += bytes([0x08]) + encode_varint(clube_id)
        payload += bytes([0x20]) + encode_varint(liga_id)
        payload += bytes([0x28, 0x00])
        payload += bytes([0x30]) + encode_varint(target_id)
        # Negativo em varint: -N como uint64
        neg_amount = (2**64) - (amount * 100)
        payload += bytes([0x38]) + encode_varint(neg_amount)
        txn_bytes = txn_id.encode()
        payload += bytes([0x42]) + encode_varint(len(txn_bytes)) + txn_bytes
        req = build_message('pb.AddCoinREQ', payload)

        try:
            client.send(req)
            import time as _t; _t.sleep(0.8)
            resp = client.recv(8192)
        finally:
            client.close()

        if not resp:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": "Sem resposta do servidor"
            }))]

        parsed = parse_response(resp)
        success = parsed['message'] in ('pb.AddCoinRSP', 'pb.ClubAgentPPCoinRSP')
        return [types.TextContent(type="text", text=json.dumps({
            "status": "success" if success else "unknown",
            "message_received": parsed['message'],
            "payload_hex": parsed.get('payload_hex', '')[:60],
            "note": f"Saque de {amount} fichas do jogador {target_id}. Verifique resposta."
        }, indent=2))]

    # ── info_membro ───────────────────────────────────────────
    elif name == "info_membro":
        uid      = int(arguments["uid"])
        clube_id = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.get_member_info(clube_id, uid)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error', 'Membro não encontrado')
            }, indent=2))]

        # Formatar timestamps
        import datetime
        def fmt_ts(ts):
            if not ts:
                return None
            try:
                return datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                return ts

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "clube_id": clube_id,
            "uid": result['uid'],
            "nome": result['nome'],
            "papel": result['papel'],
            "titulo": result['titulo'],
            "online": result['online'],
            "data_entrada": fmt_ts(result.get('join_ts')),
            "ultimo_acesso": fmt_ts(result.get('last_active_ts')),
            "saldo_caixa": result.get('saldo_caixa'),
            "credito_linha": result.get('credito_linha'),
            "agente_uid": result.get('agente_uid'),
            "agente_nome": result.get('agente_nome'),
            "super_agente_uid": result.get('super_agente_uid'),
            "super_agente_nome": result.get('super_agente_nome'),
            "downlines_count": len(result.get('downlines', [])),
            "downlines_uids": result.get('downlines', []),
        }, indent=2))]

    # ── listar_membros ────────────────────────────────────────
    elif name == "listar_membros":
        clube_id = int(arguments["clube_id"])
        papel    = arguments.get("papel", "todos").lower()

        PAPEL_FILTRO = {
            'dono': [1], 'gestor': [2], 'super_agente': [4],
            'agente': [5], 'membro': [10],
            'todos': [1, 2, 4, 5, 10],
        }
        papeis_alvo = PAPEL_FILTRO.get(papel, [1, 2, 4, 5, 10])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.list_club_members(clube_id)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error')
            }, indent=2))]

        members = [m for m in result['members'] if m['papel_num'] in papeis_alvo]
        members_out = []
        for m in members:
            entry = {
                "uid": m['uid'],
                "nome": m['nome'],
                "papel": m['papel'],
                "titulo": m['titulo'],
                "online": m['online'],
            }
            if m.get('saldo_caixa') is not None:
                entry['saldo_caixa'] = m['saldo_caixa']
            if m.get('credito_linha', -1) != -1:
                entry['credito_linha'] = m['credito_linha']
            if m.get('agente_nome'):
                entry['agente'] = m['agente_nome']
            if m.get('downlines'):
                entry['downlines_count'] = len(m['downlines'])
            members_out.append(entry)

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "clube_id": clube_id,
            "papel_filtro": papel,
            "total": len(members_out),
            "membros": members_out,
        }, indent=2))]

    # ── downlines_agente ──────────────────────────────────────
    elif name == "downlines_agente":
        clube_id   = int(arguments["clube_id"])
        agente_uid = int(arguments["agente_uid"])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.list_club_members(clube_id)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error')
            }, indent=2))]

        # Primeiro, encontra o agente alvo
        agente_info = next((m for m in result['members'] if m['uid'] == agente_uid), None)

        # Downlines diretos: membros cujo agente_uid == agente_uid
        downlines = [m for m in result['members'] if m.get('agente_uid') == agente_uid and m['uid'] != agente_uid]

        downlines_out = []
        for m in downlines:
            entry = {
                "uid": m['uid'],
                "nome": m['nome'],
                "papel": m['papel'],
                "titulo": m['titulo'],
                "online": m['online'],
            }
            if m.get('saldo_caixa') is not None:
                entry['saldo_caixa'] = m['saldo_caixa']
            if m.get('credito_linha', -1) != -1:
                entry['credito_linha'] = m['credito_linha']
            if m.get('downlines'):
                entry['downlines_count'] = len(m['downlines'])
            downlines_out.append(entry)

        agente_out = {}
        if agente_info:
            agente_out = {
                "uid": agente_info['uid'],
                "nome": agente_info['nome'],
                "papel": agente_info['papel'],
                "titulo": agente_info['titulo'],
                "online": agente_info['online'],
                "saldo_caixa": agente_info.get('saldo_caixa'),
            }

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "clube_id": clube_id,
            "agente": agente_out,
            "total_downlines": len(downlines_out),
            "downlines": downlines_out,
        }, indent=2))]

    # ── exportar_planilha ─────────────────────────────────────
    elif name == "exportar_planilha":
        email      = arguments["email"]
        date_start = arguments["date_start"]
        date_end   = arguments["date_end"]
        clube_id   = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))
        liga_id    = int(arguments.get("liga_id",  DEFAULT_LIGA_EXPORT))

        # 1) HTTP login
        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        # 2) TCP connect + auth
        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        # 3) Enter club (required before export)
        client.enter_club(clube_id)

        # 4) Export
        try:
            result = client.export_data(
                club_id=clube_id,
                liga_id=liga_id,
                email=email,
                date_start=date_start,
                date_end=date_end,
            )
        finally:
            client.close()

        if result['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "message": f"Planilha enviada para {email}",
                "periodo": f"{date_start} a {date_end}",
                "clube": clube_id,
                "liga": liga_id,
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "export", "error": result.get('error')
            }, indent=2))]

    # ── listar_solicitacoes ───────────────────────────────────
    elif name == "listar_solicitacoes":
        clube_id = int(arguments["clube_id"])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.list_join_requests(clube_id)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error')
            }, indent=2))]

        requests_out = []
        import datetime
        for r in result['requests']:
            entry = {
                "request_id": r.get('request_id'),
                "uid": r.get('uid'),
                "nome": r.get('nome', ''),
            }
            if r.get('mensagem'):
                entry['mensagem'] = r['mensagem']
            if r.get('avatar_url'):
                entry['avatar_url'] = r['avatar_url']
            if r.get('timestamp'):
                try:
                    entry['data_solicitacao'] = datetime.datetime.fromtimestamp(
                        r['timestamp']).strftime('%Y-%m-%d %H:%M')
                except:
                    entry['data_solicitacao'] = r['timestamp']
            requests_out.append(entry)

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "clube_id": clube_id,
            "total_pendentes": len(requests_out),
            "solicitacoes": requests_out,
            "nota": "Use aprovar_solicitacao ou rejeitar_solicitacao com o request_id para aprovar/rejeitar."
        }, indent=2))]

    # ── aprovar_solicitacao ──────────────────────────────────
    elif name == "aprovar_solicitacao":
        clube_id = int(arguments["clube_id"])
        request_id = int(arguments["request_id"])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.handle_join_request(clube_id, request_id, accept=True)
        finally:
            client.close()

        if result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "action": "approved",
                "clube_id": clube_id,
                "request_id": request_id,
                "uid_approved": result.get('uid_handled'),
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": result.get('error', f"Código de erro: {result.get('code')}"),
                "code": result.get('code'),
            }, indent=2))]

    # ── rejeitar_solicitacao ─────────────────────────────────
    elif name == "rejeitar_solicitacao":
        clube_id = int(arguments["clube_id"])
        request_id = int(arguments["request_id"])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.handle_join_request(clube_id, request_id, accept=False)
        finally:
            client.close()

        if result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "action": "rejected",
                "clube_id": clube_id,
                "request_id": request_id,
                "uid_rejected": result.get('uid_handled'),
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": result.get('error', f"Código de erro: {result.get('code')}"),
                "code": result.get('code'),
            }, indent=2))]

    # ── promover_membro ────────────────────────────────────────
    elif name == "promover_membro":
        clube_id = int(arguments["clube_id"])
        target_uid = int(arguments["target_uid"])
        papel = int(arguments["papel"])

        ROLE_NAMES = {1: 'Dono', 2: 'Gestor', 4: 'Super Agente', 5: 'Agente', 10: 'Membro'}
        if papel not in ROLE_NAMES or papel == 1:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": f"Papel inválido: {papel}. Use: 2=Gestor, 4=Super Agente, 5=Agente, 10=Membro"
            }))]

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.set_member_role(clube_id, target_uid, papel)
        finally:
            client.close()

        if result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "action": "role_changed",
                "clube_id": clube_id,
                "uid": target_uid,
                "novo_papel": result.get('new_role'),
                "novo_papel_nome": result.get('new_role_name'),
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": result.get('error', f"Código de erro: {result.get('code')}"),
                "code": result.get('code'),
            }, indent=2))]

    # ── remover_membro ────────────────────────────────────────
    elif name == "remover_membro":
        clube_id = int(arguments["clube_id"])
        target_uid = int(arguments["target_uid"])

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.kick_member(clube_id, target_uid)
        finally:
            client.close()

        if result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "success",
                "action": "member_kicked",
                "clube_id": clube_id,
                "uid_kicked": result.get('uid_kicked'),
            }, indent=2))]
        else:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error",
                "error": result.get('error', f"Código de erro: {result.get('code')}"),
                "code": result.get('code'),
            }, indent=2))]

    # ── listar_mesas ──────────────────────────────────────────
    elif name == "listar_mesas":
        clube_id     = int(arguments["clube_id"])
        apenas_ativas = arguments.get("apenas_ativas", False)

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.list_club_rooms(clube_id)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error')
            }, indent=2))]

        rooms = result['rooms']
        if apenas_ativas:
            rooms = [r for r in rooms if r['is_running']]

        # Formatar timestamps
        import datetime
        def fmt_ts(ts):
            if not ts:
                return None
            try:
                return datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M')
            except:
                return ts

        rooms_out = []
        for r in rooms:
            entry = {
                "room_id": r['room_id'],
                "nome": r['nome'],
                "tipo": r['game_type'],
                "torneio": r['is_tournament'],
                "rodando": r['is_running'],
                "jogadores": r['current_players'],
                "max_jogadores": r['max_players'],
                "buy_in": r['buy_in'],
                "rake": r['rake'],
            }
            if r['is_tournament']:
                entry.update({
                    "registrados": r['registered'],
                    "starting_chips": r['starting_chips'],
                    "blind_duration_s": r['blind_duration'],
                    "garantido": r['guaranteed'],
                    "late_reg_level": r['late_reg_level'],
                })
                if r.get('prize'):
                    entry["prize_pool"] = r['prize']
            if r.get('scheduled_ts'):
                entry["agendado"] = fmt_ts(r['scheduled_ts'])
            if r.get('start_ts'):
                entry["inicio"] = fmt_ts(r['start_ts'])
            if r.get('creation_ts'):
                entry["criado"] = fmt_ts(r['creation_ts'])
            rooms_out.append(entry)

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "clube_id": clube_id,
            "liga_id": result.get('liga_id'),
            "total": len(rooms_out),
            "mesas": rooms_out,
        }, indent=2))]

    # ── clubes_da_liga ─────────────────────────────────────────
    elif name == "clubes_da_liga":
        liga_id  = int(arguments["liga_id"])
        clube_id = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))

        login = do_login()
        if not login['success']:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "login", "error": login.get('error')
            }))]

        client = get_client(login)
        if not client:
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "step": "tcp_auth", "error": "Falha ao conectar/autenticar TCP"
            }))]

        try:
            client.enter_club(clube_id)
            result = client.list_league_clubs(liga_id)
        finally:
            client.close()

        if not result.get('success'):
            return [types.TextContent(type="text", text=json.dumps({
                "status": "error", "error": result.get('error')
            }, indent=2))]

        import datetime
        def fmt_ts2(ts):
            if not ts:
                return None
            try:
                return datetime.datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
            except:
                return ts

        clubs_out = []
        for c in result['clubs']:
            clubs_out.append({
                "club_id": c['club_id'],
                "nome": c['nome'],
                "max_members": c['max_members'],
                "saldo": c['saldo'],
                "credito": c['credito'],
                "diamantes": c['diamantes'],
                "data_ingresso": fmt_ts2(c.get('join_ts')),
            })

        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "liga_id": liga_id,
            "total": len(clubs_out),
            "clubes": clubs_out,
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
