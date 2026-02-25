"""
Nanobot HTTP Gateway — wraps the real nanobot AgentLoop as an SSE HTTP server.

Exposes POST /api/chat on port 18790 for the pppoker_web API adapter.
"""

import asyncio
import json
import os
import re
import time
import sys
import uuid
from pathlib import Path

# Load .env file (lightweight, no dependency on python-dotenv)
_env_file = Path(__file__).parent / ".env"
if _env_file.exists():
    for line in _env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip("'\"")
        if key and key not in os.environ:
            os.environ[key] = value

from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route
from sse_starlette.sse import EventSourceResponse

# ---------------------------------------------------------------------------
# Nanobot imports
# ---------------------------------------------------------------------------
from nanobot.config.loader import load_config, get_data_dir
from nanobot.bus.queue import MessageBus
from nanobot.agent.loop import AgentLoop
from nanobot.cron.service import CronService
from nanobot.session.manager import SessionManager

# ---------------------------------------------------------------------------
# Globals (initialized on startup)
# ---------------------------------------------------------------------------
_agent: AgentLoop | None = None
_bus: MessageBus | None = None

# Per-team gateway connections: { team_id: { "whatsapp": {...}, "telegram": {...} } }
_gateway_connections: dict[str, dict] = {}
_LLM_RETRY_ATTEMPTS = int(os.environ.get("NANOBOT_LLM_RETRY_ATTEMPTS", "4"))
_LLM_RETRY_DELAY_SECONDS = float(
    os.environ.get("NANOBOT_LLM_RETRY_DELAY_SECONDS", "1.5")
)
_PREWARM_TIMEOUT_SECONDS = 20
_PREWARM_ENABLED = os.environ.get("NANOBOT_PREWARM_ON_STARTUP", "false").lower() == "true"
_MCP_PRECONNECT_ENABLED = (
    os.environ.get("NANOBOT_MCP_PRECONNECT_ON_STARTUP", "true").lower() == "true"
)
_MCP_PRECONNECT_TIMEOUT_SECONDS = int(
    os.environ.get("NANOBOT_MCP_PRECONNECT_TIMEOUT_SECONDS", "40")
)
_AGENT_IDLE_TIMEOUT_SECONDS = int(os.environ.get("NANOBOT_AGENT_IDLE_TIMEOUT_SECONDS", "45"))
_AGENT_TOTAL_TIMEOUT_SECONDS = int(os.environ.get("NANOBOT_AGENT_TOTAL_TIMEOUT_SECONDS", "120"))
_mcp_connect_task: asyncio.Task | None = None
_agent_semaphore = asyncio.Semaphore(1)

# Runtime MCP policy:
# keep only read-only club information tools loaded in AgentLoop.
_ALLOWED_MCP_SERVERS = {"pppoker", "infinitepay"}
_ALLOWED_MCP_TOOL_NAMES = {
    "mcp_pppoker_login_status",
    "mcp_pppoker_info_membro",
    "mcp_pppoker_listar_membros",
    "mcp_pppoker_downlines_agente",
    "mcp_pppoker_listar_solicitacoes",
}

_ORIGINAL_CONNECT_MCP_SERVERS = None

# ---------------------------------------------------------------------------
# WhatsApp Bridge Manager — Daytona sandbox per team (secure, isolated)
# ---------------------------------------------------------------------------
_BRIDGE_DIR = Path(__file__).parent / "bridge"
_BRIDGE_PORT = 3001


