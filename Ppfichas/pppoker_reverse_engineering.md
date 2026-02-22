# PPPoker Reverse Engineering — Guia Completo de Técnicas

## ABORDAGEM GERAL QUE FUNCIONOU

### Fluxo de trabalho comprovado:
1. **Hipótese**: propor nome de mensagem protobuf baseado em padrões (ex: `pb.ClubXxxREQ`)
2. **Construir payload**: montar protobuf manualmente com encode_varint + field tags
3. **Enviar e drenar**: enviar via TCP, drenar buffer completo com timeout
4. **Decodificar resposta**: parsear todos os frames no buffer, decodificar campos protobuf
5. **Iterar**: variar campos, valores, nomes até encontrar resposta válida

### O que NÃO funcionou:
- Tentar nomes "óbvios" baseados em lógica de API REST (ex: ClubAgentInfoREQ)
- Assumir que mensagens sem resposta significam "nome errado" — pode ser timeout curto
- Brute-force massivo sem ter um padrão base identificado

---

## TÉCNICAS DE PROBING QUE MAIS DERAM RESULTADO

### 1. Script de varredura com drain + decode automático
Criar um script Python que:
- Faz login (HTTP + TCP) automaticamente
- Entra no clube alvo (enter_club)
- Testa dezenas de nomes de mensagem em loop
- Drena buffer com timeout 3-5s para cada probe
- Filtra broadcasts (HeartBeatRSP, NoticeBRC, CallGameBRC)
- Registra HITS (mensagens que retornaram resposta relevante)

**CRÍTICO**: Filtrar broadcasts do servidor! O PPPoker envia broadcasts constantes:
- `pb.HeartBeatRSP` — heartbeat automático
- `pb.NoticeBRC` — notificações globais (jogador ganhou diamantes, etc.)
- `pb.CallGameBRC` — mesas em andamento
- `pb.PushBRC` — push notifications
Sem filtrar, esses aparecem como "hits" falsos.

### 2. Padrão de nomes de mensagem
O PPPoker usa convenção: `pb.{Entidade}{Ação}REQ` → `pb.{Entidade}{Ação}RSP`

Padrões que FUNCIONARAM:
- `pb.ClubAgentMemberREQ` → `pb.ClubAgentMemberRSP` ✓ (info de 1 membro)
- `pb.ClubMemberREQ` → `pb.ClubMemberRSP` ✓ (lista de membros)
- `pb.ClubInfoREQ` → `pb.ClubInfoRSP` ✓ (info do clube)
- `pb.ExportGameDataREQ` → `pb.ExportGameDataRSP` ✓
- `pb.AddCoinREQ` → `pb.AddCoinRSP` / `pb.ClubAgentPPCoinRSP` ✓

Padrões que NÃO existem no servidor (testados):
- pb.ClubAgentInfoREQ, pb.ClubAgentListREQ, pb.ClubSuperAgentInfoREQ
- pb.ClubAgentDownlineREQ (com agent — só respondeu com super, mas era broadcast)
- pb.ClubTableListREQ, pb.ClubGameListREQ, pb.ClubRoomListREQ
- pb.ClubAgentCreditREQ, pb.ClubCreditREQ, pb.ClubAgentCoinREQ
- pb.ClubAgentRakeREQ, pb.ClubRakeBackREQ, pb.ClubTaxReturnREQ

### 3. Variação de campos no payload
Quando um nome de mensagem funciona, variar os campos para descobrir mais:
- Testar com f1 (clube_id) apenas
- Testar com f1+f2 (clube_id + uid ou liga_id)
- Testar com f1+f2+f3 (três campos)
- Testar com diferentes valores no f2 (0, 1, uid específico, liga_id)
- Verificar se campos extras mudam o tamanho da resposta (mais dados)

---

## COMO DECODIFICAR PROTOBUF SEM .proto

### Estrutura de wire types:
- Wire 0 (varint): campo numérico — ler decode_varint
- Wire 2 (length-delimited): string, bytes, ou sub-mensagem
- Wire 1 (64-bit fixed): raramente usado
- Wire 5 (32-bit fixed): raramente usado

### Tag byte: `(field_number << 3) | wire_type`
- `0x08` = field 1, varint
- `0x10` = field 2, varint
- `0x18` = field 3, varint
- `0x20` = field 4, varint
- `0x28` = field 5, varint
- `0x30` = field 6, varint
- `0x38` = field 7, varint
- `0x40` = field 8, varint
- `0x48` = field 9, varint
- `0x50` = field 10, varint
- `0x12` = field 2, length-delimited
- `0x1a` = field 3, length-delimited
- `0x22` = field 4, length-delimited
- `0x2a` = field 5, length-delimited
- `0x42` = field 8, length-delimited
- Multi-byte tags: field 16+ usa 2 bytes (ex: `0x80 0x01` = field 16, varint)

### Para distinguir string vs sub-mensagem (wire type 2):
1. Tentar decodificar como UTF-8
2. Verificar se todos os chars são printáveis (>=32 e <127) ou >127 (UTF-8 multi-byte)
3. Se falhar, verificar se primeiro byte tem wire_type válido (0, 1, 2, 5)
4. Se sim, tentar recursão como sub-mensagem

