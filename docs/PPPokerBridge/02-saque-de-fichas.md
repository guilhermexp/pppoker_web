# Saque de Fichas

## Fluxo rapido

1. Validar login (`login_status`).
2. Confirmar alvo e valor.
3. Executar `sacar_fichas` (o MCP converte para valor negativo internamente).

## Codigo completo (core do saque)

### 1) Handler MCP (`sacar_fichas`)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
elif name == "sacar_fichas":
    target_id = int(arguments["target_id"])
    amount    = int(arguments["amount"])
    clube_id  = int(arguments.get("clube_id", DEFAULT_CLUBE))
    liga_id   = int(arguments.get("liga_id",  DEFAULT_LIGA))

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

    # AddCoinREQ com amount negativo (uint64 two's complement)
    import struct as _struct, time as _time
    timestamp = int(_time.time())
    txn_id = f"{clube_id}_{login['uid']}_{timestamp}"
    payload = b''
    payload += bytes([0x08]) + encode_varint(clube_id)
    payload += bytes([0x20]) + encode_varint(liga_id)
    payload += bytes([0x28, 0x00])
    payload += bytes([0x30]) + encode_varint(target_id)
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
        "note": f"Saque de {amount} fichas do jogador {target_id}. Verifique resposta."
    }, indent=2))]
```

### 2) Endpoint REST de saque

Arquivo: `Ppfichas/pppoker_api_server.py`

```python
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

## Tool MCP

- Tool: `sacar_fichas`
- Params obrigatorios:
  - `target_id` (integer)
  - `amount` (integer, positivo)
- Params opcionais:
  - `clube_id` (integer)
  - `liga_id` (integer)

Exemplo seguro:

```json
{
  "target_id": 13357479,
  "amount": 5,
  "clube_id": 4366162,
  "liga_id": 1765
}
```
