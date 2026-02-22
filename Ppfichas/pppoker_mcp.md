# PPPoker MCP — Estado do Projeto

## Repositório
https://github.com/guilhermexp/pppoker_mcp.git (user: guilhermexp)
Local: /Users/macosx/Ppfichas/

## Arquivos principais
- `pppoker_direct_api.py` — cliente HTTP + TCP + decode protobuf
- `pppoker_mcp.py` — MCP Server com 9 tools

## Conta operadora
- Username: FastchipsOnline | Password: pppokerchips0000 | UID: 13352472
- Owner: 8980655 (GestorGeral.) | Email: guilherme-varela@hotmail.com

## Protocolo — ver detalhes em `pppoker_reverse_engineering.md`
- HTTP Login: POST api.pppoker.club → MD5(MD5()) → XXTEA → Base64
- TCP: usbr-allentry.pppoker.club:4000, frame = [4B len][2B name_len][name][4B pad][protobuf]
- Sequência: UserLoginREQ → HeartBeatREQ → ClubInfoREQ → operação

## 9 Tools MCP — TODAS TESTADAS ✓

### Fase 1 (4 tools):
| Tool | Params obrigatórios | Testado com |
|------|-------------------|-------------|
| enviar_fichas | target_id, amount | club 4191918, liga 3357, target 11470719 |
| sacar_fichas | target_id, amount | club 4191918, liga 3357, target 11470719 |
| login_status | (nenhum) | FastchipsOnline |
| exportar_planilha | email, date_start, date_end | club 4366162, liga 1765, Sep/2025 |

### Fase 2 (3 tools):
| Tool | Params obrigatórios | Testado com |
|------|-------------------|-------------|
| info_membro | uid | LordSnow 2914397, CassioConsoli 11470719 |
| listar_membros | clube_id | club 4366162 → 86 membros, hierarquia completa |
| downlines_agente | clube_id, agente_uid | SydneySweeney 11468067 → 17 downlines |

### Fase 3 (2 tools):
| Tool | Params obrigatórios | Testado com |
|------|-------------------|-------------|
| listar_mesas | clube_id | club 4366162 → 200 mesas (188 ativas, MTT+cash) |
| clubes_da_liga | liga_id | liga 1765 → 40 clubes na liga Evolution 2 |

## Mensagens protobuf mapeadas
| REQ | RSP | Uso |
|-----|-----|-----|
| pb.UserLoginREQ | pb.UserLoginRSP | Autenticação TCP |
| pb.HeartBeatREQ | pb.HeartBeatRSP | Keep-alive |
| pb.ClubInfoREQ | pb.ClubInfoRSP | Entrar no clube |
| pb.AddCoinREQ | pb.AddCoinRSP / pb.ClubAgentPPCoinRSP | Enviar/sacar fichas |
| pb.ExportGameDataREQ | pb.ExportGameDataRSP | Exportar planilha |
| pb.ClubAgentMemberREQ | pb.ClubAgentMemberRSP | Info de 1 membro |
| pb.ClubMemberREQ | pb.ClubMemberRSP | Lista TODOS membros |
| pb.ClubRoomREQ | pb.ClubRoomRSP | **TODAS as mesas/rooms (64KB, 200 rooms)** |
| pb.LeagueMemberREQ | pb.LeagueMemberRSP | **Clubes da liga (40 clubes)** |
| pb.ClubConfigREQ | pb.ClubConfigRSP | Config do clube (blinds, taxas) |
| pb.ClubAgentPPCoinREQ | pb.ClubAgentPPCoinRSP | Saldo PPCoin do agente |
| pb.PPCoinREQ | pb.PPCoinRSP | Saldo PPCoin |
| pb.GameDataREQ | pb.GameDataRSP | Dados de jogo (needs more investigation) |

## Papéis: 1=Dono, 2=Gestor, 4=Super Agente, 5=Agente, 10=Membro
## Game types: 2=MTT, 3=SNG, 5=NLH Cash, 6=PLO4, 7=PLO5, 8=PLO6, 10=SpinUp

## IDs de teste confirmados
- Clube 4191918 (liga 3357): envio/saque funciona ✓
- Clube 4366162 (liga 1765): export + info membros + rooms + liga ✓
- Liga 1765 (Evolution 2): 40 clubes, saldos positivos/negativos ✓
- Agentes no 4366162: LordSnow(2914397), SydneySweeney(11468067), CassioConsoli(11470719/super)

## Campos do ClubRoomRSP (por room):
- f1=room_id, f2=nome, f5=buy_in, f6=fee, f7=min_buy(cash), f8=time_bank
- f9=max_players, f10=registrados, f11=running, f13=game_type
- f14=blind_duration, f15=starting_chips, f16=entries, f18=status
- f19=proximo_inicio_ts, f20=inicio_ts, f22=scheduled_ts, f28=creation_ts
- f25=is_running(cash), f61=garantido, f68=sub{f1=prize_total, f2=collected}
- f82=creator_uid, f95=rake

## Campos do LeagueMemberRSP (por clube):
- f1=club_id, f2=club_name, f3=avatar_url, f4=status, f6=max_members
- f10=join_date_ts, f18=diamantes, f22=saldo(signed), f23=credito

## Armadilhas documentadas em pppoker_reverse_engineering.md

## Fase 3 — O que falta (não encontrado via probing):
- **Transações/log**: nenhum nome de mensagem respondeu (~20 testados)
- **Game stats por data** (Partidas/Ganhos/Taxa inline): GameDataREQ retorna zeros
- **Crédito dedicado** (conceder/alterar): nenhum nome respondeu
- **Retorno de taxa (rakeback)**: não encontrado
- Próxima abordagem: capturar tráfego real do app (tcpdump)

## Plano API REST
- Arquivo: /Users/macosx/.claude/plans/robust-bubbling-lovelace.md
- FastAPI com endpoints: login, dashboard, membros, mesas, clubes_liga, enviar, sacar, exportar
- Status: plano feito, NÃO implementado ainda

## Config Claude Desktop
~/.claude/claude_desktop_config.json:
{"mcpServers": {"pppoker": {"command": "python3", "args": ["/Users/macosx/Ppfichas/pppoker_mcp.py"]}}}
