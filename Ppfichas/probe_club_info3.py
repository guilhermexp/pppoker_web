#!/usr/bin/env python3
"""Compare ClubInfoRSP fields with actual member balances."""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req,
    parse_response, _parse_proto_fields, _first
)
import struct, time

CLUB_ID = 4366162
login = http_login("FastchipsOnline", "pppokerchips0000")
uid = login["uid"]
rdkey = login["rdkey"]
server = login.get("server_ip")

client = PPPokerClient(uid, rdkey)
client.connect(server)
client.login()

# Get ClubInfoRSP
client.send(build_club_info_req(CLUB_ID))
time.sleep(1.5)
client.sock.settimeout(3)
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
    if parsed['message'] == 'pb.ClubInfoRSP':
        payload = parsed.get('payload', b'')
        fields = _parse_proto_fields(payload)
        f2_raw = fields.get(2, [None])[0]
        if isinstance(f2_raw, bytes):
            sub = _parse_proto_fields(f2_raw)
            print("=== ClubInfoRSP f2 fields (candidates for totals) ===")
            for k in sorted(sub.keys()):
                for v in sub[k]:
                    if isinstance(v, int) and v > 1000:
                        print(f"  f{k} = {v} (/ 100 = {v/100:.2f})")

# Now get member list and sum up balances
print("\n[*] Getting member list...")
result = client.list_club_members(CLUB_ID)
members = result.get('members', [])
print(f"Total members: {len(members)}")

total_saldo = 0
total_positivo = 0
total_negativo = 0
for m in members:
    saldo = m.get('saldo_caixa') or 0
    total_saldo += saldo
    if saldo > 0:
        total_positivo += saldo
    elif saldo < 0:
        total_negativo += saldo

print(f"\nSoma saldo_caixa de TODOS membros: {total_saldo:.2f}")
print(f"Soma saldos POSITIVOS: {total_positivo:.2f}")
print(f"Soma saldos NEGATIVOS: {total_negativo:.2f}")
print(f"Total positivo (centavos): {int(total_positivo * 100)}")
print(f"Total negativo (centavos): {int(total_negativo * 100)}")

# Also show top 10 members by balance
members_sorted = sorted(members, key=lambda m: m.get('saldo_caixa', 0) or 0, reverse=True)
print("\nTop 10 saldos:")
for m in members_sorted[:10]:
    print(f"  {m.get('nome', '?')} (UID {m.get('uid')}): {m.get('saldo_caixa', 0):.2f}")

print("\nBottom 5 saldos:")
for m in members_sorted[-5:]:
    print(f"  {m.get('nome', '?')} (UID {m.get('uid')}): {m.get('saldo_caixa', 0):.2f}")

client.close()
