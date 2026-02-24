# Mesas e Liga

## Ferramentas

- `listar_mesas`
- `clubes_da_liga`

## Codigo completo (chamadas MCP)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
# listar_mesas
elif name == "listar_mesas":
    clube_id = int(arguments["clube_id"])
    apenas_ativas = bool(arguments.get("apenas_ativas", False))
    # login -> get_client -> enter_club -> list_club_rooms

# clubes_da_liga
elif name == "clubes_da_liga":
    liga_id = int(arguments["liga_id"])
    clube_id = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))
    # login -> get_client -> enter_club(clube_id) -> list_league_clubs(liga_id)
```

## Tool MCP

### listar_mesas

```json
{
  "clube_id": 4366162,
  "apenas_ativas": true
}
```

### clubes_da_liga

```json
{
  "liga_id": 1765,
  "clube_id": 4366162
}
```
