#!/usr/bin/env python3
"""Dump ALL fields of each member to find PP chip balance."""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req, build_message,
    parse_response, _parse_proto_fields, _first, encode_varint
)
import struct, time

CLUB_ID = 4366162
login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("server_ip"))
client.login()
client.enter_club(CLUB_ID)

# Get full member list raw
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

    # Only look at first 3 members in detail
    count = 0
    for raw in fields.get(3, []):
        if not isinstance(raw, bytes):
            continue
        f = _parse_proto_fields(raw)
        nome = _first(f, 3, '?')
        uid = _first(f, 2)
        saldo_23 = _first(f, 23)

        # Show ALL fields for first 3 members
        if count < 3:
            print(f"\n=== {nome} (UID {uid}) ===")
            for k in sorted(f.keys()):
                for v in f[k]:
                    if isinstance(v, int):
                        print(f"  f{k} = {v}")
                    elif isinstance(v, str):
                        if len(v) < 80:
                            print(f"  f{k} = '{v}'")
                    elif isinstance(v, bytes):
                        if len(v) < 50:
                            try:
                                print(f"  f{k} = '{v.decode()}'")
                            except:
                                print(f"  f{k} = <bytes {len(v)}>")
                                # Parse sub-message
                                try:
                                    sub = _parse_proto_fields(v)
                                    for sk in sorted(sub.keys()):
                                        for sv in sub[sk]:
                                            if isinstance(sv, int):
                                                print(f"    .f{sk} = {sv}")
                                except:
                                    pass
                        else:
                            print(f"  f{k} = <bytes {len(v)}>")
        count += 1

    # Now sum various fields across ALL members
    print(f"\n\n{'='*60}")
    print(f"Total members: {count}")

    sums = {}
    for raw in fields.get(3, []):
        if not isinstance(raw, bytes):
            continue
        f = _parse_proto_fields(raw)
        for k in f:
            for v in f[k]:
                if isinstance(v, int) and k not in (2, 6, 15, 24, 25):
                    sums.setdefault(k, 0)
                    sums[k] += v

    print("\nSum of numeric fields across all members:")
    for k in sorted(sums.keys()):
        v = sums[k]
        if abs(v) > 100:
            print(f"  sum(f{k}) = {v} (/ 100 = {v/100:.2f})")

client.close()
