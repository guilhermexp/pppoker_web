#!/usr/bin/env python3
"""Probe ClubInfoRSP fields to find club balance, user balance, etc."""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req,
    parse_response, _parse_proto_fields, _first, decode_varint
)
import struct
import time

CLUB_ID = 4366162
USERNAME = "FastchipsOnline"
PASSWORD = "pppokerchips0000"

print("[*] HTTP Login...")
login = http_login(USERNAME, PASSWORD)
if not login.get("success"):
    print(f"Login failed: {login}")
    sys.exit(1)

uid = login["uid"]
rdkey = login["rdkey"]
server = login.get("server_ip")
print(f"UID: {uid}, server: {server}")

client = PPPokerClient(uid, rdkey)
if not client.connect(server):
    print("TCP connect failed")
    sys.exit(1)

if not client.login():
    print("TCP login failed")
    sys.exit(1)

print(f"\n[*] Sending ClubInfoREQ for club {CLUB_ID}...")
req = build_club_info_req(CLUB_ID)
client.send(req)
time.sleep(1.5)

# Drain buffer
client.sock.settimeout(3)
buf = b''
try:
    while True:
        chunk = client.sock.recv(65536)
        if not chunk:
            break
        buf += chunk
except Exception:
    pass

print(f"[*] Received {len(buf)} bytes total")

# Parse all messages
pos = 0
while pos < len(buf):
    if pos + 4 > len(buf):
        break
    tlen = struct.unpack('>I', buf[pos:pos+4])[0]
    if pos + 4 + tlen > len(buf):
        break
    parsed = parse_response(buf[pos:pos+4+tlen])
    pos += 4 + tlen

    msg = parsed['message']
    print(f"\n{'='*60}")
    print(f"=== {msg} ===")

    if msg == 'pb.ClubInfoRSP':
        payload = parsed.get('payload', b'')
        print(f"Payload length: {len(payload)} bytes")

        fields = _parse_proto_fields(payload)
        print(f"\nAll top-level fields:")
        for k in sorted(fields.keys()):
            vals = fields[k]
            for v in vals:
                if isinstance(v, bytes):
                    if len(v) < 200:
                        try:
                            txt = v.decode('utf-8')
                            print(f"  f{k} = '{txt}' (string, len={len(v)})")
                            continue
                        except:
                            pass
                    print(f"  f{k} = <bytes len={len(v)}>")
                    try:
                        sub = _parse_proto_fields(v)
                        if sub:
                            for sk in sorted(sub.keys()):
                                for sv in sub[sk]:
                                    if isinstance(sv, int):
                                        print(f"    .f{sk} = {sv}")
                                    elif isinstance(sv, str):
                                        print(f"    .f{sk} = '{sv}'")
                                    elif isinstance(sv, bytes):
                                        if len(sv) < 80:
                                            try:
                                                print(f"    .f{sk} = '{sv.decode()}'")
                                            except:
                                                print(f"    .f{sk} = <bytes {len(sv)}>")
                                        else:
                                            print(f"    .f{sk} = <bytes {len(sv)}>")
                    except:
                        pass
                elif isinstance(v, int):
                    print(f"  f{k} = {v}")
                elif isinstance(v, str):
                    print(f"  f{k} = '{v}'")
                else:
                    print(f"  f{k} = {v}")
    else:
        payload = parsed.get('payload', b'')
        print(f"  payload: {len(payload)} bytes")

client.close()
