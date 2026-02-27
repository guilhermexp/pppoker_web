"""
PPPoker FastAPI Bridge Service
Exposes PPPoker data as REST endpoints for the dashboard app to consume.

Run: uvicorn pppoker_api_server:app --host 0.0.0.0 --port 8000
"""

import asyncio
import time
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from pppoker_direct_api import (
    http_login,
    send_verification_code,
    PPPokerClient,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pppoker_bridge")

# ---------------------------------------------------------------------------
# Connection pool: reuse authenticated PPPoker TCP sessions
# ---------------------------------------------------------------------------

HEARTBEAT_INTERVAL = 25       # Send heartbeat every 25s (PPPoker expects ~30s)
RECONNECT_COOLDOWN = 30       # Min 30s between reconnect attempts
LOGIN_CACHE_TTL = 600         # Cache HTTP login for 10 min (avoid rate limit)
SESSION_MAX_AGE = 1800        # Force reconnect after 30 min regardless


class PPPokerSession:
    """Wraps a PPPokerClient with metadata for pool management."""

    def __init__(self, uid: int, rdkey: str, server_ip: Optional[str] = None):
        self.uid = uid
        self.rdkey = rdkey
        self.server_ip = server_ip
        self.client: Optional[PPPokerClient] = None
        self.created_at = time.time()
        self.last_used = time.time()
        self.last_reconnect_at = 0.0
        self.lock = asyncio.Lock()
        self._heartbeat_task: Optional[asyncio.Task] = None

    async def ensure_connected(self) -> PPPokerClient:
        """Ensure we have an authenticated TCP connection, reconnect if needed."""
        async with self.lock:
            # Check if client exists and socket is still open
            if self.client and self.client.authenticated and self.client.connected:
                # Force reconnect if session is too old
                if time.time() - self.created_at > SESSION_MAX_AGE:
                    logger.info(f"Session too old ({SESSION_MAX_AGE}s), reconnecting uid={self.uid}")
                    return await self._reconnect_internal()
                self.last_used = time.time()
                return self.client

            return await self._reconnect_internal()

    async def force_reconnect(self) -> PPPokerClient:
        """Force a new TCP connection with cooldown protection."""
        async with self.lock:
            return await self._reconnect_internal()

    async def _reconnect_internal(self) -> PPPokerClient:
        """Internal reconnect with cooldown. Must be called with self.lock held."""
        # Enforce cooldown to avoid hammering PPPoker servers
        elapsed = time.time() - self.last_reconnect_at
        if elapsed < RECONNECT_COOLDOWN:
            wait = RECONNECT_COOLDOWN - elapsed
            logger.info(f"Reconnect cooldown: waiting {wait:.0f}s before retry")
            await asyncio.sleep(wait)

        # Stop old heartbeat
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            self._heartbeat_task = None

        # Close old client
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None

        self.last_reconnect_at = time.time()

        # Create new connection
        loop = asyncio.get_event_loop()
        client = PPPokerClient(self.uid, self.rdkey)

        connected = await loop.run_in_executor(
            None, lambda: client.connect(self.server_ip)
        )
        if not connected:
            raise HTTPException(502, "Failed to connect to PPPoker servers")

        logged_in = await loop.run_in_executor(None, client.login)
        if not logged_in:
            client.close()
            raise HTTPException(502, "PPPoker TCP authentication failed")

        self.client = client
        self.created_at = time.time()
        self.last_used = time.time()
        logger.info(f"New TCP session for uid={self.uid}")

        # Start heartbeat to keep connection alive
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

        return self.client

    async def _heartbeat_loop(self):
        """Send periodic heartbeats to keep the TCP connection alive."""
        while True:
            await asyncio.sleep(HEARTBEAT_INTERVAL)
            try:
                if not self.client or not self.client.authenticated:
                    logger.warning("Heartbeat: client not authenticated, stopping")
                    break

                loop = asyncio.get_event_loop()
                alive = await loop.run_in_executor(None, self.client.send_heartbeat)

                if not alive:
                    logger.warning(f"Heartbeat failed for uid={self.uid}, marking disconnected")
                    if self.client:
                        self.client.authenticated = False
                        self.client.connected = False
                    break
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.warning(f"Heartbeat error: {e}")
                if self.client:
                    self.client.authenticated = False
                    self.client.connected = False
                break

    def close(self):
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
        if self.client:
            try:
                self.client.close()
            except Exception:
                pass
            self.client = None


# Global session pool: keyed by "username:password"
_session_pool: dict[str, PPPokerSession] = {}
_pool_lock = asyncio.Lock()

# Cache HTTP login results: keyed by "username:password"
_login_cache: dict[str, dict] = {}


async def get_or_create_session(username: str, password: str) -> PPPokerSession:
    """Get an existing session or create a new one via HTTP login."""
    pool_key = f"{username}:{password}"

    async with _pool_lock:
        # Check existing session
        if pool_key in _session_pool:
            session = _session_pool[pool_key]
            return session

        # Check login cache (aggressive caching to avoid rate limit)
        login_result = _login_cache.get(pool_key)
        if login_result and time.time() - login_result.get("_cached_at", 0) < LOGIN_CACHE_TTL:
            pass  # use cached result
        else:
            # HTTP login (blocking, run in executor)
            loop = asyncio.get_event_loop()
            login_result = await loop.run_in_executor(
                None, lambda: http_login(username, password)
            )
            if not login_result.get("success"):
                if login_result.get("needs_verify"):
                    raise HTTPException(
                        403,
                        detail={
                            "code": "VERIFY_REQUIRED",
                            "message": login_result.get("error", "Email verification required"),
                            "secret_mail": login_result.get("secret_mail", ""),
                        },
                    )
                raise HTTPException(
                    401,
                    detail=login_result.get("error", "Login failed"),
                )
            login_result["_cached_at"] = time.time()
            _login_cache[pool_key] = login_result

        session = PPPokerSession(
            uid=login_result["uid"],
            rdkey=login_result["rdkey"],
            server_ip=login_result.get("gserver_ip"),
        )
        _session_pool[pool_key] = session
        return session


async def cleanup_stale_sessions():
    """Periodically close stale sessions."""
    while True:
        await asyncio.sleep(120)
        async with _pool_lock:
            stale_keys = [
                k for k, s in _session_pool.items()
                if time.time() - s.last_used > SESSION_MAX_AGE
            ]
            for key in stale_keys:
                _session_pool[key].close()
                del _session_pool[key]
                logger.info(f"Cleaned stale session: {key.split(':')[0]}")


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

class PPPokerAuth:
    """Resolved auth context from headers."""
    def __init__(self, username: str, password: str, session: PPPokerSession):
        self.username = username
        self.password = password
        self.session = session


async def require_pppoker_auth(
    x_pppoker_username: str = Header(...),
    x_pppoker_password: str = Header(...),
) -> PPPokerAuth:
    session = await get_or_create_session(x_pppoker_username, x_pppoker_password)
    return PPPokerAuth(
        username=x_pppoker_username,
        password=x_pppoker_password,
        session=session,
    )


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    username: str
    password: str
    verify_code: Optional[str] = None


class LoginResponse(BaseModel):
    success: bool
    uid: Optional[int] = None
    rdkey: Optional[str] = None
    gserver_ip: Optional[str] = None
    gserver_port: Optional[int] = None
    needs_verify: Optional[bool] = None
    secret_mail: Optional[str] = None
    error: Optional[str] = None


class SendVerificationCodeRequest(BaseModel):
    email: str
    lang: str = 'pt'


class ChipTransferRequest(BaseModel):
    target_player_id: int
    amount: int
    liga_id: int = 3357


class JoinRequestReview(BaseModel):
    accept: bool


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    task = asyncio.create_task(cleanup_stale_sessions())
    logger.info("PPPoker Bridge started")
    yield
    # Shutdown
    task.cancel()
    async with _pool_lock:
        for session in _session_pool.values():
            session.close()
        _session_pool.clear()
    logger.info("PPPoker Bridge stopped")


app = FastAPI(
    title="PPPoker Bridge API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "active_sessions": len(_session_pool),
        "cached_logins": len(_login_cache),
    }


@app.post("/auth/login", response_model=LoginResponse)
async def auth_login(req: LoginRequest):
    """Validate PPPoker credentials, return uid + metadata."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: http_login(req.username, req.password, req.verify_code)
    )

    if result.get("success"):
        return LoginResponse(
            success=True,
            uid=result["uid"],
            rdkey=result["rdkey"],
            gserver_ip=result.get("gserver_ip"),
            gserver_port=result.get("gserver_port", 4000),
        )

    if result.get("needs_verify"):
        return LoginResponse(
            success=False,
            needs_verify=True,
            uid=result.get("uid"),
            secret_mail=result.get("secret_mail", ""),
            error=result.get("error"),
        )

    return LoginResponse(
        success=False,
        error=result.get("error", "Login failed"),
    )


@app.post("/auth/send-verification-code")
async def auth_send_verification_code(req: SendVerificationCodeRequest):
    """Send email verification code for login verification (code -15 flow)."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        None, lambda: send_verification_code(req.email, req.lang)
    )
    if not result.get("success"):
        raise HTTPException(400, detail=result.get("error", "Failed to send code"))
    return {"success": True, "message": result.get("message", "Code sent")}


