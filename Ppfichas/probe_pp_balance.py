#!/usr/bin/env python3
"""
Probe: Descobrir como pegar saldo PP individual de cada jogador.

Estratégias:
1. Re-examinar ClubMemberRSP - campos não parseados
2. Testar pb.PPCoinREQ com vários payloads
3. Testar pb.ClubAgentPPCoinREQ
4. Testar novos nomes de mensagem baseados no export
"""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_message,
    parse_response, _parse_proto_fields, _first, encode_varint
)
import struct, time

CLUB_ID = 4366162

print("=" * 60)
print("PROBE: Saldo PP Individual dos Jogadores")
print("=" * 60)

# Login
print("\n[1] Fazendo login...")
login = http_login("FastchipsOnline", "pppokerchips0000")
if not login.get("success"):
    print(f"Login falhou: {login}")
    sys.exit(1)
print(f"  UID: {login['uid']}, Server: {login.get('gserver_ip')}")

client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("gserver_ip"))
client.login()
client.enter_club(CLUB_ID)
print(f"  Entrou no clube {CLUB_ID}")

# ============================================================
# FASE 1: Re-examinar TODOS os campos do ClubMemberRSP
# ============================================================
print("\n" + "=" * 60)
print("FASE 1: Re-examinar ClubMemberRSP - campos não parseados")
print("=" * 60)

payload = b'\x08' + encode_varint(CLUB_ID) + b'\x10\x01'
client.send(build_message('pb.ClubMemberREQ', payload))

client.sock.settimeout(8)
buf = b''
try:
    while True:
        buf += client.sock.recv(65536)
except:
    pass

pos = 0
member_fields_all = {}  # field_num -> count of members that have it
member_values_sample = {}  # field_num -> list of (uid, value) samples
all_member_saldos = {}

while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    if parsed['message'] != 'pb.ClubMemberRSP':
        continue

    rsp_payload = parsed.get('payload', b'')
    fields = _parse_proto_fields(rsp_payload)

    count = 0
    for raw in fields.get(3, []):
        if not isinstance(raw, bytes):
            continue
        f = _parse_proto_fields(raw)
        uid = _first(f, 2)
        nome = _first(f, 3, '?')
        saldo = _first(f, 23)

        if saldo is not None:
            # Converter signed se necessário
            if isinstance(saldo, int) and saldo >= 2**63:
                saldo = saldo - 2**64
            all_member_saldos[uid] = (nome, saldo / 100)

        # Catalogar TODOS os campos
        for k in f.keys():
            member_fields_all.setdefault(k, 0)
            member_fields_all[k] += 1

            if k not in member_values_sample:
                member_values_sample[k] = []
            if len(member_values_sample[k]) < 3:
                for v in f[k]:
                    if isinstance(v, int):
                        member_values_sample[k].append((uid, nome, v))
                    elif isinstance(v, bytes) and len(v) < 50:
                        try:
                            member_values_sample[k].append((uid, nome, v.decode()))
                        except:
                            member_values_sample[k].append((uid, nome, f"<bytes:{len(v)}>"))
                    elif isinstance(v, bytes):
                        member_values_sample[k].append((uid, nome, f"<bytes:{len(v)}>"))
        count += 1

    print(f"\nTotal membros no ClubMemberRSP: {count}")
    print(f"\nCampos encontrados (field_num -> qtd membros):")
    for k in sorted(member_fields_all.keys()):
        c = member_fields_all[k]
        pct = (c / count * 100) if count > 0 else 0
        known = {1:'papel', 2:'uid', 3:'nome', 4:'avatar', 6:'join_ts',
                 12:'downlines_sub', 13:'titulo', 15:'last_active',
                 19:'credito_linha', 20:'agente_nome', 22:'online',
                 23:'saldo_caixa', 24:'agente_uid', 25:'super_agente_uid', 26:'super_agente_nome'}
        label = known.get(k, '???')
        print(f"  f{k:3d} = {c:3d}/{count} membros ({pct:5.1f}%) — {label}")

        # Mostrar samples
        if k not in known and member_values_sample.get(k):
            for uid_s, nome_s, val_s in member_values_sample[k][:2]:
                print(f"         ex: {nome_s} (UID {uid_s}) = {val_s}")

    # Saldo caixa dos que têm
    if all_member_saldos:
        print(f"\nMembros com saldo_caixa (f23):")
        total = 0
        for uid, (nome, saldo) in sorted(all_member_saldos.items(), key=lambda x: -abs(x[1][1])):
            print(f"  {nome:30s} (UID {uid}): {saldo:12,.2f}")
            total += saldo
        print(f"  {'TOTAL':30s}          : {total:12,.2f}")

