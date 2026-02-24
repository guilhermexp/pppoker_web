# Gestao de Membros

## Ferramentas

- `promover_membro`
- `remover_membro`

## Codigo completo (chamadas MCP)

Arquivo: `Ppfichas/pppoker_mcp.py`

```python
# promover_membro
elif name == "promover_membro":
    clube_id = int(arguments["clube_id"])
    target_uid = int(arguments["target_uid"])
    papel = int(arguments["papel"])
    # login -> get_client -> enter_club -> set_member_role

# remover_membro
elif name == "remover_membro":
    clube_id = int(arguments["clube_id"])
    target_uid = int(arguments["target_uid"])
    # login -> get_client -> enter_club -> kick_member
```

## Tool MCP

### promover_membro

```json
{
  "clube_id": 4366162,
  "target_uid": 13357479,
  "papel": 5
}
```

Papeis:
- `2`: Gestor
- `4`: Super Agente
- `5`: Agente
- `10`: Membro

### remover_membro

```json
{
  "clube_id": 4366162,
  "target_uid": 13357479
}
```