async def _run_with_retry(session: PPPokerSession, operation):
    """Run a PPPoker operation with automatic retry on connection failure.

    If the first attempt fails with a socket/connection error,
    forces a reconnect and tries once more.
    """
    loop = asyncio.get_event_loop()
    client = await session.ensure_connected()

    try:
        return client, await loop.run_in_executor(None, lambda: operation(client))
    except (OSError, BrokenPipeError, ConnectionResetError, ConnectionAbortedError, Exception) as e:
        err_msg = str(e).lower()
        is_connection_error = isinstance(e, (OSError, BrokenPipeError, ConnectionResetError, ConnectionAbortedError))
        is_socket_error = "socket" in err_msg or "broken pipe" in err_msg or "connection" in err_msg or "timed out" in err_msg
        is_data_error = "sem resposta" in err_msg or "no response" in err_msg

        if is_connection_error or is_socket_error or is_data_error:
            logger.warning(f"PPPoker connection error, retrying: {e}")
            client = await session.force_reconnect()
            try:
                return client, await loop.run_in_executor(None, lambda: operation(client))
            except Exception as retry_err:
                logger.error(f"PPPoker retry also failed: {retry_err}")
                raise HTTPException(502, detail=str(retry_err))
        raise


@app.get("/clubs")
async def list_clubs(
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """List all clubs the authenticated user belongs to, with their role in each."""
    def op(client):
        return client.list_clubs()

    session = await get_or_create_session(auth.username, auth.password)
    _, clubs = await _run_with_retry(session, op)
    return {"clubs": clubs}


@app.get("/clubs/{club_id}/members")
async def list_club_members(
    club_id: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """List all members of a club."""
    def op(client):
        client.enter_club(club_id)
        return client.list_club_members(club_id)

    client, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to list members"))

    # Include club_info and logged-in user UID in response
    if client.club_info:
        result["club_info"] = client.club_info
    result["logged_in_uid"] = client.uid

    return result


@app.get("/clubs/{club_id}/members/{uid}")
async def get_member_info(
    club_id: int,
    uid: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Get detailed info for a single club member."""
    def op(client):
        client.enter_club(club_id)
        return client.get_member_info(club_id, uid)

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to get member info"))

    return result


@app.get("/clubs/{club_id}/downlines/{agent_uid}")
async def get_agent_downlines(
    club_id: int,
    agent_uid: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Get downlines of an agent."""
    def op(client):
        client.enter_club(club_id)
        return client.get_member_info(club_id, agent_uid)

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to get agent info"))

    return {
        "agent_uid": agent_uid,
        "club_id": club_id,
        "downlines": result.get("downlines", []),
        "nome": result.get("nome", ""),
        "papel": result.get("papel", ""),
    }


@app.post("/clubs/{club_id}/chips/send")
async def send_chips(
    club_id: int,
    req: ChipTransferRequest,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Send chips to a player."""
    def op(client):
        client.enter_club(club_id)
        return client.transfer_chips(
            target_player_id=req.target_player_id,
            amount=req.amount,
            clube_id=club_id,
            liga_id=req.liga_id,
        )

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Transfer failed"))

    return {"success": True, "message": f"Sent {req.amount} chips to {req.target_player_id}"}


@app.post("/clubs/{club_id}/chips/withdraw")
async def withdraw_chips(
    club_id: int,
    req: ChipTransferRequest,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Withdraw chips from a player (send negative amount)."""
    def op(client):
        client.enter_club(club_id)
        # Withdraw = send negative amount (complemento de 2 em 64 bits no varint)
        return client.transfer_chips(
            target_player_id=req.target_player_id,
            amount=-req.amount,
            clube_id=club_id,
            liga_id=req.liga_id,
        )

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Withdraw failed"))

    return {"success": True, "message": f"Withdrew {req.amount} chips from {req.target_player_id}"}


@app.get("/clubs/{club_id}/rooms")
async def list_club_rooms(
    club_id: int,
    only_active: bool = False,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """List all rooms/tables for a club."""
    def op(client):
        client.enter_club(club_id)
        return client.list_club_rooms(club_id)

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to list rooms"))

    rooms = result["rooms"]
    if only_active:
        rooms = [r for r in rooms if r.get("is_running")]

    return {
        "success": True,
        "liga_id": result.get("liga_id"),
        "total": len(rooms),
        "rooms": rooms,
    }


@app.get("/clubs/{club_id}/join-requests")
async def list_join_requests(
    club_id: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """List pending join requests for a club."""
    def op(client):
        client.enter_club(club_id)
        return client.list_join_requests(club_id)

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success") and not result.get("requests"):
        raise HTTPException(502, detail=result.get("error", "Failed to list join requests"))

    return {
        "success": True,
        "total": result.get("total", len(result.get("requests", []))),
        "requests": result.get("requests", []),
    }


@app.post("/clubs/{club_id}/join-requests/{request_id}/review")
async def review_join_request(
    club_id: int,
    request_id: int,
    req: JoinRequestReview,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Approve or reject a join request."""
    def op(client):
        client.enter_club(club_id)
        return client.handle_join_request(club_id, request_id, req.accept)

    _, result = await _run_with_retry(auth.session, op)

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to process join request"))

    return {
        "success": True,
        "action": result.get("action", "accepted" if req.accept else "rejected"),
        "uid_handled": result.get("uid_handled"),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
