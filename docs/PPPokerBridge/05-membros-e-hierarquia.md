# Membros e Hierarquia

## Ferramentas

- `info_membro`
- `listar_membros`
- `downlines_agente`

## Codigo completo (chamadas MCP)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
# info_membro
elif name == "info_membro":
    uid = int(arguments["uid"])
    clube_id = int(arguments.get("clube_id", DEFAULT_CLUBE_EXPORT))
    # login -> get_client -> enter_club -> get_member_info

# listar_membros
elif name == "listar_membros":
    clube_id = int(arguments["clube_id"])
    papel = arguments.get("papel", "todos").lower()
    # login -> get_client -> enter_club -> list_club_members -> filtro por papel

# downlines_agente
elif name == "downlines_agente":
    clube_id = int(arguments["clube_id"])
    agente_uid = int(arguments["agente_uid"])
    # login -> get_client -> enter_club -> list_club_members -> filtro por agente_uid
```

## Tool MCP

### info_membro

```json
{
  "uid": 13357479,
  "clube_id": 4366162
}
```

### listar_membros

```json
{
  "clube_id": 4366162,
  "papel": "todos"
}
```

### downlines_agente

```json
{
  "clube_id": 4366162,
  "agente_uid": 2914397
}
```