class BridgeManager:
    """Manages per-team WhatsApp bridge sandboxes via Daytona."""

    def __init__(self):
        # { team_id: { "sandbox_id": str, "ws_url": str, "token": str } }
        self._bridges: dict[str, dict] = {}
        self._lock = asyncio.Lock()
        self._qr_active: set[str] = set()  # team_ids with active QR sessions
        self._daytona = None

    def _get_daytona(self):
        if self._daytona is None:
            from daytona import Daytona, DaytonaConfig

            api_key = os.environ.get("DAYTONA_API_KEY", "")
            api_url = os.environ.get("DAYTONA_SERVER_URL", "")
            target = os.environ.get("DAYTONA_TARGET", "us")
            if not api_key or not api_url:
                raise RuntimeError(
                    "DAYTONA_API_KEY and DAYTONA_SERVER_URL must be set"
                )
            self._daytona = Daytona(DaytonaConfig(
                api_key=api_key, api_url=api_url, target=target,
            ))
        return self._daytona

    async def ensure_bridge(self, team_id: str) -> tuple[str, str]:
        """Start a bridge sandbox for the team. Returns (ws_url, auth_header)."""
        async with self._lock:
            info = self._bridges.get(team_id)
            if info:
                return info["ws_url"], info["token"]

            # Run sync Daytona ops in thread to avoid blocking event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, self._create_bridge, team_id)
            self._bridges[team_id] = result
            return result["ws_url"], result["token"]

    def _create_bridge(self, team_id: str) -> dict:
        """Synchronous: create sandbox, upload bridge, build, start."""
        from daytona import CreateSandboxFromImageParams, SessionExecuteRequest

        daytona = self._get_daytona()
        sandbox_name = f"wa-bridge-{team_id[:8]}"

        # Check if a sandbox with this name already exists (from a previous run)
        sandbox = None
        try:
            existing = daytona.list()
            items = existing.items if hasattr(existing, "items") else existing
            for s in items:
                if getattr(s, "name", None) == sandbox_name:
                    sandbox = s
                    break
        except Exception as e:
            print(f"[bridge-manager] Failed to list sandboxes: {e}")

        if sandbox is not None:
            print(f"[bridge-manager] Found existing sandbox {sandbox_name}, removing it...")
            try:
                daytona.delete(sandbox)
            except Exception as e:
                print(f"[bridge-manager] Failed to delete old sandbox: {e}")

        print(f"[bridge-manager] Creating Daytona sandbox for team {team_id[:8]}...")
        try:
            sandbox = daytona.create(
                CreateSandboxFromImageParams(
                    image="node:20-slim",
                    name=sandbox_name,
                    language="javascript",
                    env_vars={"BRIDGE_PORT": str(_BRIDGE_PORT)},
                    auto_stop_interval=10,    # stop after 10 min idle
                    auto_delete_interval=60,  # delete after 1 hour
                ),
                timeout=120,
            )
        except Exception as create_err:
            if "already exists" in str(create_err).lower():
                # Race condition or stale sandbox — find it and delete, then retry
                print(f"[bridge-manager] Sandbox {sandbox_name} already exists, force-deleting...")
                try:
                    items = daytona.list()
                    items = items.items if hasattr(items, "items") else items
                    for s in items:
                        if getattr(s, "name", None) == sandbox_name:
                            daytona.delete(s)
                            break
                except Exception:
                    pass
                sandbox = daytona.create(
                    CreateSandboxFromImageParams(
                        image="node:20-slim",
                        name=sandbox_name,
                        language="javascript",
                        env_vars={"BRIDGE_PORT": str(_BRIDGE_PORT)},
                        auto_stop_interval=10,
                        auto_delete_interval=60,
                    ),
                    timeout=120,
                )
            else:
                raise

        # Upload bridge source files
        for root, dirs, files in os.walk(str(_BRIDGE_DIR)):
            dirs[:] = [d for d in dirs if d not in ("node_modules", "dist", ".git")]
            for f in files:
                local_path = os.path.join(root, f)
                rel_path = os.path.relpath(local_path, str(_BRIDGE_DIR))
                with open(local_path, "rb") as fh:
                    sandbox.fs.upload_file(fh.read(), f"/app/bridge/{rel_path}")

        # Install deps and build
        resp = sandbox.process.exec(
            "cd /app/bridge && npm install && npx tsc", timeout=60
        )
        if resp.exit_code != 0:
            daytona.delete(sandbox)
            raise RuntimeError(f"Bridge build failed: {resp.result[:300]}")

        # Start bridge as background session
        session_id = "bridge"
        sandbox.process.create_session(session_id)
        sandbox.process.execute_session_command(
            session_id,
            SessionExecuteRequest(
                command="cd /app/bridge && node dist/index.js",
                run_async=True,
            ),
        )

        # Get signed preview URL for WebSocket access
        import time
        time.sleep(3)  # wait for bridge to bind port
        signed = sandbox.create_signed_preview_url(_BRIDGE_PORT, expires_in_seconds=7200)
        ws_url = signed.url.replace("https://", "wss://")
        token = signed.token

        print(f"[bridge-manager] Bridge ready for team {team_id[:8]}: {ws_url}")
        return {
            "sandbox_id": sandbox.id,
            "sandbox": sandbox,
            "ws_url": ws_url,
            "token": token,
        }

    async def start_message_listener(self, team_id: str):
        """Start a persistent WebSocket listener for incoming WhatsApp messages."""
        info = self._bridges.get(team_id)
        if not info:
            print(f"[bridge-listener] No bridge for team {team_id[:8]}, cannot start listener")
            return

        # Don't start if already running
        if info.get("_listener_task") and not info["_listener_task"].done():
            return

        task = asyncio.create_task(self._message_loop(team_id))
        info["_listener_task"] = task
        print(f"[bridge-listener] Message listener started for team {team_id[:8]}")

    async def _message_loop(self, team_id: str):
        """Persistent loop: connect to bridge, receive messages, route to agent."""
        import websockets

        retry_delay = 2
        while team_id in self._bridges:
            info = self._bridges.get(team_id)
            if not info:
                break

            ws_url = info["ws_url"]
            token = info["token"]

            try:
                async with websockets.connect(
                    ws_url,
                    additional_headers={"Authorization": f"Bearer {token}"},
                ) as ws:
                    print(f"[bridge-listener] Connected to bridge for team {team_id[:8]}")
                    retry_delay = 2  # reset on success

                    while True:
                        try:
                            raw = await asyncio.wait_for(ws.recv(), timeout=60)
                            msg = json.loads(raw)
                            msg_type = msg.get("type", "")

                            if msg_type == "message":
                                # Process incoming WhatsApp message
                                asyncio.create_task(
                                    self._handle_inbound_message(team_id, msg, ws)
                                )
                            elif msg_type == "status":
                                status = msg.get("status", "")
                                gw = _get_team_gateway(team_id)
                                if status == "connected":
                                    gw["whatsapp"]["status"] = "connected"
                                elif status == "disconnected":
                                    gw["whatsapp"]["status"] = "disconnected"
                                print(f"[bridge-listener] WhatsApp status for {team_id[:8]}: {status}")
                        except asyncio.TimeoutError:
                            # Send ping to keep connection alive
                            try:
                                await ws.ping()
                            except Exception:
                                break
            except asyncio.CancelledError:
                break
            except Exception as e:
                print(f"[bridge-listener] Connection lost for {team_id[:8]}: {e}")
                if team_id not in self._bridges:
                    break
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 30)

        print(f"[bridge-listener] Listener stopped for team {team_id[:8]}")

    async def _handle_inbound_message(self, team_id: str, msg: dict, ws):
        """Route an incoming WhatsApp message to the nanobot agent and reply."""
        sender = msg.get("sender", "")
        content = msg.get("content", "")
        is_group = msg.get("isGroup", False)

        if not content or not sender:
            return

        # Skip group messages for now
        if is_group:
            return

        print(f"[bridge-listener] Message from {sender[:20]} for team {team_id[:8]}: {content[:80]}")

        if _agent is None:
            print("[bridge-listener] Agent not initialized, ignoring message")
            return

        # Build session key for WhatsApp conversations
        session_key = f"whatsapp:{team_id}:{sender}"

        try:
            async with _agent_semaphore:
                response = await asyncio.wait_for(
                    _agent.process_direct(
                        content=content,
                        session_key=session_key,
                        channel="whatsapp",
                        chat_id=session_key,
                        on_progress=None,
                    ),
                    timeout=_AGENT_TOTAL_TIMEOUT_SECONDS,
                )

            if response and response.strip():
                # Clean approval blocks and format for WhatsApp
                cleaned, _ = extract_approval_requests(response)
                safe_text = _sanitize_user_facing_response(cleaned)
                safe_text = _format_for_whatsapp(safe_text)

                if safe_text:
                    # Send reply back through bridge
                    reply_cmd = json.dumps({
                        "type": "send",
                        "to": sender,
                        "text": safe_text,
                    })
                    await ws.send(reply_cmd)
                    print(f"[bridge-listener] Replied to {sender[:20]} for team {team_id[:8]}")
        except asyncio.TimeoutError:
            print(f"[bridge-listener] Agent timeout for message from {sender[:20]}")
        except Exception as e:
            print(f"[bridge-listener] Error processing message: {e}")

    def stop_bridge(self, team_id: str):
        info = self._bridges.pop(team_id, None)
        if not info:
            return
        # Cancel listener task
        listener = info.get("_listener_task")
        if listener and not listener.done():
            listener.cancel()
        try:
            daytona = self._get_daytona()
            sandbox = info.get("sandbox")
            if sandbox:
                sandbox.process.delete_session("bridge")
                daytona.delete(sandbox)
            print(f"[bridge-manager] Deleted sandbox for team {team_id[:8]}...")
        except Exception as e:
            print(f"[bridge-manager] Cleanup error for team {team_id[:8]}: {e}")

    def stop_all(self):
        for team_id in list(self._bridges.keys()):
            self.stop_bridge(team_id)


