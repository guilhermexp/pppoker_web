#!/usr/bin/env python3
"""Check what f18, f53, f58 mean - also get logged-in user's balance."""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req,
    parse_response, _parse_proto_fields, _first, decode_varint, encode_varint, build_message
)
import struct
import time

CLUB_ID = 4366162

print("[*] HTTP Login...")
login = http_login("FastchipsOnline", "pppokerchips0000")
uid = login["uid"]
rdkey = login["rdkey"]
server = login.get("server_ip")
print(f"UID: {uid}")

client = PPPokerClient(uid, rdkey)
client.connect(server)
client.login()

# Enter club and get ClubInfoRSP
print(f"\n[*] ClubInfoREQ...")
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
            print(f"  f2.f5  = {_first(sub, 5)}  (papel do user logado?)")
            print(f"  f2.f6  = {_first(sub, 6)}  (total members)")
            print(f"  f2.f7  = {_first(sub, 7)}  (?)")
            print(f"  f2.f18 = {_first(sub, 18)} (/ 100 = {_first(sub, 18, 0) / 100:.2f})")
            print(f"  f2.f19 = {_first(sub, 19)} (/ 100 = {_first(sub, 19, 0) / 100:.2f})")
            print(f"  f2.f22 = {_first(sub, 22)}")
            print(f"  f2.f24 = {_first(sub, 24)}")
            print(f"  f2.f39 = {_first(sub, 39)}")
            print(f"  f2.f40 = {_first(sub, 40)}")
            print(f"  f2.f43 = {_first(sub, 43)}")
            print(f"  f2.f49 = {_first(sub, 49)}")
            print(f"  f2.f50 = {_first(sub, 50)}")
            print(f"  f2.f53 = {_first(sub, 53)} (/ 100 = {_first(sub, 53, 0) / 100:.2f})")
            print(f"  f2.f55 = {_first(sub, 55)}")
            print(f"  f2.f56 = {_first(sub, 56)}")
            print(f"  f2.f57 = {_first(sub, 57)}")
            print(f"  f2.f58 = {_first(sub, 58)} (/ 100 = {_first(sub, 58, 0) / 100:.2f})")

# Now get member info for the logged-in user to see their balance
print(f"\n[*] Getting member info for UID {uid}...")
result = client.get_member_info(CLUB_ID, uid)
print(f"  nome: {result.get('nome')}")
print(f"  papel: {result.get('papel')}")
print(f"  saldo_caixa: {result.get('saldo_caixa')}")
print(f"  credito: {result.get('credito_linha')}")

client.close()
