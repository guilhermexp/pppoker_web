#!/usr/bin/env python3
"""Deep dive into ClubInfoRSP to find 190729 (total fichas jogadores)."""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req,
    parse_response, _parse_proto_fields, _first
)
import struct, time

CLUB_ID = 4366162
TARGET = 190729  # valor que o user vê no app
TARGET_CENTS = int(TARGET * 100)  # 19072900

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("server_ip"))
client.login()

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
    if parsed['message'] != 'pb.ClubInfoRSP':
        continue

    payload = parsed.get('payload', b'')
    fields = _parse_proto_fields(payload)
    f2_raw = fields.get(2, [None])[0]
    if not isinstance(f2_raw, bytes):
        continue

    sub = _parse_proto_fields(f2_raw)

    # Check all numeric fields
    print("=== ALL numeric fields in f2 ===")
    for k in sorted(sub.keys()):
        for v in sub[k]:
            if isinstance(v, int):
                # Check if any division yields ~190729
                for div in [1, 100, 10, 1000]:
                    val = v / div
                    if abs(val - TARGET) < 100:
                        print(f"  *** f{k} = {v} / {div} = {val:.2f} *** MATCH!")
                if v > 100:
                    print(f"  f{k} = {v} (/ 100 = {v/100:.2f})")

    # Deep dive into f20 (bytes 2540)
    f20_raw = _first(sub, 20)
    if isinstance(f20_raw, bytes):
        print(f"\n=== f2.f20 sub-message ({len(f20_raw)} bytes) ===")
        f20_sub = _parse_proto_fields(f20_raw)
        for k2 in sorted(f20_sub.keys()):
            for v in f20_sub[k2]:
                if isinstance(v, int):
                    for div in [1, 100, 10, 1000]:
                        val = v / div
                        if abs(val - TARGET) < 100:
                            print(f"  *** f20.f{k2} = {v} / {div} = {val:.2f} *** MATCH!")
                    if v > 100:
                        print(f"  f20.f{k2} = {v} (/ 100 = {v/100:.2f})")
                elif isinstance(v, bytes) and len(v) > 10:
                    # Could be another sub-message
                    try:
                        deep = _parse_proto_fields(v)
                        for k3 in sorted(deep.keys()):
                            for dv in deep[k3]:
                                if isinstance(dv, int):
                                    for div in [1, 100, 10]:
                                        val2 = dv / div
                                        if abs(val2 - TARGET) < 100:
                                            print(f"  *** f20.f{k2}.f{k3} = {dv} / {div} = {val2:.2f} *** MATCH!")
                    except:
                        pass

    # f21 sub-message
    f21_raw = _first(sub, 21)
    if isinstance(f21_raw, bytes):
        print(f"\n=== f2.f21 sub-message ({len(f21_raw)} bytes) ===")
        f21_sub = _parse_proto_fields(f21_raw)
        for k2 in sorted(f21_sub.keys()):
            for v in f21_sub[k2]:
                if isinstance(v, int):
                    for div in [1, 100, 10, 1000]:
                        val = v / div
                        if abs(val - TARGET) < 100:
                            print(f"  *** f21.f{k2} = {v} / {div} = {val:.2f} *** MATCH!")
                    if v > 100:
                        print(f"  f21.f{k2} = {v} (/ 100 = {v/100:.2f})")

client.close()
