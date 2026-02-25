# Cobertura: MCP Tools vs REST API vs tRPC

Mapeamento de funcionalidades entre as 3 camadas do sistema.

## Tabela de cobertura

| Funcionalidade | MCP Tool | REST Endpoint | tRPC Procedure | Status |
|---|---|---|---|---|
| Login/validacao | `login_status` | `POST /auth/login` | `pppokerAuth.login` | OK |
| Listar clubes | - | `GET /clubs` | `pppoker.listMyClubs` | OK |
| Listar membros | `listar_membros` | `GET /clubs/{id}/members` | `members.getLive` | OK |
| Info membro | `info_membro` | `GET /clubs/{id}/members/{uid}` | `members.getMemberLive` | OK |
| Downlines agente | `downlines_agente` | `GET /clubs/{id}/downlines/{uid}` | - | Falta tRPC |
| Enviar fichas | `enviar_fichas` | `POST /clubs/{id}/chips/send` | `pppoker.sendChips` | OK |
| Sacar fichas | `sacar_fichas` | `POST /clubs/{id}/chips/withdraw` | `pppoker.withdrawChips` | OK |
| Listar mesas | `listar_mesas` | `GET /clubs/{id}/rooms` | `rooms.getLive` | OK |
| Solicitacoes entrada | `listar_solicitacoes` | `GET /clubs/{id}/join-requests` | `members.listPendingMembers` | OK |
| Aprovar entrada | `aprovar_solicitacao` | `POST /clubs/{id}/join-requests/{rid}/review` | `members.reviewMember` | OK |
| Rejeitar entrada | `rejeitar_solicitacao` | `POST /clubs/{id}/join-requests/{rid}/review` | `members.reviewMember` | OK |
| Exportar planilha | `exportar_planilha` | - | - | Falta REST + tRPC |
| Clubes da liga | `clubes_da_liga` | - | - | Falta REST + tRPC |
| Promover membro | `promover_membro` | - | - | Falta REST + tRPC |
| Remover membro | `remover_membro` | - | - | Falta REST + tRPC |
| Sync status | - | - | `pppoker.getSyncStatus` | tRPC-only (Supabase) |
| Sync manual | - | - | `pppoker.syncNow` | tRPC-only (Trigger.dev) |

## Fluxo de dados

```
MCP Tool (Nanobot)     REST Endpoint (Bridge)     tRPC Procedure (API)     Frontend
  |                        |                          |                       |
  |-- pppoker_direct_api ->|                          |                       |
  |                        |<-- fetch() --------------|                       |
  |                        |                          |<-- useQuery() --------|
```

- **MCP Tools**: usados pelo Nanobot (chat agent) para executar acoes via PPPoker
- **REST Endpoints**: expostos pelo bridge FastAPI (porta 3102) como gateway para o PPPoker TCP
- **tRPC Procedures**: chamados pelo frontend dashboard via React Query

## Headers de autenticacao (REST)

Todos os endpoints protegidos exigem:

```
X-PPPoker-Username: <username>
X-PPPoker-Password: <password>
```

O tRPC busca credenciais automaticamente de `pppoker_club_connections` pelo `team_id` do usuario logado.

## Funcionalidades pendentes

Funcionalidades que existem no MCP mas ainda nao tem REST endpoint no bridge:

1. **`exportar_planilha`** — Exporta dados de jogo para email (util para relatorios)
2. **`clubes_da_liga`** — Lista clubes de uma liga com saldos e creditos
3. **`promover_membro`** — Muda papel de um membro (agente, gestor, etc.)
4. **`remover_membro`** — Remove membro do clube

Para adicionar: criar endpoint REST no bridge + tRPC procedure + componente frontend.

## Nomes de parametros entre camadas

| Conceito | MCP | REST | tRPC |
|----------|-----|------|------|
| ID do clube | `clube_id` | `club_id` (path) | derivado de `pppoker_club_connections` |
| ID do jogador | `target_id` | `target_player_id` | `targetPlayerId` |
| ID da liga | `liga_id` | `liga_id` | `ligaId` |
| Saldo fichas | `saldo_caixa` | `saldo_caixa` | `cashboxBalance` (DB) |
| Papel no clube | `papel` | `user_role` | `pppokerRole` (num) / `roleLabel` (texto) |
