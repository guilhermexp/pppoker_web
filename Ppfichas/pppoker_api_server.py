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
    PPPokerClient,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("pppoker_bridge")

# ---------------------------------------------------------------------------
# Connection pool: reuse authenticated PPPoker TCP sessions
# ---------------------------------------------------------------------------

class PPPokerSession:
    """Wraps a PPPokerClient with metadata for pool management."""

    def __init__(self, uid: int, rdkey: str, server_ip: Optional[str] = None):
        self.uid = uid
        self.rdkey = rdkey
        self.server_ip = server_ip
        self.client: Optional[PPPokerClient] = None
        self.created_at = time.time()
        self.last_used = time.time()
        self.lock = asyncio.Lock()

    async def ensure_connected(self) -> PPPokerClient:
        """Ensure we have an authenticated TCP connection, reconnect if needed."""
        async with self.lock:
            if self.client and self.client.authenticated:
                self.last_used = time.time()
                return self.client

            # Create new connection in thread pool (blocking TCP ops)
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
            self.last_used = time.time()
            logger.info(f"New TCP session for uid={self.uid}")
            return self.client

    def close(self):
        if self.client:
            self.client.close()
            self.client = None


# Global session pool: keyed by "username:password"
_session_pool: dict[str, PPPokerSession] = {}
_pool_lock = asyncio.Lock()

# Cache HTTP login results: keyed by "username:password"
_login_cache: dict[str, dict] = {}
_LOGIN_CACHE_TTL = 300  # 5 minutes


async def get_or_create_session(username: str, password: str) -> PPPokerSession:
    """Get an existing session or create a new one via HTTP login."""
    pool_key = f"{username}:{password}"

    async with _pool_lock:
        # Check existing session
        if pool_key in _session_pool:
            session = _session_pool[pool_key]
            # If session is old (> 10 min), force reconnect
            if time.time() - session.last_used > 600:
                session.close()
                del _session_pool[pool_key]
            else:
                return session

        # Check login cache
        login_result = _login_cache.get(pool_key)
        if login_result and time.time() - login_result.get("_cached_at", 0) < _LOGIN_CACHE_TTL:
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
        await asyncio.sleep(60)
        async with _pool_lock:
            stale_keys = [
                k for k, s in _session_pool.items()
                if time.time() - s.last_used > 600
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


class ChipTransferRequest(BaseModel):
    target_player_id: int
    amount: int
    liga_id: int = 3357


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


@app.get("/clubs/{club_id}/members")
async def list_club_members(
    club_id: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """List all members of a club."""
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()

    # Enter club first
    await loop.run_in_executor(None, lambda: client.enter_club(club_id))

    # List members
    result = await loop.run_in_executor(
        None, lambda: client.list_club_members(club_id)
    )

    if not result.get("success"):
        raise HTTPException(502, detail=result.get("error", "Failed to list members"))

    return result


@app.get("/clubs/{club_id}/members/{uid}")
async def get_member_info(
    club_id: int,
    uid: int,
    auth: PPPokerAuth = Depends(require_pppoker_auth),
):
    """Get detailed info for a single club member."""
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()

    await loop.run_in_executor(None, lambda: client.enter_club(club_id))

    result = await loop.run_in_executor(
        None, lambda: client.get_member_info(club_id, uid)
    )

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
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()

    await loop.run_in_executor(None, lambda: client.enter_club(club_id))

    result = await loop.run_in_executor(
        None, lambda: client.get_member_info(club_id, agent_uid)
    )

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
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()

    await loop.run_in_executor(None, lambda: client.enter_club(club_id))

    result = await loop.run_in_executor(
        None,
        lambda: client.transfer_chips(
            target_player_id=req.target_player_id,
            amount=req.amount,
            clube_id=club_id,
            liga_id=req.liga_id,
        ),
    )

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
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()

    await loop.run_in_executor(None, lambda: client.enter_club(club_id))

    # Withdraw = send negative amount (complemento de 2 em 64 bits no varint)
    result = await loop.run_in_executor(
        None,
        lambda: client.transfer_chips(
            target_player_id=req.target_player_id,
            amount=-req.amount,
            clube_id=club_id,
            liga_id=req.liga_id,
        ),
    )

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
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()
    await loop.run_in_executor(None, lambda: client.enter_club(club_id))
    result = await loop.run_in_executor(
        None, lambda: client.list_club_rooms(club_id)
    )
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
