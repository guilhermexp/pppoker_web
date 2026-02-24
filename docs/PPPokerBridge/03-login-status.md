# Login Status

## Objetivo

Validar se a conta operadora consegue autenticar no PPPoker via HTTP e obter `uid`, `rdkey` e `gserver_ip`.

## Codigo completo (MCP)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
if name == "login_status":
    result = do_login()
    if result['success']:
        return [types.TextContent(type="text", text=json.dumps({
            "status": "ok",
            "uid": result['uid'],
            "rdkey": result['rdkey'],
            "server": result.get('gserver_ip'),
        }, indent=2))]
    else:
        return [types.TextContent(type="text", text=json.dumps({
            "status": "error",
            "error": result.get('error')
        }, indent=2))]
```

## Tool MCP

- Tool: `login_status`
- Params: nenhum

Saida esperada:

```json
{
  "status": "ok",
  "uid": 13352472,
  "rdkey": "...",
  "server": "usbr-allentry.pppoker.club"
}
```