_bridge_manager = BridgeManager()


def _make_provider(config):
    """Create LLM provider from config (same logic as nanobot CLI)."""
    from nanobot.providers.litellm_provider import LiteLLMProvider
    from nanobot.providers.custom_provider import CustomProvider

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)

    if provider_name == "custom":
        return CustomProvider(
            api_key=p.api_key if p else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )

    return LiteLLMProvider(
        api_key=p.api_key if p else None,
        api_base=config.get_api_base(model),
        default_model=model,
        extra_headers=p.extra_headers if p else None,
        provider_name=provider_name,
    )


def _install_filtered_connect_mcp_servers_patch():
    """Filter MCP tools at connection time (before registry.register)."""
    global _ORIGINAL_CONNECT_MCP_SERVERS
    if _ORIGINAL_CONNECT_MCP_SERVERS is not None:
        return

    from nanobot.agent.tools import mcp as mcp_module
    from nanobot.agent.tools.mcp import MCPToolWrapper, logger

    _ORIGINAL_CONNECT_MCP_SERVERS = mcp_module.connect_mcp_servers

    async def _filtered_connect_mcp_servers(mcp_servers, registry, stack):
        from mcp import ClientSession, StdioServerParameters
        from mcp.client.stdio import stdio_client

        for name, cfg in mcp_servers.items():
            try:
                if cfg.command:
                    params = StdioServerParameters(
                        command=cfg.command, args=cfg.args, env=cfg.env or None
                    )
                    read, write = await stack.enter_async_context(stdio_client(params))
                elif cfg.url:
                    from mcp.client.streamable_http import streamable_http_client

                    read, write, _ = await stack.enter_async_context(
                        streamable_http_client(cfg.url)
                    )
                else:
                    logger.warning(
                        f"MCP server '{name}': no command or url configured, skipping"
                    )
                    continue

                session = await stack.enter_async_context(ClientSession(read, write))
                await session.initialize()

                tools = await session.list_tools()
                registered_count = 0
                filtered_count = 0
                for tool_def in tools.tools:
                    wrapper = MCPToolWrapper(session, name, tool_def)
                    if wrapper.name not in _ALLOWED_MCP_TOOL_NAMES:
                        filtered_count += 1
                        logger.debug(
                            f"MCP: skipped tool '{wrapper.name}' from server '{name}' (filtered)"
                        )
                        continue
                    registry.register(wrapper)
                    registered_count += 1
                    logger.debug(
                        f"MCP: registered tool '{wrapper.name}' from server '{name}'"
                    )

                logger.info(
                    f"MCP server '{name}': connected, {registered_count} tools registered (filtered {filtered_count})"
                )
            except Exception as e:
                logger.error(f"MCP server '{name}': failed to connect: {e}")

    mcp_module.connect_mcp_servers = _filtered_connect_mcp_servers


