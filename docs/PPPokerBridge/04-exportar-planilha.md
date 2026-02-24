# Exportar Planilha

## Objetivo

Exportar dados do clube para `.xlsx` enviado por email (`date_start` e `date_end` obrigatorios, formato `YYYYMMDD`).

## Codigo completo (core)

### 1) Builder protobuf de export

Arquivo: `Ppfichas/pppoker_direct_api.py`

```python
# Trecho chave
payload += b'\x78' + encode_varint(609)       # f15 all games
payload += b'\x80\x01' + encode_varint(0)    # f16 MUST be 0
payload += b'\x88\x01' + encode_varint(0)    # f17 flag
return build_message('pb.ExportGameDataREQ', payload)
```

### 2) Execucao de export no cliente

Arquivo: `Ppfichas/pppoker_direct_api.py`

```python
def export_data(self, club_id: int, liga_id: int, email: str, date_start: str, date_end: str,
                transacoes: bool = True, relatorio_diamante: bool = True) -> dict:
    export_req = build_export_game_data_req(
        club_id=club_id,
        user_id=self.uid,
        liga_id=liga_id,
        email=email,
        date_start=date_start,
        date_end=date_end,
        transacoes=transacoes,
        relatorio_diamante=relatorio_diamante,
    )
    self.send(export_req)
    # ... parse ExportGameDataRSP
```

### 3) Handler MCP

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
elif name == "exportar_planilha":
    email      = arguments["email"]
    date_start = arguments["date_start"]
    date_end   = arguments["date_end"]
    clube_id   = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))
    liga_id    = int(arguments.get("liga_id",  DEFAULT_LIGA_EXPORT))

    login = do_login()
    client = get_client(login)
    client.enter_club(clube_id)

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
```

## Tool MCP

- Tool: `exportar_planilha`
- Params obrigatorios: `email`, `date_start`, `date_end`
- Params opcionais: `clube_id`, `liga_id`

Exemplo:

```json
{
  "email": "seu-email@dominio.com",
  "date_start": "20260201",
  "date_end": "20260207",
  "clube_id": 4366162,
  "liga_id": 1765
}
```
