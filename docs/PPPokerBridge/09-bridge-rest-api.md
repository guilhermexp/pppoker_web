# Bridge REST API

## Endpoints principais

Arquivo-fonte: `Ppfichas/pppoker_api_server.py`

- `GET /health`
- `POST /auth/login`
- `GET /clubs/{club_id}/members`
- `GET /clubs/{club_id}/members/{uid}`
- `GET /clubs/{club_id}/downlines/{agent_uid}`
- `POST /clubs/{club_id}/chips/send`
- `POST /clubs/{club_id}/chips/withdraw`
- `GET /clubs/{club_id}/rooms`

## Codigo completo (envio e saque REST)

```python
@app.post("/clubs/{club_id}/chips/send")
async def send_chips(club_id: int, req: ChipTransferRequest, auth: PPPokerAuth = Depends(require_pppoker_auth)):
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
async def withdraw_chips(club_id: int, req: ChipTransferRequest, auth: PPPokerAuth = Depends(require_pppoker_auth)):
    loop = asyncio.get_event_loop()
    client = await auth.session.ensure_connected()
    await loop.run_in_executor(None, lambda: client.enter_club(club_id))
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
```

## Headers obrigatorios

Para endpoints protegidos por auth PPPoker no bridge:

- `X-PPPoker-Username`
- `X-PPPoker-Password`

## Exemplo `curl` envio

```bash
curl -X POST "http://localhost:3102/clubs/4366162/chips/send" \
  -H "X-PPPoker-Username: FastchipsOnline" \
  -H "X-PPPoker-Password: ********" \
  -H "Content-Type: application/json" \
  -d '{"target_player_id":13357479,"amount":5,"liga_id":1765}'
```