async def _startup():
    """Initialize the nanobot agent on server start."""
    global _agent, _bus

    config = load_config()
    _install_filtered_connect_mcp_servers_patch()
    _bus = MessageBus()
    provider = _make_provider(config)
    session_manager = SessionManager(config.workspace_path)

    cron_store = get_data_dir() / "cron" / "jobs.json"
    cron = CronService(cron_store)

    # Keep only MCP servers explicitly allowed for lightweight runtime.
    filtered_mcp_servers = {
        name: server_cfg
        for name, server_cfg in (config.tools.mcp_servers or {}).items()
        if name in _ALLOWED_MCP_SERVERS
    }

    _agent = AgentLoop(
        bus=_bus,
        provider=provider,
        workspace=config.workspace_path,
        model=config.agents.defaults.model,
        temperature=config.agents.defaults.temperature,
        max_tokens=config.agents.defaults.max_tokens,
        max_iterations=config.agents.defaults.max_tool_iterations,
        memory_window=config.agents.defaults.memory_window,
        exec_config=config.tools.exec,
        cron_service=cron,
        restrict_to_workspace=config.tools.restrict_to_workspace,
        session_manager=session_manager,
        mcp_servers=filtered_mcp_servers,
    )
    print("[nanobot-runtime] Agent initialized with MCP tools and memory")
    print(
        f"[nanobot-runtime] MCP servers enabled: {', '.join(filtered_mcp_servers.keys()) or 'none'}"
    )
    if _MCP_PRECONNECT_ENABLED:
        global _mcp_connect_task
        _mcp_connect_task = asyncio.create_task(_connect_mcp_on_startup())
    else:
        print("[nanobot-runtime] MCP preconnect disabled")

    if _PREWARM_ENABLED:
        asyncio.create_task(_prewarm_agent())
    else:
        print("[nanobot-runtime] Agent prewarm disabled (set NANOBOT_PREWARM_ON_STARTUP=true to enable)")


async def _connect_mcp_on_startup():
    if _agent is None:
        return
    try:
        await asyncio.wait_for(_agent._connect_mcp(), timeout=_MCP_PRECONNECT_TIMEOUT_SECONDS)
        _enforce_mcp_tool_policy()
        active_mcp_tools = sorted(
            tool_name
            for tool_name in _agent.tools.tool_names
            if tool_name.startswith("mcp_")
        )
        print(
            f"[nanobot-runtime] Active MCP tools after filter ({len(active_mcp_tools)}): {', '.join(active_mcp_tools) or 'none'}"
        )
        print("[nanobot-runtime] MCP preconnect completed")
    except asyncio.TimeoutError:
        print("[nanobot-runtime] MCP preconnect timed out (will continue lazily)")
    except Exception as e:
        print(f"[nanobot-runtime] MCP preconnect failed (will continue lazily): {e}")


def _enforce_mcp_tool_policy():
    if _agent is None:
        return
    # Remove any MCP tool that is not in the allowlist.
    for tool_name in list(_agent.tools.tool_names):
        if not tool_name.startswith("mcp_"):
            continue
        if tool_name not in _ALLOWED_MCP_TOOL_NAMES:
            _agent.tools.unregister(tool_name)


async def _prewarm_agent():
    """Warm up model/session/tool stack in background to reduce first-request latency."""
    if _agent is None:
        return

    try:
        await asyncio.wait_for(
            _agent.process_direct(
                content="Responda apenas com: OK",
                session_key="web:__startup_prewarm__",
                channel="web",
                chat_id="web:__startup_prewarm__",
                on_progress=None,
            ),
            timeout=_PREWARM_TIMEOUT_SECONDS,
        )
        print("[nanobot-runtime] Agent prewarm completed")
    except asyncio.TimeoutError:
        print("[nanobot-runtime] Agent prewarm timed out (continuing)")
    except Exception as e:
        print(f"[nanobot-runtime] Agent prewarm failed (continuing): {e}")


async def _shutdown():
    """Cleanup on server stop."""
    global _agent
    _bridge_manager.stop_all()
    if _agent:
        await _agent.close_mcp()
        _agent.stop()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _extract_user_text(body: dict) -> str:
    """Extract user text from the adapter request body."""
    if text := body.get("text"):
        return text

    msg = body.get("message", {})
    if isinstance(msg, dict):
        if content := msg.get("content"):
            if isinstance(content, str) and content.strip():
                return content
        for part in msg.get("parts", []):
            if isinstance(part, dict) and part.get("type") == "text":
                if t := part.get("text"):
                    return t
    return ""