# ============================================================
# FASE 2: Testar pb.PPCoinREQ
# ============================================================
print("\n" + "=" * 60)
print("FASE 2: Testar pb.PPCoinREQ")
print("=" * 60)

# Variante 1: vazio
print("\n[2a] pb.PPCoinREQ com payload vazio...")
client.send(build_message('pb.PPCoinREQ', b''))
time.sleep(0.5)

# Variante 2: com club_id
print("[2b] pb.PPCoinREQ com f1=club_id...")
client.send(build_message('pb.PPCoinREQ', b'\x08' + encode_varint(CLUB_ID)))
time.sleep(0.5)

# Variante 3: com uid
print("[2c] pb.PPCoinREQ com f1=uid...")
client.send(build_message('pb.PPCoinREQ', b'\x08' + encode_varint(login['uid'])))
time.sleep(0.5)

# Variante 4: com club_id + uid
print("[2d] pb.PPCoinREQ com f1=club_id, f2=uid...")
payload_pp = (b'\x08' + encode_varint(CLUB_ID) +
              b'\x10' + encode_varint(login['uid']))
client.send(build_message('pb.PPCoinREQ', payload_pp))
time.sleep(0.5)

# Drain
client.sock.settimeout(4)
buf = b''
try:
    while True:
        buf += client.sock.recv(65536)
except:
    pass

pos = 0
found_pp = False
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    msg = parsed['message']
    if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC'):
        continue
    print(f"\n  Resposta: {msg}")
    payload_rsp = parsed.get('payload', b'')
    if payload_rsp:
        ff = _parse_proto_fields(payload_rsp)
        for k in sorted(ff.keys()):
            for v in ff[k]:
                if isinstance(v, int):
                    print(f"    f{k} = {v}" + (f" (/ 100 = {v/100:.2f})" if abs(v) > 100 else ""))
                elif isinstance(v, bytes):
                    try:
                        print(f"    f{k} = '{v.decode()}'")
                    except:
                        print(f"    f{k} = <bytes:{len(v)}>")
                        sub = _parse_proto_fields(v)
                        for sk in sorted(sub.keys()):
                            for sv in sub[sk]:
                                if isinstance(sv, int):
                                    print(f"      .f{sk} = {sv}" + (f" (/ 100 = {sv/100:.2f})" if abs(sv) > 100 else ""))
    found_pp = True

if not found_pp:
    print("  Nenhuma resposta relevante recebida")

# ============================================================
# FASE 3: Testar pb.ClubAgentPPCoinREQ
# ============================================================
print("\n" + "=" * 60)
print("FASE 3: Testar pb.ClubAgentPPCoinREQ")
print("=" * 60)

# Variante 1: club_id
print("\n[3a] pb.ClubAgentPPCoinREQ com f1=club_id...")
client.send(build_message('pb.ClubAgentPPCoinREQ', b'\x08' + encode_varint(CLUB_ID)))
time.sleep(0.5)

# Variante 2: club_id + uid
print("[3b] pb.ClubAgentPPCoinREQ com f1=club_id, f2=uid...")
payload_agent = (b'\x08' + encode_varint(CLUB_ID) +
                 b'\x10' + encode_varint(login['uid']))
client.send(build_message('pb.ClubAgentPPCoinREQ', payload_agent))
time.sleep(0.5)

# Drain
client.sock.settimeout(4)
buf = b''
try:
    while True:
        buf += client.sock.recv(65536)
except:
    pass

