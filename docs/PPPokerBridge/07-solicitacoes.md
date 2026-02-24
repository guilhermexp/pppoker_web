# Solicitacoes de Entrada

## Ferramentas

- `listar_solicitacoes`
- `aprovar_solicitacao`
- `rejeitar_solicitacao`

## Codigo completo (core no cliente)

Arquivo: `Ppfichas/pppoker_direct_api.py`

```python
def list_join_requests(self, clube_id: int) -> dict:
    payload = b'\x08' + encode_varint(clube_id)
    self.send(build_message('pb.ClubJoinListREQ', payload))
    # ... parse ClubJoinListRSP

def handle_join_request(self, clube_id: int, request_id: int, accept: bool = True) -> dict:
    action = 1 if accept else 2
    payload = (
        b'\x08' + encode_varint(clube_id) +
        b'\x10' + encode_varint(request_id) +
        b'\x18' + encode_varint(action)
    )
    self.send(build_message('pb.HandleJoinMsgREQ', payload))
    # ... parse HandleJoinMsgRSP
```

## Tool MCP

### listar_solicitacoes

```json
{
  "clube_id": 4366162
}
```

### aprovar_solicitacao

```json
{
  "clube_id": 4366162,
  "request_id": 123456
}
```

### rejeitar_solicitacao

```json
{
  "clube_id": 4366162,
  "request_id": 123456
}
```