### Valores negativos em varint:
Protobuf usa unsigned varint. Para valores signed negativos:
- Valor -N é encodado como 2^64 - N (complemento de 2 em 64 bits)
- Na decodificação: `if val >= 2**63: val -= 2**64`

### Timestamps:
- Valores entre 1.7B e 1.8B são Unix timestamps (2023-2027)
- Exemplo: 1750826471 = 2025-06-25

---

## DRAIN PATTERN (CRÍTICO)

### Problema resolvido com o drain:
O servidor PPPoker pode enviar MÚLTIPLAS mensagens em resposta a UMA request:
- Export: envia `pb.DiamondRSP` ANTES de `pb.ExportGameDataRSP`
- Transfer: pode enviar `pb.ClubAgentPPCoinRSP` + `pb.AddCoinRSP`
- Qualquer operação pode ter broadcasts intercalados

### Padrão de drain correto:
```python
self.sock.settimeout(5)  # 5-8s dependendo da operação
buf = b''
try:
    while True:
        chunk = self.sock.recv(65536)
        if not chunk: break
        buf += chunk
except: pass  # timeout é esperado

# Parse ALL frames in buffer
import struct
pos = 0
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    # Process parsed message...
```

### Timeouts recomendados:
- Probing (scan de nomes): 3-4s
- info_membro / listar_membros: 5-6s
- export_data: 8s (resposta demora mais)
- transfer_chips: 1-2s (resposta rápida)

---

## FRAME FORMAT TCP

```
[4 bytes big-endian: total_length]
[2 bytes big-endian: name_length]
[name_length bytes: message_name (UTF-8)]
[4 bytes: padding (zeros)]
[remaining: protobuf payload]
```

Exemplo para `pb.HeartBeatREQ` (payload vazio):
- total_length = 2 + 17 + 4 + 0 = 23
- Hex: `00000017 0011 70622e48656172744265617452455121 00000000`

---

## HTTP LOGIN — DETALHES CRUCIAIS

### Cadeia de criptografia da senha:
1. `raw_password` → MD5 → hex lowercase
2. hex → MD5 → hex lowercase (double MD5 = CryptoPassword)
3. double_md5 → XXTEA encrypt com chave temporal → Base64

### Chave XXTEA temporal:
- Pegar hora atual em Beijing (UTC+8)
- Formatar: `MMDDHHMMSS` + `d5659066d5`
- Exemplo: mês=02, dia=21, hora=09, min=28, seg=46 → `0221092846d5659066d5`

### Parâmetros POST obrigatórios:
```
type=4, region=2, username=..., password=<base64_xxtea>,
t=<unix_timestamp>, os=mac, country=BR, appid=globle,
clientvar=4.2.75, platform_type=4, app_type=1, app_build_code=221
```

### Código -15 (email verification):
- Servidor envia código por email
- Repetir login com parâmetro adicional: `verifycode=XXXXXX`

---

## FERRAMENTAS USADAS

### Python libraries:
- `socket` — conexão TCP raw
- `struct` — pack/unpack big-endian para frames
- `hashlib` — MD5 para CryptoPassword
- `requests` — HTTP login
- `base64` — encoding do XXTEA output

### Scripts de probe criados (descartáveis, em /tmp):
- `/tmp/probe_agent_info.py` — primeira varredura de nomes
- `/tmp/probe_agent2.py` — decode profundo com ClubAgentMemberREQ
- `/tmp/probe_agent3.py` — varredura ampla (120+ nomes testados)
- `/tmp/probe_credit_tables.py` — crédito e mesas
- `/tmp/probe_clubinfo_flags.py` — ClubInfoREQ com flags diferentes
- `/tmp/probe_member_req.py` — paginação/filtro do ClubMemberREQ
- `/tmp/test_phase2_tools.py` — teste final das 3 tools

### Padrão dos scripts de probe:
1. Login + connect + enter_club (setup)
2. Função `drain()` reutilizável
3. Função `probe()` ou `probe_decode()` que envia e registra hits
4. Lista `hits = []` que acumula mensagens que responderam
5. Print final com todas as hits encontradas

---

## LIÇÕES APRENDIDAS / ARMADILHAS

### 1. f16=0 no ExportGameDataREQ
**Problema**: Export retornava -5 para qualquer data
**Causa**: Campo f16=1 no payload (valor default errado)
**Solução**: f16=0 é obrigatório
**Como descobri**: testei CADA campo individualmente, alterando um por vez

### 2. Buffer drain no export
**Problema**: Export parecia não retornar ExportGameDataRSP
**Causa**: pb.DiamondRSP chegava no buffer antes da resposta real
**Solução**: drenar buffer completo e parsear TODOS os frames

### 3. tcpdump -i any falha no macOS
**Problema**: `tcpdump -i any` retorna "No such device"
**Solução**: detectar interface ativa via `route get default` → usar interface específica (ex: en1)