pos = 0
found_agent = False
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    msg = parsed['message']
    if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC'):
        continue
    print(f"\n  Resposta: {msg}")
    payload_rsp = parsed.get('payload', b'')
    if payload_rsp:
        ff = _parse_proto_fields(payload_rsp)
        for k in sorted(ff.keys()):
            for v in ff[k]:
                if isinstance(v, int):
                    print(f"    f{k} = {v}" + (f" (/ 100 = {v/100:.2f})" if abs(v) > 100 else ""))
                elif isinstance(v, bytes):
                    try:
                        print(f"    f{k} = '{v.decode()}'")
                    except:
                        print(f"    f{k} = <bytes:{len(v)}>")
                        sub = _parse_proto_fields(v)
                        for sk in sorted(sub.keys()):
                            for sv in sub[sk]:
                                if isinstance(sv, int):
                                    print(f"      .f{sk} = {sv}" + (f" (/ 100 = {sv/100:.2f})" if abs(sv) > 100 else ""))
    found_agent = True

if not found_agent:
    print("  Nenhuma resposta relevante recebida")

# ============================================================
# FASE 4: Testar novos nomes de mensagem
# ============================================================
print("\n" + "=" * 60)
print("FASE 4: Testar novos nomes de mensagem")
print("=" * 60)