def _resolve_session_key(body: dict) -> str:
    """Build a session key from the request, including team/user for isolation."""
    chat_id = body.get("chatId") or "web"
    ctx = body.get("context", {})
    if isinstance(ctx, dict):
        chat_id = ctx.get("chatId", chat_id)
        team_id = ctx.get("teamId", "")
        user_id = ctx.get("userId", "")
        if team_id and user_id:
            return f"web:{team_id}:{user_id}:{chat_id}"
    return f"web:{chat_id}"


# ---------------------------------------------------------------------------
# Approval extraction
# ---------------------------------------------------------------------------

_APPROVAL_RE = re.compile(
    r"\[APPROVAL\]\s*(\{.*?\})\s*\[/APPROVAL\]",
    re.DOTALL,
)

_SENSITIVE_ACTIONS = {
    "enviar_fichas",
    "sacar_fichas",
    "gerar_link_pagamento",
    "aprovar_solicitacao",
    "rejeitar_solicitacao",
    "promover_membro",
    "remover_membro",
}

_APPROVAL_COMPLETED_RE = re.compile(
    r"^(?:Aprovacao concluida|APROVADO):\s*([a-zA-Z0-9_]+)\.\s*Resultado:\s*(.+)$",
    re.IGNORECASE | re.DOTALL,
)
_APPROVAL_FAILED_RE = re.compile(
    r"^Falha na aprovacao:\s*([a-zA-Z0-9_]+)\.\s*Erro:\s*(.+)$",
    re.IGNORECASE | re.DOTALL,
)
_APPROVAL_REJECTED_RE = re.compile(
    r"^Aprovacao rejeitada:\s*([a-zA-Z0-9_]+)\.\s*(.+)$",
    re.IGNORECASE | re.DOTALL,
)


def _is_transient_llm_error(error_text: str) -> bool:
    msg = (error_text or "").lower()
    return (
        "server disconnected" in msg
        or "anthropicexception" in msg
        or "internalservererror" in msg
        or "connection closed" in msg
        or "timeout" in msg
    )


def _format_for_whatsapp(text: str) -> str:
    """Convert markdown formatting to WhatsApp-compatible format."""
    if not text:
        return text

    import re as _re

    # Strip bold around URLs: **https://...** → https://...
    text = _re.sub(r'\*\*(https?://[^\s*]+)\*\*', r'\1', text)

    # Convert markdown bold **text** → *text* (WhatsApp bold)
    text = _re.sub(r'\*\*(.+?)\*\*', r'*\1*', text)

    # Convert markdown italic _text_ stays the same (WhatsApp uses _ too)

    # Convert markdown links [text](url) → text: url
    text = _re.sub(r'\[([^\]]+)\]\((https?://[^\)]+)\)', r'\1: \2', text)

    # Remove triple backticks (code blocks)
    text = text.replace('```', '')

    # Convert inline code `text` → text
    text = _re.sub(r'`([^`]+)`', r'\1', text)

    # Remove heading markers
    text = _re.sub(r'^#{1,6}\s+', '', text, flags=_re.MULTILINE)

    return text.strip()


def _sanitize_user_facing_response(response_text: str) -> str:
    text = (response_text or "").strip()
    if not text:
        return text

    lowered = text.lower()
    if "error calling llm" in lowered and _is_transient_llm_error(text):
        # Fix 15: Log original error for debugging before sanitizing
        print(f"[nanobot-runtime] Sanitized LLM error (original): {text[:500]}")
        return (
            "A conexao com o modelo caiu temporariamente. "
            "Nenhuma acao foi executada neste passo. Tente novamente."
        )

    return text


def extract_approval_requests(text: str) -> tuple[str, list[dict]]:
    """Extract [APPROVAL]{...}[/APPROVAL] blocks from agent text.

    Returns (cleaned_text, list_of_approval_dicts).
    Invalid JSON or unknown actions are silently dropped.
    """
    approvals: list[dict] = []

    def _replace(match: re.Match) -> str:
        raw = match.group(1)
        try:
            data = json.loads(raw)
        except (json.JSONDecodeError, ValueError):
            return ""  # malformed → remove block silently
        action = data.get("action", "")
        if action not in _SENSITIVE_ACTIONS:
            return ""  # unknown action → remove
        data.setdefault("id", str(uuid.uuid4()))
        approvals.append(data)
        return ""

    cleaned = _APPROVAL_RE.sub(_replace, text).strip()
    return cleaned, approvals


def _format_action_name(action: str) -> str:
    return (action or "").strip().replace("_", " ")


