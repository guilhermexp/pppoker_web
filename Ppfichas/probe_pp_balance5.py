#!/usr/bin/env python3
"""
Probe 5: Investigar pb.MoneyRSP (descoberto!) e pb.FundREQ para outros membros.
Também testa pb.MoneyREQ diretamente.
"""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_message,
    parse_response, _parse_proto_fields, _first, encode_varint
)
import struct, time

CLUB_ID = 4366162

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("gserver_ip"))
client.login()
client.enter_club(CLUB_ID)
MY_UID = login['uid']
print(f"Logado como UID {MY_UID}\n")

def drain_all(timeout=4):
    """Drain buffer and return all parsed responses."""
    client.sock.settimeout(timeout)
    buf = b''
    try:
        while True:
            buf += client.sock.recv(65536)
    except:
        pass

    skip = {'pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
            'pb.ClubInfoRSP', 'pb.DiamondRSP'}
    results = []
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf): break
        tlen = struct.unpack('>I', buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf): break
        parsed = parse_response(buf[pos:pos+4+tlen])
        pos += 4 + tlen
        if parsed['message'] not in skip:
            results.append(parsed)
    return results

def show_response(parsed):
    """Pretty print a parsed response."""
    msg = parsed['message']
    payload_rsp = parsed.get('payload', b'')
    ff = _parse_proto_fields(payload_rsp) if payload_rsp else {}
    items = []
    for k in sorted(ff.keys()):
        for v in ff[k]:
            if isinstance(v, int):
                extra = ""
                if abs(v) > 100 and not (1700000000 < v < 1800000000):
                    extra = f" (/ 100 = {v/100:.2f})"
                if 1700000000 < v < 1800000000:
                    dt = time.strftime('%Y-%m-%d %H:%M', time.localtime(v))
                    extra = f" (ts: {dt})"
                items.append(f"f{k}={v}{extra}")
            elif isinstance(v, bytes):
                if len(v) < 50:
                    try:
                        items.append(f"f{k}='{v.decode()}'")
                    except:
                        items.append(f"f{k}=<bytes:{len(v)}>")
                else:
                    items.append(f"f{k}=<bytes:{len(v)}>")
    return f"  [{msg}] {', '.join(items)}"


# ============================================================
# FASE 1: pb.MoneyREQ direto
# ============================================================
print("=" * 60)
print("FASE 1: pb.MoneyREQ direto")
print("=" * 60)

money_tests = [
    ("vazio", b''),
    ("f1=club_id", b'\x08' + encode_varint(CLUB_ID)),
    ("f1=uid", b'\x08' + encode_varint(MY_UID)),
    ("f1=club_id, f2=uid", b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(MY_UID)),
    ("f1=uid, f2=club_id", b'\x08' + encode_varint(MY_UID) + b'\x10' + encode_varint(CLUB_ID)),
]

for desc, pl in money_tests:
    print(f"\n--- pb.MoneyREQ: {desc} ---")
    client.send(build_message('pb.MoneyREQ', pl))
    time.sleep(0.5)
    for r in drain_all(3):
        print(show_response(r))


# ============================================================
# FASE 2: FundREQ para diferentes membros -> MoneyRSP?
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 2: FundREQ com UIDs de membros diferentes")
print("=" * 60)

# Membros conhecidos do probe anterior
test_members = [
    (2914397, "LordSnow"),
    (6295818, "onlyterps"),
    (11928958, "Carrarinhaa"),
    (1024292, "frajjola"),
    (11468067, "SydneySweeney"),
]

for uid, nome in test_members:
    print(f"\n--- FundREQ: club={CLUB_ID}, uid={uid} ({nome}) ---")
    pl = b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(uid)
    client.send(build_message('pb.FundREQ', pl))
    time.sleep(0.5)
    for r in drain_all(3):
        print(show_response(r))

# Agora testar com o próprio UID novamente pra confirmar
print(f"\n--- FundREQ: club={CLUB_ID}, uid={MY_UID} (próprio) ---")
pl = b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(MY_UID)
client.send(build_message('pb.FundREQ', pl))
time.sleep(0.5)
for r in drain_all(3):
    print(show_response(r))


# ============================================================
# FASE 3: Testar pb.NewMailREQ e outras mensagens relacionadas
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 3: Mensagens relacionadas a Money/Mail/Wallet")
print("=" * 60)

related_names = [
    ("pb.NewMailREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MailREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MailListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.WalletInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MoneyInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MoneyListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MoneyLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.MoneyRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundDetailREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Com uid
    ("pb.MoneyInfoREQ+uid", b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(MY_UID)),
    ("pb.FundInfoREQ+uid", b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(MY_UID)),
]

for name_desc, pl in related_names:
    name = name_desc.split('+')[0]
    client.send(build_message(name, pl))
    time.sleep(0.1)

time.sleep(0.5)
seen = set()
for r in drain_all(5):
    msg = r['message']
    if msg not in seen:
        seen.add(msg)
        print(show_response(r))

# ============================================================
# FASE 4: Investigar valor do MoneyRSP mais a fundo
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 4: MoneyRSP - investigação detalhada")
print("=" * 60)

# Enviar FundREQ com próprio UID e examinar TODA a resposta em hex
pl = b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(MY_UID)
client.send(build_message('pb.FundREQ', pl))
time.sleep(0.5)

for r in drain_all(3):
    msg = r['message']
    payload_rsp = r.get('payload', b'')
    if msg == 'pb.MoneyRSP':
        print(f"\n  [{msg}] payload ({len(payload_rsp)} bytes):")
        print(f"  hex: {payload_rsp.hex()}")
        ff = _parse_proto_fields(payload_rsp)
        print(f"  fields: {dict(ff)}")
        for k in sorted(ff.keys()):
            for v in ff[k]:
                if isinstance(v, int):
                    print(f"    f{k} = {v}")
                    print(f"         / 100 = {v/100:.2f}")
                    print(f"         / 1000 = {v/1000:.3f}")
                    print(f"         / 10000 = {v/10000:.4f}")
                elif isinstance(v, bytes):
                    print(f"    f{k} = <bytes:{len(v)}>")
                    sub = _parse_proto_fields(v)
                    for sk in sorted(sub.keys()):
                        for sv in sub[sk]:
                            if isinstance(sv, int):
                                print(f"      .f{sk} = {sv} (/ 100 = {sv/100:.2f})")
    elif msg == 'pb.FundRSP':
        print(f"\n  [{msg}] payload ({len(payload_rsp)} bytes):")
        print(f"  hex: {payload_rsp.hex()}")
        ff = _parse_proto_fields(payload_rsp)
        for k in sorted(ff.keys()):
            for v in ff[k]:
                if isinstance(v, int):
                    print(f"    f{k} = {v}")
    elif msg == 'pb.NewMailRSP':
        print(f"\n  [{msg}] payload: {payload_rsp.hex()}")
    else:
        print(show_response(r))

client.close()
print("\n[Done]")
