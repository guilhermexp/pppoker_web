# Envio de Fichas

## Fluxo rapido

1. Validar login (`login_status`).
2. Confirmar alvo (`target_id`) e valor (`amount`).
3. Executar `enviar_fichas` com `clube_id` e `liga_id` explicitos.

## Codigo completo (core da transferencia)

### 1) Montagem protobuf `AddCoinREQ`

Arquivo: `Ppfichas/pppoker_direct_api.py`

```python
def build_add_coin_req(clube_id: int, liga_id: int, target_player_id: int,
                       amount: int, sender_id: int) -> bytes:
    timestamp = int(time.time())
    txn_id = f"{clube_id}_{sender_id}_{timestamp}"

    payload = b''
    payload += bytes([0x08]) + encode_varint(clube_id)          # f1 clube_id
    payload += bytes([0x20]) + encode_varint(liga_id)           # f4 liga_id
    payload += bytes([0x28, 0x00])                              # f5 type=0
    payload += bytes([0x30]) + encode_varint(target_player_id)  # f6 target
    payload += bytes([0x38]) + encode_varint(amount * 100)      # f7 amount*100
    txn_bytes = txn_id.encode('utf-8')
    payload += bytes([0x42]) + encode_varint(len(txn_bytes)) + txn_bytes  # f8 txn_id

    return build_message('pb.AddCoinREQ', payload)
```

### 2) Execucao TCP (envio)

Arquivo: `Ppfichas/pppoker_direct_api.py`

```python
def transfer_chips(self, target_player_id: int, amount: int,
                   clube_id: int, liga_id: int = 3357) -> dict:
    if not self.authenticated:
        return {'success': False, 'error': 'Not authenticated'}

    transfer_req = build_add_coin_req(
        clube_id=clube_id,
        liga_id=liga_id,
        target_player_id=target_player_id,
        amount=amount,
        sender_id=self.uid,
    )

    self.send(transfer_req)
    time.sleep(0.5)

    SUCCESS_MSGS = {'pb.AddCoinRSP', 'pb.ClubAgentPPCoinRSP'}
    SKIP_MSGS = {'pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.ClubInfoRSP'}

    for _ in range(5):
        resp = self.recv()
        if not resp:
            return {'success': False, 'error': 'No response'}

        parsed = parse_response(resp)
        if parsed['message'] in SUCCESS_MSGS:
            break
        if parsed['message'] in SKIP_MSGS:
            time.sleep(0.3)
            continue
    else:
        return {'success': False, 'error': 'No transfer response received'}

    if parsed['message'] == 'pb.AddCoinRSP' and len(parsed['payload']) > 0:
        result_code, _ = decode_varint(parsed['payload'], 1)
        if result_code != 0:
            return {'success': False, 'error': f'Code {result_code}'}

    return {'success': True, 'response': parsed}
```

### 3) Handler MCP (`enviar_fichas`)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
elif name == "enviar_fichas":
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

    try:
        result = client.transfer_chips(
            target_player_id=target_id,
            amount=amount,
            clube_id=clube_id,
            liga_id=liga_id,
        )
    finally:
        client.close()

    if result['success']:
        return [types.TextContent(type="text", text=json.dumps({
            "status": "success",
            "message": f"{amount} fichas enviadas para o jogador {target_id}",
            "uid_remetente": login['uid'],
            "clube": clube_id,
            "liga": liga_id,
        }, indent=2))]

    return [types.TextContent(type="text", text=json.dumps({
        "status": "error", "step": "transfer", "error": result.get('error')
    }, indent=2))]
```

## Tool MCP

- Tool: `enviar_fichas`
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