def _extract_approval_feedback_reply(user_text: str) -> str | None:
    """Check if the user message is approval feedback.

    "APROVADO:" messages are passed through to the agent so it can
    process the result (e.g. extract checkout_url and format response).
    Only failed/rejected get quick synthetic replies.
    """
    text = (user_text or "").strip()
    if not text:
        return None

    # Let "APROVADO:" / "Aprovacao concluida:" go to the agent for processing.
    # The agent has instructions in SOUL.md to handle these messages.
    # completed = _APPROVAL_COMPLETED_RE.match(text)  -- intentionally skipped

    failed = _APPROVAL_FAILED_RE.match(text)
    if failed:
        action = _format_action_name(failed.group(1))
        error_text = failed.group(2).strip()
        return (
            f"Recebi a falha na operacao de {action}.\n\n"
            f"Motivo informado: {error_text}\n\n"
            "Pode tentar novamente que eu sigo daqui."
        )

    rejected = _APPROVAL_REJECTED_RE.match(text)
    if rejected:
        action = _format_action_name(rejected.group(1))
        details = rejected.group(2).strip()
        return f"Entendido. A operacao de {action} foi cancelada pelo usuario.\n\n{details}"

    return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

async def health(request: Request):
    if _agent is None:
        return JSONResponse({
            "status": "degraded",
            "service": "nanobot-runtime",
            "agent": "fastchips",
            "reason": "agent not initialized",
            "mcp": False,
            "mcp_tools": [],
        })
    mcp_tools = sorted(
        t for t in _agent.tools.tool_names if t.startswith("mcp_")
    )
    return JSONResponse({
        "status": "ok",
        "service": "nanobot-runtime",
        "agent": "fastchips",
        "mcp": bool(_agent._mcp_servers),
        "mcp_tools": mcp_tools,
    })


async def chat(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)
    user_text = _extract_user_text(body)

    if not user_text.strip():
        return JSONResponse({"error": "No message text provided"}, status_code=400)

    approval_feedback_reply = _extract_approval_feedback_reply(user_text)
    if approval_feedback_reply:
        async def approval_feedback_events():
            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "routing", "agent": "orchestrator"}),
            }
            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "executing", "agent": "orchestrator"}),
            }
            yield {
                "event": "text-delta",
                "data": json.dumps({"delta": approval_feedback_reply}),
            }
            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "completing", "agent": "orchestrator"}),
            }
            yield {"event": "done", "data": "[DONE]"}

        return EventSourceResponse(approval_feedback_events(), sep="\n")

    session_key = _resolve_session_key(body)

    async def event_generator():
        task = None
        try:
            # If MCP connected lazily in a request path, enforce read-only tool policy.
            if _agent is not None and _agent._mcp_connected:
                _enforce_mcp_tool_policy()

            if _mcp_connect_task is not None and not _mcp_connect_task.done():
                yield {
                    "event": "agent-progress",
                    "data": json.dumps({"text": "Conectando ferramentas operacionais..."}),
                }
                try:
                    await asyncio.wait_for(asyncio.shield(_mcp_connect_task), timeout=15)
                except asyncio.TimeoutError:
                    yield {
                        "event": "agent-progress",
                        "data": json.dumps({"text": "Ferramentas MCP ainda conectando — algumas operacoes podem nao estar disponiveis."}),
                    }

            # Emit agent status: routing
            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "routing", "agent": "orchestrator"}),
            }
            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "executing", "agent": "orchestrator"}),
            }

            # Use a queue to bridge progress callbacks into the SSE generator
            progress_queue: asyncio.Queue[str | None] = asyncio.Queue()

            async def progress_callback(content: str):
                await progress_queue.put(content)

            # Run agent in background task
            _AGENT_IDLE_TIMEOUT = _AGENT_IDLE_TIMEOUT_SECONDS
            _AGENT_TOTAL_TIMEOUT = _AGENT_TOTAL_TIMEOUT_SECONDS

            result_future: asyncio.Future[str] = asyncio.get_event_loop().create_future()

            async def run_agent():
                async def _run_once() -> str:
                    async with _agent_semaphore:
                        return await _agent.process_direct(
                            content=user_text,
                            session_key=session_key,
                            channel="web",
                            chat_id=session_key,
                            on_progress=progress_callback,
                        )

                try:
                    response: str | None = None
                    last_error: Exception | None = None

                    for attempt in range(1, _LLM_RETRY_ATTEMPTS + 1):
                        try:
                            response = await _run_once()
                            break
                        except Exception as e:
                            last_error = e
                            transient_disconnect = _is_transient_llm_error(str(e))
                            if attempt < _LLM_RETRY_ATTEMPTS and transient_disconnect:
                                await progress_queue.put(
                                    "Conexao com provedor caiu, tentando novamente..."
                                )
                                # Heartbeat during retry: emit progress every 2s instead of blocking
                                delay = min(_LLM_RETRY_DELAY_SECONDS * attempt, 4.0)
                                elapsed_retry = 0.0
                                while elapsed_retry < delay:
                                    wait = min(2.0, delay - elapsed_retry)
                                    await asyncio.sleep(wait)
                                    elapsed_retry += wait
                                    await progress_queue.put(
                                        f"Reconectando ao provedor... (tentativa {attempt}/{_LLM_RETRY_ATTEMPTS})"
                                    )
                                continue
                            raise

                    if response is None:
                        raise last_error or RuntimeError("Falha desconhecida no agente")
                    result_future.set_result(response)
                except Exception as e:
                    result_future.set_exception(e)
                finally:
                    await progress_queue.put(None)  # Signal done

            task = asyncio.create_task(run_agent())
            start_time = time.monotonic()

            # Stream progress events while agent runs (with timeout guards)
            try:
                while True:
                    elapsed = time.monotonic() - start_time
                    remaining_total = _AGENT_TOTAL_TIMEOUT - elapsed
                    if remaining_total <= 0:
                        task.cancel()
                        yield {
                            "event": "error",
                            "data": json.dumps(
                                {
                                    "error": "Tempo limite do agente excedido. Operacao interrompida para evitar travamento."
                                }
                            ),
                        }
                        yield {"event": "done", "data": "[DONE]"}
                        return

                    wait_timeout = min(_AGENT_IDLE_TIMEOUT, max(0.1, remaining_total))
                    try:
                        item = await asyncio.wait_for(
                            progress_queue.get(), timeout=wait_timeout
                        )
                    except asyncio.TimeoutError:
                        # Agent is stuck — abort cleanly
                        task.cancel()
                        yield {
                            "event": "error",
                            "data": json.dumps({"error": "O agente demorou demais para responder. Tente novamente."}),
                        }
                        yield {"event": "done", "data": "[DONE]"}
                        return
                    if item is None:
                        break
                    yield {
                        "event": "agent-progress",
                        "data": json.dumps({"text": item}),
                    }
            except asyncio.CancelledError:
                yield {"event": "done", "data": "[DONE]"}
                return

            # Get final response
            try:
                response_text = await result_future
            except Exception as e:
                if _is_transient_llm_error(str(e)):
                    yield {
                        "event": "text-delta",
                        "data": json.dumps(
                            {
                                "delta": "A conexao com o modelo caiu temporariamente. Nenhuma acao foi executada neste passo. Tente novamente em seguida.\n\n"
                            }
                        ),
                    }
                    yield {"event": "done", "data": "[DONE]"}
                    return
                yield {
                    "event": "error",
                    "data": json.dumps({"error": str(e)}),
                }
                yield {"event": "done", "data": "[DONE]"}
                return

            # Sanitize raw provider errors so users never see internal stack text.
            safe_response_text = _sanitize_user_facing_response(response_text or "")

            # Extract approval requests before streaming text
            cleaned_text, approvals = extract_approval_requests(safe_response_text)

            # Stream the final text as a single delta (text is already complete in memory)
            if cleaned_text:
                yield {
                    "event": "text-delta",
                    "data": json.dumps({"delta": cleaned_text}),
                }

            # Emit approval-request SSE events
            for approval in approvals:
                yield {
                    "event": "approval-request",
                    "data": json.dumps(approval),
                }

            yield {
                "event": "agent-status",
                "data": json.dumps({"status": "completing", "agent": "orchestrator"}),
            }
            yield {"event": "done", "data": "[DONE]"}
        finally:
            # Fix 1: Cancel orphaned agent task on client disconnect
            if task and not task.done():
                task.cancel()
                try:
                    await task
                except (asyncio.CancelledError, Exception):
                    pass

    return EventSourceResponse(event_generator(), sep="\n")


