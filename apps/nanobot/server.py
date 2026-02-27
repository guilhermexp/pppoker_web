"""
Nanobot HTTP Gateway — wraps the real nanobot AgentLoop as an SSE HTTP server.

Exposes POST /api/chat on port 18790 for the pppoker_web API adapter.
"""

import asyncio
import base64
import dataclasses
import hashlib
import json
import os
import re
import shutil
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
_base_config = None
_agent_runtimes: dict[str, dict] = {}
_agent_runtimes_lock = asyncio.Lock()
_oauth_pending_logins: dict[str, dict] = {}
_oauth_pending_logins_lock = asyncio.Lock()

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

        runtime = await _get_or_create_team_runtime(team_id, None)
        agent = runtime["agent"]
        semaphore = runtime["semaphore"]

        # Build session key for WhatsApp conversations
        session_key = f"whatsapp:{team_id}:{sender}"

        try:
            if agent._mcp_connected:
                _enforce_mcp_tool_policy(agent)

            mcp_connect_task = runtime.get("mcp_connect_task")
            if mcp_connect_task is not None and not mcp_connect_task.done():
                try:
                    await asyncio.wait_for(asyncio.shield(mcp_connect_task), timeout=15)
                except asyncio.TimeoutError:
                    pass

            async with semaphore:
                response = await asyncio.wait_for(
                    agent.process_direct(
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


class TeamScopedOpenAICodexProvider:
    """OpenAI Codex provider with team-scoped OAuth token storage."""

    def __init__(self, default_model: str, token_storage):
        self._default_model = default_model
        self._token_storage = token_storage

    async def chat(
        self,
        messages,
        tools=None,
        model: str | None = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ):
        from oauth_cli_kit import get_token as get_codex_token
        from nanobot.providers.base import LLMResponse
        from nanobot.providers import openai_codex_provider as codex_mod

        model = model or self._default_model
        if isinstance(model, str) and model.startswith("openai_codex/"):
            model = f"openai-codex/{model.split('/', 1)[1]}"
        system_prompt, input_items = codex_mod._convert_messages(messages)

        token = await asyncio.to_thread(get_codex_token, storage=self._token_storage)
        headers = codex_mod._build_headers(token.account_id, token.access)

        body = {
            "model": codex_mod._strip_model_prefix(model),
            "store": False,
            "stream": True,
            "instructions": system_prompt,
            "input": input_items,
            "text": {"verbosity": "medium"},
            "include": ["reasoning.encrypted_content"],
            "prompt_cache_key": codex_mod._prompt_cache_key(messages),
            "tool_choice": "auto",
            "parallel_tool_calls": True,
        }
        if tools:
            body["tools"] = codex_mod._convert_tools(tools)

        try:
            try:
                content, tool_calls, finish_reason = await codex_mod._request_codex(
                    codex_mod.DEFAULT_CODEX_URL, headers, body, verify=True
                )
            except Exception as e:
                if "CERTIFICATE_VERIFY_FAILED" not in str(e):
                    raise
                content, tool_calls, finish_reason = await codex_mod._request_codex(
                    codex_mod.DEFAULT_CODEX_URL, headers, body, verify=False
                )
            return LLMResponse(
                content=content,
                tool_calls=tool_calls,
                finish_reason=finish_reason,
            )
        except Exception as e:
            return LLMResponse(
                content=f"Error calling Codex: {str(e)}",
                finish_reason="error",
            )

    def get_default_model(self) -> str:
        return self._default_model


def _team_oauth_dir(team_workspace: Path) -> Path:
    return team_workspace / ".oauth"


class TeamSupabaseTokenStorage:
    """Store OAuth tokens in Supabase teams.export_settings scoped by team+provider."""

    def __init__(self, team_id: str, provider_name: str, lock_dir: Path):
        self.team_id = team_id
        self.provider_name = provider_name
        self._lock_dir = lock_dir

    def get_token_path(self) -> Path:
        # oauth_cli_kit uses this path only for local lock files during refresh.
        self._lock_dir.mkdir(parents=True, exist_ok=True)
        return self._lock_dir / f"{self.provider_name}.json"

    def _supabase_base(self) -> str:
        url = (os.environ.get("SUPABASE_URL", "") or "").rstrip("/")
        key = (os.environ.get("SUPABASE_SERVICE_KEY", "") or "").strip()
        if not url or not key:
            raise RuntimeError("SUPABASE_URL/SUPABASE_SERVICE_KEY nao configurados no runtime nanobot")
        return f"{url}/rest/v1"

    def _headers(self) -> dict[str, str]:
        key = (os.environ.get("SUPABASE_SERVICE_KEY", "") or "").strip()
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _read_export_settings(self) -> dict:
        import requests

        resp = requests.get(
            f"{self._supabase_base()}/teams",
            params={"id": f"eq.{self.team_id}", "select": "export_settings"},
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase read failed ({resp.status_code}): {resp.text[:300]}")
        rows = resp.json()
        if not isinstance(rows, list) or not rows:
            raise RuntimeError(f"Team not found for OAuth storage: {self.team_id}")
        raw = rows[0].get("export_settings")
        return raw if isinstance(raw, dict) else {}

    def _oauth_cipher(self):
        secret = (
            (os.environ.get("NANOBOT_OAUTH_TOKEN_ENCRYPTION_KEY", "") or "").strip()
            or (os.environ.get("MIDDAY_ENCRYPTION_KEY", "") or "").strip()
        )
        if not secret:
            return None
        try:
            from cryptography.fernet import Fernet

            key_material = hashlib.sha256(secret.encode("utf-8")).digest()
            fernet_key = base64.urlsafe_b64encode(key_material)
            return Fernet(fernet_key)
        except Exception:
            return None

    def _decrypt_entry(self, entry: dict | None):
        if not isinstance(entry, dict):
            return None
        ciphertext = entry.get("ciphertext")
        if not isinstance(ciphertext, str) or not ciphertext:
            return None
        cipher = self._oauth_cipher()
        if cipher is None:
            return None
        try:
            plaintext = cipher.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
            data = json.loads(plaintext)
            return data if isinstance(data, dict) else None
        except Exception:
            return None

    def _encrypt_entry(self, payload: dict) -> dict | None:
        cipher = self._oauth_cipher()
        if cipher is None:
            return None
        plaintext = json.dumps(payload, separators=(",", ":"), ensure_ascii=True)
        ciphertext = cipher.encrypt(plaintext.encode("utf-8")).decode("utf-8")
        return {
            "v": 1,
            "alg": "fernet-sha256-derived",
            "ciphertext": ciphertext,
            "updated_at": int(time.time()),
        }

    def load(self):
        from oauth_cli_kit.models import OAuthToken

        try:
            export_settings = self._read_export_settings()
            secure_store = export_settings.get("nanobot_oauth_tokens_secure")
            data = None
            if isinstance(secure_store, dict):
                data = self._decrypt_entry(secure_store.get(self.provider_name))

            if not isinstance(data, dict):
                store = export_settings.get("nanobot_oauth_tokens")
                if isinstance(store, dict):
                    candidate = store.get(self.provider_name)
                    if isinstance(candidate, dict):
                        data = candidate

            if not isinstance(data, dict):
                return None
            access = data.get("access")
            refresh = data.get("refresh")
            expires = data.get("expires")
            account_id = data.get("account_id")
            if not access or not refresh or not isinstance(expires, int):
                return None
            return OAuthToken(
                access=str(access),
                refresh=str(refresh),
                expires=int(expires),
                account_id=str(account_id) if account_id else None,
            )
        except Exception:
            return None

    def save(self, token) -> None:
        import requests

        export_settings = self._read_export_settings()
        token_payload = {
            "access": token.access,
            "refresh": token.refresh,
            "expires": int(token.expires),
            "account_id": token.account_id,
            "updated_at": int(time.time()),
        }
        next_export_settings = {**export_settings}

        encrypted_entry = self._encrypt_entry(token_payload)
        if encrypted_entry is not None:
            secure_store = next_export_settings.get("nanobot_oauth_tokens_secure")
            if not isinstance(secure_store, dict):
                secure_store = {}
            secure_store = {**secure_store, self.provider_name: encrypted_entry}
            next_export_settings["nanobot_oauth_tokens_secure"] = secure_store

            # Remove plaintext copy when encryption is available.
            legacy_store = next_export_settings.get("nanobot_oauth_tokens")
            if isinstance(legacy_store, dict) and self.provider_name in legacy_store:
                legacy_store = {**legacy_store}
                legacy_store.pop(self.provider_name, None)
                next_export_settings["nanobot_oauth_tokens"] = legacy_store
        else:
            token_store = next_export_settings.get("nanobot_oauth_tokens")
            if not isinstance(token_store, dict):
                token_store = {}
            token_store = {**token_store, self.provider_name: token_payload}
            next_export_settings["nanobot_oauth_tokens"] = token_store

        resp = requests.patch(
            f"{self._supabase_base()}/teams",
            params={"id": f"eq.{self.team_id}"},
            headers={**self._headers(), "Prefer": "return=minimal"},
            json={"export_settings": next_export_settings},
            timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase write failed ({resp.status_code}): {resp.text[:300]}")

    def delete(self) -> None:
        import requests

        export_settings = self._read_export_settings()
        changed = False
        next_export_settings = {**export_settings}

        token_store = next_export_settings.get("nanobot_oauth_tokens")
        if isinstance(token_store, dict) and self.provider_name in token_store:
            token_store = {**token_store}
            token_store.pop(self.provider_name, None)
            next_export_settings["nanobot_oauth_tokens"] = token_store
            changed = True

        secure_store = next_export_settings.get("nanobot_oauth_tokens_secure")
        if isinstance(secure_store, dict) and self.provider_name in secure_store:
            secure_store = {**secure_store}
            secure_store.pop(self.provider_name, None)
            next_export_settings["nanobot_oauth_tokens_secure"] = secure_store
            changed = True

        if not changed:
            return

        resp = requests.patch(
            f"{self._supabase_base()}/teams",
            params={"id": f"eq.{self.team_id}"},
            headers={**self._headers(), "Prefer": "return=minimal"},
            json={"export_settings": next_export_settings},
            timeout=15,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"Supabase delete failed ({resp.status_code}): {resp.text[:300]}")


def _should_use_db_oauth_storage() -> bool:
    return bool(os.environ.get("SUPABASE_URL")) and bool(os.environ.get("SUPABASE_SERVICE_KEY"))


def _get_team_oauth_storage(team_id: str, team_workspace: Path, provider_name: str):
    from oauth_cli_kit.storage import FileTokenStorage

    if _should_use_db_oauth_storage():
        return TeamSupabaseTokenStorage(
            team_id=team_id,
            provider_name=provider_name,
            lock_dir=_team_oauth_dir(team_workspace),
        )

    if provider_name == "openai_codex":
        return FileTokenStorage(
            token_filename="codex.json",
            app_name="midpoker-nanobot",
            data_dir=_team_oauth_dir(team_workspace),
            import_codex_cli=False,
        )
    raise ValueError(f"Unsupported OAuth provider: {provider_name}")


def _load_team_oauth_token(team_id: str, team_workspace: Path, provider_name: str):
    storage = _get_team_oauth_storage(team_id, team_workspace, provider_name)
    try:
        token = storage.load()
    except Exception:
        token = None
    return storage, token


def _make_provider(config, *, team_id: str | None = None, team_workspace: Path | None = None):
    """Create LLM provider from config (same logic as nanobot CLI)."""
    from nanobot.providers.litellm_provider import LiteLLMProvider
    from nanobot.providers.custom_provider import CustomProvider
    from nanobot.providers.registry import find_by_name

    model = config.agents.defaults.model
    provider_name = config.get_provider_name(model)
    p = config.get_provider(model)

    if provider_name == "openai_codex" or model.startswith("openai-codex/"):
        if team_workspace is None or team_id is None:
            raise RuntimeError("team_id and team workspace are required for openai_codex OAuth storage")
        storage = _get_team_oauth_storage(team_id, team_workspace, "openai_codex")
        return TeamScopedOpenAICodexProvider(default_model=model, token_storage=storage)

    if provider_name == "custom":
        return CustomProvider(
            api_key=p.api_key if p else "no-key",
            api_base=config.get_api_base(model) or "http://localhost:8000/v1",
            default_model=model,
        )

    spec = find_by_name(provider_name)
    if not model.startswith("bedrock/") and not (p and p.api_key) and not (spec and spec.is_oauth):
        raise RuntimeError("No API key configured for selected provider")

    return LiteLLMProvider(
        api_key=p.api_key if p else None,
        api_base=config.get_api_base(model),
        default_model=model,
        extra_headers=p.extra_headers if p else None,
        provider_name=provider_name,
    )


def _request_context(body: dict | None) -> dict:
    if not body:
        return {}
    ctx = body.get("context", {})
    return ctx if isinstance(ctx, dict) else {}


def _request_nanobot_config(body: dict | None) -> dict:
    if not body:
        return {}
    cfg = body.get("nanobotConfig", {})
    return cfg if isinstance(cfg, dict) else {}


def _oauth_provider_slug(provider_name: str) -> str:
    return provider_name.replace("_", "-")


def _oauth_provider_key(provider_name: str) -> str:
    return provider_name.replace("-", "_")


def _resolve_team_id_from_body(body: dict | None) -> str:
    ctx = _request_context(body)
    team_id = str(ctx.get("teamId", "") or "").strip()
    return team_id or "__unscoped__"


def _safe_path_segment(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "_", value.strip()) or "__unknown__"


def _resolve_team_workspace_path(base_workspace: Path, team_id: str) -> Path:
    return base_workspace / "teams" / _safe_path_segment(team_id)


def _copy_file_if_missing(src: Path, dst: Path):
    if not src.exists() or dst.exists():
        return
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)


def _write_text_if_missing(path: Path, content: str):
    if path.exists():
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _legacy_workspace_seed_team_ids() -> set[str]:
    raw = os.environ.get("NANOBOT_LEGACY_WORKSPACE_SEED_TEAM_IDS", "")
    return {item.strip() for item in raw.split(",") if item.strip()}


def _should_seed_from_legacy_workspace(team_id: str) -> bool:
    return team_id in _legacy_workspace_seed_team_ids()


def _extract_seed_texts_from_request(body: dict | None) -> dict[str, str]:
    cfg = _request_nanobot_config(body)

    soul_cfg = cfg.get("soulConfig", {})
    if not isinstance(soul_cfg, dict):
        soul_cfg = {}

    agent_cmd_cfg = cfg.get("agentCmdConfig", {})
    if not isinstance(agent_cmd_cfg, dict):
        agent_cmd_cfg = {}

    memory_cfg = cfg.get("memoryConfig", {})
    if not isinstance(memory_cfg, dict):
        memory_cfg = {}

    soul_text = cfg.get("soul") or soul_cfg.get("content") or ""
    agents_text = cfg.get("agentCmd") or agent_cmd_cfg.get("content") or ""
    memory_text = cfg.get("memoryNotes") or memory_cfg.get("notes") or ""

    result = {}
    if isinstance(soul_text, str) and soul_text.strip():
        result["SOUL.md"] = soul_text.strip() + "\n"
    if isinstance(agents_text, str) and agents_text.strip():
        result["AGENTS.md"] = agents_text.strip() + "\n"
    if isinstance(memory_text, str) and memory_text.strip():
        result["memory/MEMORY.md"] = memory_text.strip() + "\n"
    return result


def _bootstrap_team_workspace(base_workspace: Path, team_workspace: Path, body: dict | None):
    """Prepare an isolated workspace for the team.

    Only bootstrap identity/instructions and empty memory files. Do not copy reports or
    historical memory from the template workspace to avoid cross-team leakage.
    """
    team_workspace.mkdir(parents=True, exist_ok=True)
    (team_workspace / "memory").mkdir(parents=True, exist_ok=True)
    (team_workspace / "skills").mkdir(parents=True, exist_ok=True)
    (team_workspace / "agents").mkdir(parents=True, exist_ok=True)
    (team_workspace / "playbooks").mkdir(parents=True, exist_ok=True)
    (team_workspace / "reports").mkdir(parents=True, exist_ok=True)

    team_id = _resolve_team_id_from_body(body)
    if _should_seed_from_legacy_workspace(team_id):
        _copy_file_if_missing(base_workspace / "SOUL.md", team_workspace / "SOUL.md")
        _copy_file_if_missing(base_workspace / "AGENTS.md", team_workspace / "AGENTS.md")
        _copy_file_if_missing(
            base_workspace / "memory" / "MEMORY.md",
            team_workspace / "memory" / "MEMORY.md",
        )
        _copy_file_if_missing(
            base_workspace / "memory" / "HISTORY.md",
            team_workspace / "memory" / "HISTORY.md",
        )

    for rel_path, content in _extract_seed_texts_from_request(body).items():
        _write_text_if_missing(team_workspace / rel_path, content)

    for memory_name in ("MEMORY.md", "HISTORY.md"):
        memory_file = team_workspace / "memory" / memory_name
        if not memory_file.exists():
            memory_file.write_text("", encoding="utf-8")

    if not (team_workspace / "SOUL.md").exists():
        (team_workspace / "SOUL.md").write_text(
            f"# SOUL\n\nWorkspace isolado do time {team_id}.\n",
            encoding="utf-8",
        )

    if not (team_workspace / "AGENTS.md").exists():
        (team_workspace / "AGENTS.md").write_text(
            "# AGENTS\n\nWorkspace inicializado sem AGENTS.md base.\n",
            encoding="utf-8",
        )


def _deep_copy_jsonable(value):
    try:
        return json.loads(json.dumps(value))
    except Exception:
        return value


def _get_team_request_overrides(body: dict | None) -> dict:
    nanobot_cfg = {}
    if body and isinstance(body.get("nanobotConfig"), dict):
        nanobot_cfg = body["nanobotConfig"]

    model_cfg = nanobot_cfg.get("modelConfig", {}) if isinstance(nanobot_cfg, dict) else {}
    if not isinstance(model_cfg, dict):
        model_cfg = {}

    mcp_servers = nanobot_cfg.get("mcpServers")
    if not isinstance(mcp_servers, dict):
        mcp_servers = None

    model = None
    if body and isinstance(body.get("model"), str) and body.get("model", "").strip():
        model = body["model"].strip()
    elif isinstance(nanobot_cfg.get("model"), str) and nanobot_cfg.get("model", "").strip():
        model = nanobot_cfg["model"].strip()

    temperature = model_cfg.get("temperature")
    max_tokens = model_cfg.get("maxTokens")
    provider = None
    if body and isinstance(body.get("provider"), str) and body.get("provider", "").strip():
        provider = body["provider"].strip()
    elif isinstance(model_cfg.get("provider"), str) and model_cfg.get("provider", "").strip():
        provider = model_cfg["provider"].strip()

    return {
        "provider": provider,
        "model": model,
        "temperature": temperature if isinstance(temperature, (int, float)) else None,
        "max_tokens": max_tokens if isinstance(max_tokens, int) and max_tokens > 0 else None,
        "mcp_servers": _deep_copy_jsonable(mcp_servers) if mcp_servers else None,
    }


def _cfg_value(cfg, key: str, default=None):
    if isinstance(cfg, dict):
        return cfg.get(key, default)
    return getattr(cfg, key, default)


def _resolve_filtered_mcp_servers(config, overrides: dict) -> dict:
    source_servers = overrides.get("mcp_servers") or (config.tools.mcp_servers or {})
    filtered = {}
    for name, server_cfg in source_servers.items():
        if name not in _ALLOWED_MCP_SERVERS:
            continue
        filtered[name] = server_cfg
    return filtered


def _build_runtime_signature(
    team_id: str,
    team_workspace: Path,
    overrides: dict,
    filtered_mcp_servers: dict,
) -> str:
    payload = {
        "team_id": team_id,
        "workspace": str(team_workspace),
        "provider": overrides.get("provider"),
        "model": overrides.get("model"),
        "temperature": overrides.get("temperature"),
        "max_tokens": overrides.get("max_tokens"),
        "mcp_servers": filtered_mcp_servers,
    }
    raw = json.dumps(payload, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _build_team_config(base_config, body: dict | None, team_id: str):
    config = base_config.model_copy(deep=True)
    overrides = _get_team_request_overrides(body)
    base_workspace = Path(config.workspace_path)
    team_workspace = _resolve_team_workspace_path(base_workspace, team_id)
    _bootstrap_team_workspace(base_workspace, team_workspace, body)

    config.agents.defaults.workspace = str(team_workspace)

    # Hardening: per-team runtime should not read/write outside its workspace.
    config.tools.restrict_to_workspace = True

    model = overrides.get("model")
    if model:
        provider = overrides.get("provider")
        if provider and "/" not in model:
            config.agents.defaults.model = f"{provider}/{model}"
        else:
            config.agents.defaults.model = model

    if overrides.get("temperature") is not None:
        config.agents.defaults.temperature = float(overrides["temperature"])

    if overrides.get("max_tokens") is not None:
        config.agents.defaults.max_tokens = int(overrides["max_tokens"])

    filtered_mcp_servers = _resolve_filtered_mcp_servers(config, overrides)
    signature = _build_runtime_signature(team_id, team_workspace, overrides, filtered_mcp_servers)
    return config, team_workspace, filtered_mcp_servers, signature


async def _close_agent_runtime(runtime: dict):
    agent = runtime.get("agent")
    if not agent:
        return
    try:
        await agent.close_mcp()
    except Exception:
        pass
    try:
        agent.stop()
    except Exception:
        pass


def _schedule_runtime_tasks(runtime: dict):
    agent = runtime["agent"]

    async def _connect_mcp_for_runtime():
        try:
            await asyncio.wait_for(
                agent._connect_mcp(), timeout=_MCP_PRECONNECT_TIMEOUT_SECONDS
            )
            _enforce_mcp_tool_policy(agent)
            active_mcp_tools = sorted(
                tool_name for tool_name in agent.tools.tool_names if tool_name.startswith("mcp_")
            )
            print(
                f"[nanobot-runtime] Team {runtime['team_id'][:8]} MCP ready ({len(active_mcp_tools)}): "
                f"{', '.join(active_mcp_tools) or 'none'}"
            )
        except asyncio.TimeoutError:
            print(
                f"[nanobot-runtime] Team {runtime['team_id'][:8]} MCP preconnect timed out (lazy connect will continue)"
            )
        except Exception as e:
            print(
                f"[nanobot-runtime] Team {runtime['team_id'][:8]} MCP preconnect failed (lazy connect will continue): {e}"
            )

    async def _prewarm_runtime():
        try:
            await asyncio.wait_for(
                agent.process_direct(
                    content="Responda apenas com: OK",
                    session_key=f"web:{runtime['team_id']}:__startup_prewarm__",
                    channel="web",
                    chat_id=f"web:{runtime['team_id']}:__startup_prewarm__",
                    on_progress=None,
                ),
                timeout=_PREWARM_TIMEOUT_SECONDS,
            )
            print(f"[nanobot-runtime] Team {runtime['team_id'][:8]} prewarm completed")
        except asyncio.TimeoutError:
            print(f"[nanobot-runtime] Team {runtime['team_id'][:8]} prewarm timed out")
        except Exception as e:
            print(f"[nanobot-runtime] Team {runtime['team_id'][:8]} prewarm failed: {e}")

    if _MCP_PRECONNECT_ENABLED:
        runtime["mcp_connect_task"] = asyncio.create_task(_connect_mcp_for_runtime())
    else:
        runtime["mcp_connect_task"] = None

    if _PREWARM_ENABLED:
        runtime["prewarm_task"] = asyncio.create_task(_prewarm_runtime())
    else:
        runtime["prewarm_task"] = None


async def _get_or_create_team_runtime(team_id: str, body: dict | None = None) -> dict:
    global _base_config
    if _base_config is None:
        raise RuntimeError("nanobot runtime base config not initialized")

    config, team_workspace, filtered_mcp_servers, signature = _build_team_config(
        _base_config, body, team_id
    )

    async with _agent_runtimes_lock:
        existing = _agent_runtimes.get(team_id)
        if existing and existing.get("signature") == signature:
            existing["last_used_at"] = time.monotonic()
            return existing

        if existing:
            print(
                f"[nanobot-runtime] Rebuilding team runtime {team_id[:8]} due to config change"
            )
            await _close_agent_runtime(existing)

        provider = _make_provider(
            config,
            team_id=team_id,
            team_workspace=team_workspace,
        )
        bus = MessageBus()
        session_manager = SessionManager(team_workspace)
        cron_store = get_data_dir() / "cron" / "teams" / _safe_path_segment(team_id) / "jobs.json"
        cron = CronService(cron_store)

        runtime = {
            "team_id": team_id,
            "signature": signature,
            "workspace": team_workspace,
            "config": config,
            "bus": bus,
            "semaphore": asyncio.Semaphore(1),
            "mcp_connect_task": None,
            "prewarm_task": None,
            "created_at": time.monotonic(),
            "last_used_at": time.monotonic(),
        }

        runtime["agent"] = AgentLoop(
            bus=bus,
            provider=provider,
            workspace=team_workspace,
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

        _agent_runtimes[team_id] = runtime
        _schedule_runtime_tasks(runtime)

        print(
            f"[nanobot-runtime] Team runtime ready {team_id[:8]} "
            f"(workspace={team_workspace}, model={config.agents.defaults.model}, "
            f"restrict_to_workspace={config.tools.restrict_to_workspace})"
        )
        return runtime


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
                command = _cfg_value(cfg, "command", "")
                args = _cfg_value(cfg, "args", []) or []
                env = _cfg_value(cfg, "env", {}) or {}
                url = _cfg_value(cfg, "url", "")
                cwd = _cfg_value(cfg, "cwd", None)

                if command:
                    params = StdioServerParameters(
                        command=command,
                        args=args,
                        env=env or None,
                        cwd=cwd or None,
                    )
                    read, write = await stack.enter_async_context(stdio_client(params))
                elif url:
                    from mcp.client.streamable_http import streamable_http_client

                    read, write, _ = await stack.enter_async_context(
                        streamable_http_client(url)
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
    """Initialize runtime services; team agents are created lazily per request."""
    global _base_config

    config = load_config()

    # Inject API keys from environment variables into config (for Docker/prod)
    _or_key = os.environ.get("OPENROUTER_API_KEY", "")
    if _or_key and hasattr(config, "providers"):
        p = getattr(config.providers, "openrouter", None)
        if p and not p.api_key:
            p.api_key = _or_key

    _base_config = config
    _install_filtered_connect_mcp_servers_patch()
    base_filtered_servers = sorted(
        name for name in (config.tools.mcp_servers or {}).keys() if name in _ALLOWED_MCP_SERVERS
    )
    print("[nanobot-runtime] Team-scoped agent pool enabled (lazy init per team)")
    print(
        f"[nanobot-runtime] Base workspace template: {config.workspace_path}"
    )
    print(
        f"[nanobot-runtime] Allowed MCP servers: {', '.join(base_filtered_servers) or 'none'}"
    )
    if not _MCP_PRECONNECT_ENABLED:
        print("[nanobot-runtime] MCP preconnect disabled (per-team)")
    if not _PREWARM_ENABLED:
        print("[nanobot-runtime] Agent prewarm disabled (per-team)")


def _enforce_mcp_tool_policy(agent=None):
    if agent is None:
        return
    # Remove any MCP tool that is not in the allowlist.
    for tool_name in list(agent.tools.tool_names):
        if not tool_name.startswith("mcp_"):
            continue
        if tool_name not in _ALLOWED_MCP_TOOL_NAMES:
            agent.tools.unregister(tool_name)


async def _shutdown():
    """Cleanup on server stop."""
    _bridge_manager.stop_all()
    runtimes = list(_agent_runtimes.values())
    for runtime in runtimes:
        await _close_agent_runtime(runtime)
    _agent_runtimes.clear()


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


def _team_workspace_for_oauth(base_workspace: Path, team_id: str) -> Path:
    team_workspace = _resolve_team_workspace_path(base_workspace, team_id)
    team_workspace.mkdir(parents=True, exist_ok=True)
    return team_workspace


def _oauth_status_for_team(team_id: str, provider_name: str) -> dict:
    if _base_config is None:
        raise RuntimeError("nanobot runtime base config not initialized")
    base_workspace = Path(_base_config.workspace_path)
    team_workspace = _team_workspace_for_oauth(base_workspace, team_id)
    storage, token = _load_team_oauth_token(team_id, team_workspace, provider_name)
    now_ms = int(time.time() * 1000)
    expires_in_ms = max(0, (token.expires - now_ms)) if token else None
    return {
        "provider": provider_name,
        "connected": bool(token and token.access),
        "account_id": token.account_id if token else None,
        "expires_at": token.expires if token else None,
        "expires_in_seconds": int(expires_in_ms / 1000) if expires_in_ms is not None else None,
        "token_path": str(storage.get_token_path()),
        "team_id": team_id,
    }


def _build_openai_codex_authorize_payload(team_id: str, redirect_uri: str) -> dict:
    from oauth_cli_kit.providers import OPENAI_CODEX_PROVIDER
    from oauth_cli_kit.pkce import _create_state, _generate_pkce
    import urllib.parse

    provider = dataclasses.replace(OPENAI_CODEX_PROVIDER, redirect_uri=redirect_uri)
    verifier, challenge = _generate_pkce()
    state = _create_state()

    params = {
        "response_type": "code",
        "client_id": provider.client_id,
        "redirect_uri": provider.redirect_uri,
        "scope": provider.scope,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "state": state,
        "id_token_add_organizations": "true",
        "codex_cli_simplified_flow": "true",
        "originator": provider.default_originator,
    }
    authorize_url = f"{provider.authorize_url}?{urllib.parse.urlencode(params)}"
    return {
        "provider": provider,
        "state": state,
        "verifier": verifier,
        "authorize_url": authorize_url,
    }


async def oauth_status(request: Request):
    team_id = request.query_params.get("team_id", "")
    provider_name = _oauth_provider_key(request.query_params.get("provider", "openai-codex"))
    if not team_id:
        return JSONResponse({"error": "team_id query param is required"}, status_code=400)
    try:
        return JSONResponse({"success": True, **_oauth_status_for_team(team_id, provider_name)})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


async def oauth_openai_codex_start(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = str(body.get("team_id", "") or "").strip()
    redirect_uri = str(body.get("redirect_uri", "") or "").strip()
    if not team_id or not redirect_uri:
        return JSONResponse({"error": "team_id and redirect_uri are required"}, status_code=400)

    try:
        from oauth_cli_kit.providers import OPENAI_CODEX_PROVIDER

        # Accept both the CLI localhost callback and web production callbacks.
        payload = _build_openai_codex_authorize_payload(team_id, redirect_uri)
        pending_key = f"openai_codex:{team_id}:{payload['state']}"
        async with _oauth_pending_logins_lock:
            _oauth_pending_logins[pending_key] = {
                "team_id": team_id,
                "provider": "openai_codex",
                "state": payload["state"],
                "verifier": payload["verifier"],
                "redirect_uri": redirect_uri,
                "created_at": time.time(),
            }
        return JSONResponse({
            "success": True,
            "provider": "openai_codex",
            "team_id": team_id,
            "state": payload["state"],
            "authorize_url": payload["authorize_url"],
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=500)


async def oauth_openai_codex_complete(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = str(body.get("team_id", "") or "").strip()
    code = str(body.get("code", "") or "").strip()
    state = str(body.get("state", "") or "").strip()
    if not team_id or not code or not state:
        return JSONResponse({"error": "team_id, code and state are required"}, status_code=400)

    pending_key = f"openai_codex:{team_id}:{state}"
    async with _oauth_pending_logins_lock:
        pending = _oauth_pending_logins.pop(pending_key, None)

    if not pending:
        return JSONResponse({"success": False, "error": "Invalid or expired OAuth state"}, status_code=400)

    try:
        from oauth_cli_kit.flow import _exchange_code_for_token_async
        from oauth_cli_kit.providers import OPENAI_CODEX_PROVIDER

        if _base_config is None:
            raise RuntimeError("nanobot runtime base config not initialized")
        base_workspace = Path(_base_config.workspace_path)
        team_workspace = _team_workspace_for_oauth(base_workspace, team_id)
        storage = _get_team_oauth_storage(team_id, team_workspace, "openai_codex")
        provider = dataclasses.replace(
            OPENAI_CODEX_PROVIDER,
            redirect_uri=str(pending["redirect_uri"]),
        )
        token = await _exchange_code_for_token_async(
            code=code,
            verifier=str(pending["verifier"]),
            provider=provider,
        )()
        storage.save(token)
        return JSONResponse({
            "success": True,
            "provider": "openai_codex",
            "team_id": team_id,
            "account_id": token.account_id,
            "expires_at": token.expires,
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


async def oauth_openai_codex_import_local(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = str(body.get("team_id", "") or "").strip()
    if not team_id:
        return JSONResponse({"error": "team_id is required"}, status_code=400)

    try:
        from oauth_cli_kit import get_token as get_codex_token

        if _base_config is None:
            raise RuntimeError("nanobot runtime base config not initialized")

        # Load/refresh local CLI token (oauth_cli_kit default storage may import ~/.codex/auth.json).
        token = await asyncio.to_thread(get_codex_token)
        if not token or not getattr(token, "access", None):
            raise RuntimeError("Nenhum token local do Codex foi encontrado")

        base_workspace = Path(_base_config.workspace_path)
        team_workspace = _team_workspace_for_oauth(base_workspace, team_id)
        target_storage = _get_team_oauth_storage(team_id, team_workspace, "openai_codex")
        target_storage.save(token)

        return JSONResponse({
            "success": True,
            "provider": "openai_codex",
            "team_id": team_id,
            "account_id": token.account_id,
            "expires_at": token.expires,
            "storage": "db" if isinstance(target_storage, TeamSupabaseTokenStorage) else "file",
        })
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


async def oauth_disconnect(request: Request):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"error": "Invalid JSON body"}, status_code=400)

    team_id = str(body.get("team_id", "") or "").strip()
    provider_name = _oauth_provider_key(str(body.get("provider", "openai-codex") or "openai-codex"))
    if not team_id:
        return JSONResponse({"error": "team_id is required"}, status_code=400)

    try:
        if _base_config is None:
            raise RuntimeError("nanobot runtime base config not initialized")
        base_workspace = Path(_base_config.workspace_path)
        team_workspace = _team_workspace_for_oauth(base_workspace, team_id)
        storage = _get_team_oauth_storage(team_id, team_workspace, provider_name)
        if hasattr(storage, "delete"):
            storage.delete()
        token_path = storage.get_token_path()
        if token_path.exists():
            token_path.unlink()
        lock_path = token_path.with_suffix(".lock")
        if lock_path.exists():
            lock_path.unlink()
        return JSONResponse({"success": True, "provider": provider_name, "team_id": team_id})
    except Exception as e:
        return JSONResponse({"success": False, "error": str(e)}, status_code=400)


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
    active = []
    for team_id, runtime in _agent_runtimes.items():
        agent = runtime.get("agent")
        if not agent:
            continue
        active.append({
            "team_id": team_id,
            "workspace": str(runtime.get("workspace")),
            "mcp_connected": bool(getattr(agent, "_mcp_connected", False)),
            "mcp_tools": sorted(t for t in agent.tools.tool_names if t.startswith("mcp_")),
        })

    return JSONResponse({
        "status": "ok",
        "service": "nanobot-runtime",
        "agent": "fastchips",
        "mode": "team-scoped-agent-pool",
        "active_team_runtimes": len(active),
        "team_scoped_workspaces": True,
        "mcp": any(item["mcp_connected"] for item in active),
        "teams": active[:20],
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
    team_id = _resolve_team_id_from_body(body)
    runtime = await _get_or_create_team_runtime(team_id, body)
    agent = runtime["agent"]
    semaphore = runtime["semaphore"]

    async def event_generator():
        task = None
        try:
            # If MCP connected lazily in a request path, enforce read-only tool policy.
            if agent._mcp_connected:
                _enforce_mcp_tool_policy(agent)

            mcp_connect_task = runtime.get("mcp_connect_task")
            if mcp_connect_task is not None and not mcp_connect_task.done():
                yield {
                    "event": "agent-progress",
                    "data": json.dumps({"text": "Conectando ferramentas operacionais..."}),
                }
                try:
                    await asyncio.wait_for(asyncio.shield(mcp_connect_task), timeout=15)
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
                    async with semaphore:
                        return await agent.process_direct(
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
        Route("/oauth/status", oauth_status, methods=["GET"]),
        Route("/oauth/openai-codex/start", oauth_openai_codex_start, methods=["POST"]),
        Route("/oauth/openai-codex/complete", oauth_openai_codex_complete, methods=["POST"]),
        Route("/oauth/openai-codex/import-local", oauth_openai_codex_import_local, methods=["POST"]),
        Route("/oauth/disconnect", oauth_disconnect, methods=["POST"]),
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