### 4. Broadcasts poluem resultados de probing
**Problema**: Mensagens como CallGameBRC aparecem como "hits" falsos
**Solução**: filtrar set de broadcasts conhecidos: {HeartBeatRSP, NoticeBRC, CallGameBRC, PushBRC}

### 5. ClubMemberREQ retorna mais info que ClubAgentMemberREQ
- ClubAgentMemberREQ: retorna info de 1 membro, MAS sem f23 (saldo_caixa)
- ClubMemberREQ: retorna TODOS membros COM f23 (saldo_caixa) e downlines reais no f12
- Para downlines, usar ClubMemberREQ + filtrar por agente_uid é mais confiável

### 6. Downlines no f12 incluem o próprio agente
- f12 sub-message contém f2 repeated com UIDs
- O primeiro UID é sempre o próprio agente — filtrar self!

### 7. Valores de f19 (credito_linha) por papel:
- -1 = membro regular (sem linha de crédito)
- 0 = agente com crédito zerado
- positivo = valor de crédito concedido
- 1023 = gestor com todas permissões (bitmask 0x3FF)

### 8. Papéis confirmados:
- 1 = Dono (Owner)
- 2 = Gestor (Manager)
- 4 = Super Agente
- 5 = Agente
- 10 = Membro (jogador regular)

---

## FASE 3 — DESCOBERTAS

### Probe massivo (~150 nomes testados em 7 grupos):
- Contador/Saldos: 35 nomes → 2 hits (ClubAgentPPCoinREQ, PPCoinREQ)
- Dados/Partidas: 31 nomes → 1 hit (GameDataREQ, mas retorna zeros)
- Transações/Log: 20 nomes → 0 hits
- Liga/Federation: 14 nomes → 1 hit (LeagueMemberREQ)
- Crédito: 14 nomes → 0 hits
- Mesas/Rooms: 25 nomes → **1 HIT GIGANTE (ClubRoomREQ = 64KB!)**
- Misc: 25 nomes → 1 hit (ClubConfigREQ)

### Mensagens ENCONTRADAS na Fase 3:

#### pb.ClubRoomREQ → pb.ClubRoomRSP (64KB, 200 rooms!)
- **Payload**: f1=clube_id
- **Resposta**: f1=liga_id, f2=repeated room sub-messages
- **Campos por room**: f1=room_id, f2=nome, f5=buy_in, f6=fee, f7=min_buy
  f9=max_players, f10=registrados, f11=running, f13=game_type(2=MTT,5=NLH Cash)
  f14=blind_duration, f15=starting_chips, f16=entries, f18=status
  f19/20/22=timestamps, f25=is_running(cash), f61=garantido
  f68=sub{f1=prize_total,f2=collected,f3=remaining,f4=guarantee}, f95=rake
- **Timeout**: 10s (resposta grande)

#### pb.LeagueMemberREQ → pb.LeagueMemberRSP
- **Payload**: f1=liga_id (NÃO clube_id!)
- **Resposta**: f3=repeated club sub-messages
- **Campos por clube**: f1=club_id, f2=club_name, f3=avatar_url, f4=status
  f6=max_members, f10=join_date_ts, f18=diamantes, f22=saldo(signed), f23=credito

#### pb.ClubConfigREQ → pb.ClubConfigRSP (1.6KB)
- Config do clube: blind structures, fee schedules, rake tables
- Dados de referência, não operacional

#### pb.ClubAgentPPCoinREQ → pb.ClubAgentPPCoinRSP (11B)
- Saldo PPCoin do agente (retorna f1=club_id, f2=liga?, f3=0, f4=0)
- Pouco útil — valores sempre 0 sem contexto adequado

#### pb.PPCoinREQ → pb.PPCoinRSP (9B)
- Similar ao anterior, valores básicos

#### pb.GameDataREQ → pb.GameDataRSP (20B)
- Retorna f2-f8 todos 0, f11=timestamp
- Precisa de payload diferente ou contexto específico (jogo em andamento?)

---

## FASE 3 — O QUE NÃO FOI ENCONTRADO

### Transações/Log de atividade:
- 20 nomes testados sem hit: ClubTransaction, ClubTransfer, ClubLog,
  ClubActivity, ClubOperation, ClubCoinLog, TransferLog, etc.
- Provável nome completamente diferente do padrão

### Game stats inline (Partidas/Ganhos/Taxa por data):
- GameDataREQ existe mas retorna zeros com club_id apenas
- Provavelmente precisa de game_id ou room_id específico

### Crédito dedicado (conceder/alterar):
- 14 nomes testados sem hit: ClubCredit, CreditRequest, CreditApply, etc.

### Retorno de taxa (rakeback):
- ClubRake, ClubTax, RakeBack todos sem hit

### Próxima abordagem para dados faltantes:
Capturar tráfego real do app PPPoker Desktop via tcpdump:
```bash
route get default | grep interface
sudo tcpdump -i en1 -w /tmp/pppoker.pcap host 47.254.71.136 or host usbr-allentry.pppoker.club
# No app: navegar para tela de transações, crédito, etc.
strings /tmp/pppoker.pcap | grep "pb\."
```