# ---------------------------------------------------------------------------
# Gateway endpoints
# ---------------------------------------------------------------------------

def _get_team_gateway(team_id: str) -> dict:
    """Get or create gateway state for a team."""
    if team_id not in _gateway_connections:
        _gateway_connections[team_id] = {
            "whatsapp": {"status": "disconnected", "qr_data": None},
            "telegram": {"status": "disconnected", "bot_token": None},
        }
    return _gateway_connections[team_id]


async def gateway_status(request: Request):
    """GET /gateway/status?team_id=xxx — returns connection status for all channels."""
    team_id = request.query_params.get("team_id", "")
    if not team_id:
        return JSONResponse({"error": "team_id query param is required"}, status_code=400)

    gw = _get_team_gateway(team_id)
    return JSONResponse({
        "team_id": team_id,
        "whatsapp": {
            "status": gw["whatsapp"]["status"],
            "has_qr": gw["whatsapp"]["qr_data"] is not None,
        },
        "telegram": {
            "status": gw["telegram"]["status"],
            "has_token": gw["telegram"]["bot_token"] is not None,
        },
    })


async def gateway_whatsapp_qr(request: Request):
    """GET /gateway/whatsapp/qr?team_id=xxx — SSE stream that emits QR code data for WhatsApp linking."""
    team_id = request.query_params.get("team_id", "")
    if not team_id:
        return JSONResponse({"error": "team_id query param is required"}, status_code=400)

    gw = _get_team_gateway(team_id)

    async def qr_events():
        # Reject concurrent QR requests for the same team (React strict mode fires twice)
        if team_id in _bridge_manager._qr_active:
            yield {
                "event": "status",
                "data": json.dumps({"status": "already_in_progress", "team_id": team_id}),
            }
            yield {"event": "done", "data": "[DONE]"}
            return

        _bridge_manager._qr_active.add(team_id)
        try:
            async for event in _qr_events_inner(team_id, gw):
                yield event
        finally:
            _bridge_manager._qr_active.discard(team_id)

    async def _qr_events_inner(team_id, gw):
        # Emit current status
        yield {
            "event": "status",
            "data": json.dumps({
                "status": gw["whatsapp"]["status"],
                "team_id": team_id,
            }),
        }

        # If already connected, ensure listener is running and close
        if gw["whatsapp"]["status"] == "connected":
            await _bridge_manager.start_message_listener(team_id)
            yield {"event": "connected", "data": json.dumps({"team_id": team_id})}
            yield {"event": "done", "data": "[DONE]"}
            return

        # Create a Daytona sandbox with the WhatsApp bridge and connect
        # via WebSocket to receive QR codes (secure, isolated per team).
        gw["whatsapp"]["status"] = "waiting_qr"

        try:
            import websockets

            # Create or reuse Daytona sandbox for this team
            yield {
                "event": "status",
                "data": json.dumps({"status": "creating_sandbox", "team_id": team_id}),
            }
            ws_url, token = await _bridge_manager.ensure_bridge(team_id)

            async with websockets.connect(
                ws_url,
                additional_headers={"Authorization": f"Bearer {token}"},
            ) as ws:
                # Listen for QR codes and status updates (timeout after 120s)
                start = time.monotonic()
                while time.monotonic() - start < 120:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=30)
                        msg = json.loads(raw)
                        msg_type = msg.get("type", "")

                        if msg_type == "qr":
                            qr_data = msg.get("qr", "")
                            gw["whatsapp"]["qr_data"] = qr_data
                            yield {
                                "event": "qr",
                                "data": json.dumps({"qr_data": qr_data, "team_id": team_id}),
                            }
                        elif msg_type == "status" and msg.get("status") == "connected":
                            gw["whatsapp"]["status"] = "connected"
                            gw["whatsapp"]["qr_data"] = None
                            # Start persistent message listener
                            await _bridge_manager.start_message_listener(team_id)
                            yield {
                                "event": "connected",
                                "data": json.dumps({"team_id": team_id}),
                            }
                            yield {"event": "done", "data": "[DONE]"}
                            return
                    except asyncio.TimeoutError:
                        yield {
                            "event": "status",
                            "data": json.dumps({"status": "waiting_qr", "team_id": team_id}),
                        }

                # Timeout reached (120s) — stop the bridge sandbox
                gw["whatsapp"]["status"] = "disconnected"
                _bridge_manager.stop_bridge(team_id)
                yield {
                    "event": "timeout",
                    "data": json.dumps({"team_id": team_id}),
                }
                yield {"event": "done", "data": "[DONE]"}

        except Exception as e:
            gw["whatsapp"]["status"] = "error"
            error_msg = str(e)
            if "DAYTONA_API_KEY" in error_msg:
                error_msg = "Daytona not configured. Set DAYTONA_API_KEY and DAYTONA_SERVER_URL."
            yield {
                "event": "error",
                "data": json.dumps({"error": error_msg, "team_id": team_id}),
            }
            yield {"event": "done", "data": "[DONE]"}

    return EventSourceResponse(qr_events(), sep="\n")


