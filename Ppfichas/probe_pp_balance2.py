#!/usr/bin/env python3
"""
Probe 2: Investigar campos desconhecidos do ClubMemberRSP
e testar ClubMemberDetailREQ com diferentes payloads.
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
print("PROBE 2: Campos desconhecidos + ClubMemberDetailREQ")
print("=" * 60)

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("gserver_ip"))
client.login()
client.enter_club(CLUB_ID)
print(f"Logado como UID {login['uid']}, clube {CLUB_ID}\n")

# ============================================================
# FASE 1: Dump TODOS os valores dos campos desconhecidos
# ============================================================
print("=" * 60)
print("FASE 1: Campos desconhecidos - valores de TODOS membros")
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

    unknown_fields = [7, 8, 9, 10, 11, 14, 16, 17, 18, 21]

    # Collect all values for unknown fields
    member_data = []
    for raw in fields.get(3, []):
        if not isinstance(raw, bytes):
            continue
        f = _parse_proto_fields(raw)
        uid = _first(f, 2)
        nome = _first(f, 3, '?')
        papel = _first(f, 1, 10)
        saldo_caixa = _first(f, 23)

        row = {'uid': uid, 'nome': nome, 'papel': papel, 'saldo_caixa': saldo_caixa}
        for fk in unknown_fields:
            vals = f.get(fk, [])
            if vals:
                v = vals[0]
                if isinstance(v, int):
                    # signed conversion
                    if v >= 2**63:
                        v = v - 2**64
                    row[f'f{fk}'] = v
                elif isinstance(v, bytes):
                    row[f'f{fk}'] = f'<bytes:{len(v)}>'
                else:
                    row[f'f{fk}'] = v
            else:
                row[f'f{fk}'] = None
        member_data.append(row)

    # Print header
    papel_names = {1: 'Dono', 2: 'Gestor', 4: 'SuperAg', 5: 'Agente', 10: 'Membro'}

    # Show non-zero fields for each unknown
    for fk in unknown_fields:
        col = f'f{fk}'
        non_zero = [(m['uid'], m['nome'], m['papel'], m[col])
                    for m in member_data
                    if m[col] is not None and m[col] != 0]
        all_vals = [m[col] for m in member_data if m[col] is not None]
        unique = set(all_vals)

        print(f"\n--- f{fk}: {len(non_zero)} membros com valor != 0 (de {len(all_vals)} total) ---")
        print(f"    Valores únicos: {sorted(unique)[:20]}")

        if len(non_zero) > 0 and len(non_zero) <= 20:
            for uid, nome, papel, val in non_zero:
                p = papel_names.get(papel, f'?{papel}')
                extra = ""
                if isinstance(val, int) and abs(val) > 1000:
                    extra = f" (/ 100 = {val/100:.2f})"
                elif isinstance(val, int) and 1700000000 < val < 1800000000:
                    dt = time.strftime('%Y-%m-%d %H:%M', time.localtime(val))
                    extra = f" (ts: {dt})"
                print(f"    {nome:30s} [{p:8s}] = {val}{extra}")
        elif len(non_zero) > 20:
            # Show top/bottom 5
            sorted_nz = sorted(non_zero, key=lambda x: x[3] if isinstance(x[3], (int, float)) else 0, reverse=True)
            print(f"    Top 5:")
            for uid, nome, papel, val in sorted_nz[:5]:
                p = papel_names.get(papel, f'?{papel}')
                extra = ""
                if isinstance(val, int) and abs(val) > 1000:
                    extra = f" (/ 100 = {val/100:.2f})"
                print(f"    {nome:30s} [{p:8s}] = {val}{extra}")
            print(f"    Bottom 5:")
            for uid, nome, papel, val in sorted_nz[-5:]:
                p = papel_names.get(papel, f'?{papel}')
                extra = ""
                if isinstance(val, int) and abs(val) > 1000:
                    extra = f" (/ 100 = {val/100:.2f})"
                print(f"    {nome:30s} [{p:8s}] = {val}{extra}")

            # Sum if numeric
            s = sum(v for _, _, _, v in non_zero if isinstance(v, int))
            print(f"    SOMA: {s} (/ 100 = {s/100:.2f})")

    # Summary: check if any unknown field looks like PP balance
    print(f"\n\n=== RESUMO: procurando campo com soma ~190.729 (=19.072.900 em centavos) ===")
    for fk in unknown_fields:
        col = f'f{fk}'
        vals = [m[col] for m in member_data if m[col] is not None and isinstance(m[col], int)]
        total = sum(vals)
        if total != 0:
            print(f"  sum(f{fk}) = {total} (/ 100 = {total/100:.2f})")


# ============================================================
# FASE 2: ClubMemberDetailREQ com payloads diferentes
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 2: ClubMemberDetailREQ com payloads variados")
print("=" * 60)

test_payloads = [
    ("f1=club_id", b'\x08' + encode_varint(CLUB_ID)),
    ("f1=club_id, f2=1", b'\x08' + encode_varint(CLUB_ID) + b'\x10\x01'),
    ("f1=club_id, f2=uid_membro",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(2914397)),  # LordSnow
    ("f1=club_id, f2=uid_proprio",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(login['uid'])),
    ("f1=club_id, f2=uid, f3=1",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(2914397) + b'\x18\x01'),
    ("f1=uid_membro",
     b'\x08' + encode_varint(2914397)),
    ("f1=club_id, f2=0, f3=0, f4=1",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10\x00' + b'\x18\x00' + b'\x20\x01'),
]

for desc, payload in test_payloads:
    print(f"\n[*] pb.ClubMemberDetailREQ: {desc}")
    client.send(build_message('pb.ClubMemberDetailREQ', payload))
    time.sleep(0.3)

    client.sock.settimeout(3)
    buf = b''
    try:
        while True:
            buf += client.sock.recv(65536)
    except:
        pass

    pos = 0
    found = False
    while pos < len(buf):
        if pos + 4 > len(buf): break
        tlen = struct.unpack('>I', buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf): break
        parsed = parse_response(buf[pos:pos+4+tlen])
        pos += 4 + tlen
        msg = parsed['message']
        if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC'):
            continue
        if 'Detail' in msg or 'Member' in msg or 'Coin' in msg:
            found = True
            print(f"  Resposta: {msg}")
            payload_rsp = parsed.get('payload', b'')
            if payload_rsp:
                ff = _parse_proto_fields(payload_rsp)
                for k in sorted(ff.keys()):
                    for v in ff[k]:
                        if isinstance(v, int):
                            extra = ""
                            if abs(v) > 1000:
                                extra = f" (/ 100 = {v/100:.2f})"
                            print(f"    f{k} = {v}{extra}")
                        elif isinstance(v, bytes):
                            if len(v) < 100:
                                try:
                                    print(f"    f{k} = '{v.decode()}'")
                                except:
                                    print(f"    f{k} = <bytes:{len(v)}>")
                                    sub = _parse_proto_fields(v)
                                    for sk in sorted(sub.keys()):
                                        for sv in sub[sk]:
                                            if isinstance(sv, int):
                                                print(f"      .f{sk} = {sv}")
                            else:
                                print(f"    f{k} = <bytes:{len(v)}>")
    if not found:
        print("  (sem resposta relevante)")


# ============================================================
# FASE 3: Testar variantes de "detail" e "info" com membro
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 3: Mais variantes com UID de membro")
print("=" * 60)

member_uid = 2914397  # LordSnow
payload_club_member = (b'\x08' + encode_varint(CLUB_ID) +
                       b'\x10' + encode_varint(member_uid))

new_names = [
    "pb.ClubMemberCoinREQ",
    "pb.ClubMemberPPREQ",
    "pb.ClubMemberAccountREQ",
    "pb.ClubMemberBalanceREQ",
    "pb.ClubUserBalanceREQ",
    "pb.UserPPCoinREQ",
    "pb.MemberCoinREQ",
    "pb.PlayerBalanceREQ",
    "pb.ClubPlayerBalanceREQ",
    "pb.ClubPlayerCoinREQ",
    "pb.ClubPlayerPPCoinREQ",
    "pb.ClubMemberChipREQ",
    "pb.ClubChipBalanceREQ",
    "pb.ChipBalanceREQ",
    "pb.ClubPPREQ",
    "pb.PPInfoREQ",
    "pb.ClubMemberStatREQ",
    "pb.ClubMemberStatsREQ",
    "pb.ClubPlayerStatREQ",
    "pb.ClubPlayerStatsREQ",
]

for name in new_names:
    client.send(build_message(name, payload_club_member))
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
found_set = set()
while pos < len(buf):
    if pos + 4 > len(buf): break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf): break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen
    msg = parsed['message']
    if msg in ('pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
               'pb.ClubInfoRSP', 'pb.DiamondRSP', 'pb.ClubMemberDetailRSP'):
        continue
    if msg not in found_set:
        found_set.add(msg)
        print(f"\n  *** RESPOSTA NOVA: {msg} ***")
        payload_rsp = parsed.get('payload', b'')
        if payload_rsp:
            ff = _parse_proto_fields(payload_rsp)
            for k in sorted(ff.keys()):
                for v in ff[k]:
                    if isinstance(v, int):
                        extra = ""
                        if abs(v) > 1000:
                            extra = f" (/ 100 = {v/100:.2f})"
                        print(f"    f{k} = {v}{extra}")
                    elif isinstance(v, bytes) and len(v) < 100:
                        try:
                            print(f"    f{k} = '{v.decode()}'")
                        except:
                            print(f"    f{k} = <bytes:{len(v)}>")

if not found_set:
    print("\n  Nenhuma resposta nova")
else:
    print(f"\n  Novas: {sorted(found_set)}")

client.close()
print("\n[Done]")
