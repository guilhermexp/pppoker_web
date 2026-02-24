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
_LLM_RETRY_ATTEMPTS = 2
_LLM_RETRY_DELAY_SECONDS = 1.5
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


async def _startup():
    """Initialize the nanobot agent on server start."""
    global _agent, _bus

    config = load_config()
    _bus = MessageBus()
    provider = _make_provider(config)
    session_manager = SessionManager(config.workspace_path)

    cron_store = get_data_dir() / "cron" / "jobs.json"
    cron = CronService(cron_store)

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
        mcp_servers=config.tools.mcp_servers,
    )
    print("[nanobot-runtime] Agent initialized with MCP tools and memory")
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
        print("[nanobot-runtime] MCP preconnect completed")
    except asyncio.TimeoutError:
        print("[nanobot-runtime] MCP preconnect timed out (will continue lazily)")
    except Exception as e:
        print(f"[nanobot-runtime] MCP preconnect failed (will continue lazily): {e}")


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
    """Build a session key from the request."""
    chat_id = body.get("chatId") or "web"
    ctx = body.get("context", {})
    if isinstance(ctx, dict):
        chat_id = ctx.get("chatId", chat_id)
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


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

async def health(request: Request):
    return JSONResponse({
        "status": "ok",
        "service": "nanobot-runtime",
        "agent": "fastchips",
        "mcp": bool(_agent and _agent._mcp_servers),
    })


async def chat(request: Request):
    body = await request.json()
    user_text = _extract_user_text(body)

    if not user_text.strip():
        return JSONResponse({"error": "No message text provided"}, status_code=400)

    session_key = _resolve_session_key(body)

    async def event_generator():
        if _mcp_connect_task is not None and not _mcp_connect_task.done():
            yield {
                "event": "text-delta",
                "data": json.dumps({"delta": "[Conectando ferramentas operacionais...]\n\n"}),
            }
            try:
                await asyncio.wait_for(asyncio.shield(_mcp_connect_task), timeout=15)
            except asyncio.TimeoutError:
                pass

        # Emit agent status: routing
        yield {
            "event": "agent-status",
            "data": json.dumps({"status": "routing", "agent": "orchestrator"}),
        }
        yield {
            "event": "agent-status",
            "data": json.dumps({"status": "executing", "agent": "orchestrator"}),
        }

        # Progress callback — sends tool usage info as progress events
        async def on_progress(content: str):
            yield  # This doesn't work as a nested generator — use a queue instead

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
                        msg = str(e).lower()
                        transient_disconnect = (
                            "server disconnected" in msg
                            or "anthropicexception" in msg
                            or "internalservererror" in msg
                            or "connection closed" in msg
                        )
                        if attempt < _LLM_RETRY_ATTEMPTS and transient_disconnect:
                            await progress_queue.put(
                                "Conexao com provedor caiu, tentando novamente..."
                            )
                            await asyncio.sleep(_LLM_RETRY_DELAY_SECONDS)
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

                wait_timeout = min(_AGENT_IDLE_TIMEOUT, remaining_total)
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
                    "event": "text-delta",
                    "data": json.dumps({"delta": f"[{item}]\n\n"}),
                }
        except asyncio.CancelledError:
            yield {"event": "done", "data": "[DONE]"}
            return

        # Get final response
        try:
            response_text = await result_future
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }
            yield {"event": "done", "data": "[DONE]"}
            return

        # Extract approval requests before streaming text
        cleaned_text, approvals = extract_approval_requests(response_text or "")

        # Stream the final text as delta chunks
        if cleaned_text:
            # Send in chunks for smoother UI
            chunk_size = 20
            for i in range(0, len(cleaned_text), chunk_size):
                chunk = cleaned_text[i : i + chunk_size]
                yield {
                    "event": "text-delta",
                    "data": json.dumps({"delta": chunk}),
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

    return EventSourceResponse(event_generator(), sep="\n")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = Starlette(
    routes=[
        Route("/health", health, methods=["GET"]),
        Route("/api/chat", chat, methods=["POST"]),
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