async def gateway_whatsapp_disconnect(request: Request):
    """POST /gateway/whatsapp/disconnect — disconnect WhatsApp for a team."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = body.get("team_id", "")
    if not team_id:
        return JSONResponse({"error": "team_id is required"}, status_code=400)

    gw = _get_team_gateway(team_id)
    gw["whatsapp"] = {"status": "disconnected", "qr_data": None}
    _bridge_manager.stop_bridge(team_id)

    return JSONResponse({"success": True, "team_id": team_id})


async def gateway_telegram_connect(request: Request):
    """POST /gateway/telegram/connect — start Telegram bot with token for a team."""
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = body.get("team_id", "")
    bot_token = body.get("bot_token", "")
    if not team_id or not bot_token:
        return JSONResponse({"error": "team_id and bot_token are required"}, status_code=400)

    gw = _get_team_gateway(team_id)

    try:
        from telegram import Bot

        bot = Bot(token=bot_token)
        # Validate token by fetching bot info
        bot_info = await bot.get_me()
        gw["telegram"] = {"status": "connected", "bot_token": bot_token}
        return JSONResponse({
            "success": True,
            "status": "connected",
            "team_id": team_id,
            "bot_username": bot_info.username,
        })
    except ImportError:
        gw["telegram"] = {"status": "unavailable", "bot_token": None}
        return JSONResponse({
            "success": False,
            "error": "python-telegram-bot library not available",
            "team_id": team_id,
        }, status_code=501)
    except Exception as e:
        gw["telegram"] = {"status": "error", "bot_token": None}
        return JSONResponse({
            "success": False,
            "error": "Invalid bot token",
            "team_id": team_id,
        }, status_code=400)


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/api/chat", chat, methods=["POST"]),
        Route("/gateway/status", gateway_status, methods=["GET"]),
        Route("/gateway/whatsapp/qr", gateway_whatsapp_qr, methods=["GET"]),
        Route("/gateway/whatsapp/disconnect", gateway_whatsapp_disconnect, methods=["POST"]),
        Route("/gateway/telegram/connect", gateway_telegram_connect, methods=["POST"]),
    ],
    on_startup=[_startup],
    on_shutdown=[_shutdown],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("PORT", "18790"))
    print(f"[nanobot-runtime] Fastchips listening on http://localhost:{port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