# Baseado no padrão do export e no que falta
test_messages = [
    # Saldo / Balance - nomes ainda não testados
    ("pb.ClubMemberBalanceREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubBalanceREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MemberPPCoinREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubMemberPPCoinREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubPPCoinREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Transações / Log
    ("pb.ClubChipLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ChipLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubOperateLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.OperateLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.AddCoinLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CoinLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ChipRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubChipRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.TransferLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubTransferLogREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Crédito
    ("pb.CreditLineREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCreditLineREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCreditListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CreditListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubAgentCreditREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Stats / Dados
    ("pb.ClubStatsREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubDataREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubSummaryREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubReportREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubGameStatsREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Rake / Fee
    ("pb.ClubRakeREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.RakeBackREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubRakeBackREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubFeeREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubAgentRakeREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.AgentRakeREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubAgentRakeBackREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Member detail com mais info
    ("pb.ClubMemberDetailREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubUserInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubUserDetailREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubMemberListREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Novos padrões encontrados no export
    ("pb.GameRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubGameRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.PlayerRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubPlayerRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
]

# Enviar todos de uma vez com delay curto
for msg_name, payload in test_messages:
    client.send(build_message(msg_name, payload))
    time.sleep(0.15)

# Drain com timeout maior
client.sock.settimeout(6)
buf = b''
try:
    while True:
        buf += client.sock.recv(65536)
except:
    pass

# Parse respostas
pos = 0
responses_found = set()
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    msg = parsed['message']
    if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
               'pb.ClubInfoRSP', 'pb.DiamondRSP'):
        continue

    if msg not in responses_found:
        responses_found.add(msg)
        print(f"\n  *** RESPOSTA NOVA: {msg} ***")
        payload_rsp = parsed.get('payload', b'')
        if payload_rsp:
            ff = _parse_proto_fields(payload_rsp)
            for k in sorted(ff.keys()):
                for v in ff[k]:
                    if isinstance(v, int):
                        print(f"    f{k} = {v}" + (f" (/ 100 = {v/100:.2f})" if abs(v) > 100 else ""))
                    elif isinstance(v, bytes):
                        try:
                            decoded = v.decode()
                            if len(decoded) < 80:
                                print(f"    f{k} = '{decoded}'")
                            else:
                                print(f"    f{k} = <string:{len(decoded)}>")
                        except:
                            print(f"    f{k} = <bytes:{len(v)}>")
                            try:
                                sub = _parse_proto_fields(v)
                                for sk in sorted(sub.keys()):
                                    for sv in sub[sk]:
                                        if isinstance(sv, int):
                                            print(f"      .f{sk} = {sv}" + (f" (/ 100 = {sv/100:.2f})" if abs(sv) > 100 else ""))
                                        elif isinstance(sv, bytes) and len(sv) < 50:
                                            try:
                                                print(f"      .f{sk} = '{sv.decode()}'")
                                            except:
                                                print(f"      .f{sk} = <bytes:{len(sv)}>")
                            except:
                                pass
        else:
            print("    (payload vazio)")

if not responses_found:
    print("\n  Nenhuma resposta nova recebida para os nomes testados")

# ============================================================
# FASE 5: Tentar variantes mais agressivas
# ============================================================
print("\n" + "=" * 60)
print("FASE 5: Variantes agressivas de nomes")
print("=" * 60)

aggressive_names = [
    # Sem prefixo Club
    "pb.MemberListREQ",
    "pb.MemberInfoREQ",
    "pb.MemberDetailREQ",
    "pb.PlayerListREQ",
    "pb.PlayerInfoREQ",

    # Com prefixo Get
    "pb.GetClubMemberREQ",
    "pb.GetMemberInfoREQ",
    "pb.GetClubInfoREQ",
    "pb.GetPPCoinREQ",
    "pb.GetBalanceREQ",

    # GameData com params diferentes
    "pb.GameStatREQ",
    "pb.GameStatsREQ",
    "pb.GameSummaryREQ",
    "pb.ClubGameSummaryREQ",

    # Chip / Coin variations
    "pb.CoinBalanceREQ",
    "pb.CoinInfoREQ",
    "pb.CoinListREQ",
    "pb.ClubCoinBalanceREQ",
    "pb.ClubCoinInfoREQ",
    "pb.PPBalanceREQ",
    "pb.PPCoinBalanceREQ",

    # Transaction / History
    "pb.HistoryREQ",
    "pb.ClubHistoryREQ",
    "pb.RecordREQ",
    "pb.ClubRecordREQ",
    "pb.AccountREQ",
    "pb.ClubAccountREQ",
    "pb.LedgerREQ",
    "pb.ClubLedgerREQ",

    # Agent specific
    "pb.AgentInfoREQ",
    "pb.AgentListREQ",
    "pb.AgentDetailREQ",
    "pb.ClubAgentListREQ",
    "pb.ClubAgentDetailREQ",
    "pb.ClubAgentInfoREQ",

    # Diamond / Resource
    "pb.DiamondREQ",
    "pb.DiamondBalanceREQ",
    "pb.ResourceREQ",
    "pb.ClubDiamondREQ",
]

for msg_name in aggressive_names:
    payload = b'\x08' + encode_varint(CLUB_ID)
    client.send(build_message(msg_name, payload))
    time.sleep(0.1)

# Drain
client.sock.settimeout(5)
buf = b''
try:
    while True:
        buf += client.sock.recv(65536)
except:
    pass

pos = 0
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    msg = parsed['message']
    if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
               'pb.ClubInfoRSP', 'pb.DiamondRSP'):
        continue

    if msg not in responses_found:
        responses_found.add(msg)
        print(f"\n  *** RESPOSTA NOVA: {msg} ***")
        payload_rsp = parsed.get('payload', b'')
        if payload_rsp:
            ff = _parse_proto_fields(payload_rsp)
            for k in sorted(ff.keys()):
                for v in ff[k]:
                    if isinstance(v, int):
                        print(f"    f{k} = {v}" + (f" (/ 100 = {v/100:.2f})" if abs(v) > 100 else ""))
                    elif isinstance(v, bytes):
                        try:
                            decoded = v.decode()
                            print(f"    f{k} = '{decoded[:80]}'")
                        except:
                            print(f"    f{k} = <bytes:{len(v)}>")
                            try:
                                sub = _parse_proto_fields(v)
                                for sk in sorted(sub.keys()):
                                    for sv in sub[sk]:
                                        if isinstance(sv, int):
                                            print(f"      .f{sk} = {sv}" + (f" (/ 100 = {sv/100:.2f})" if abs(sv) > 100 else ""))
                            except:
                                pass

if not responses_found:
    print("\n  Nenhuma resposta nova")

print(f"\n\nTotal de respostas novas encontradas: {len(responses_found)}")
print(f"Nomes que responderam: {sorted(responses_found)}")

client.close()
print("\n[Done]")
