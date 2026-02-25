#!/usr/bin/env python3
"""
Dump COMPLETO de todos os campos do ClubInfoRSP.
Objetivo: encontrar campos que indiquem:
  - Clube privado vs público
  - Pertence a liga (league_id)
  - PPST habilitado
  - PPSR habilitado
  - Hierarquia do dono (liga, super union)
"""
import sys, struct, time
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_club_info_req,
    parse_response, _parse_proto_fields, _first
)

CLUB_ID = 4366162

def dump_fields(fields, prefix="", depth=0):
    """Recursively dump all protobuf fields."""
    indent = "  " * depth
    for k in sorted(fields.keys()):
        for i, v in enumerate(fields[k]):
            field_name = f"{prefix}f{k}" + (f"[{i}]" if len(fields[k]) > 1 else "")
            if isinstance(v, int):
                print(f"{indent}{field_name} = {v} (0x{v & 0xFFFFFFFF:08x})" +
                      (f" = {v/100:.2f} /100" if abs(v) > 100 else ""))
            elif isinstance(v, bytes):
                if len(v) < 100:
                    # Try to decode as string
                    try:
                        s = v.decode('utf-8')
                        if s.isprintable() and len(s) > 0:
                            print(f"{indent}{field_name} = \"{s}\" (string, {len(v)} bytes)")
                            continue
                    except:
                        pass

                # Try to parse as sub-message
                try:
                    sub = _parse_proto_fields(v)
                    if sub and len(sub) > 0:
                        print(f"{indent}{field_name} = <sub-message, {len(v)} bytes, {len(sub)} fields>")
                        if depth < 3:  # max depth
                            dump_fields(sub, f"{prefix}f{k}.", depth + 1)
                        continue
                except:
                    pass

                # Raw bytes
                hex_preview = v[:32].hex()
                print(f"{indent}{field_name} = bytes[{len(v)}] {hex_preview}...")
            elif isinstance(v, float):
                print(f"{indent}{field_name} = {v}")

print("=" * 60)
print("PROBE: ClubInfoRSP Full Dump")
print("=" * 60)

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("server_ip"))
client.login()

# Request club info
client.send(build_club_info_req(CLUB_ID))
time.sleep(2)
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
        print(f"  (skip: {parsed['message']})")
        continue

    payload = parsed.get('payload', b'')
    print(f"\n--- ClubInfoRSP payload: {len(payload)} bytes ---")

    # Top level fields
    top = _parse_proto_fields(payload)
    print("\n=== TOP LEVEL FIELDS ===")
    for k in sorted(top.keys()):
        for v in top[k]:
            if isinstance(v, int):
                print(f"  f{k} = {v}")
            elif isinstance(v, bytes):
                print(f"  f{k} = <bytes, {len(v)} bytes>")

    # f2 = main club info sub-message
    f2_raw = top.get(2, [None])[0]
    if isinstance(f2_raw, bytes):
        sub = _parse_proto_fields(f2_raw)
        print(f"\n=== f2 SUB-MESSAGE ({len(f2_raw)} bytes, {len(sub)} fields) ===")
        print(f"    Fields present: {sorted(sub.keys())}")
        dump_fields(sub, "f2.", depth=1)

    # f3 if exists (sometimes has config or extra data)
    f3_raw = top.get(3, [None])[0]
    if isinstance(f3_raw, bytes):
        sub3 = _parse_proto_fields(f3_raw)
        print(f"\n=== f3 SUB-MESSAGE ({len(f3_raw)} bytes) ===")
        dump_fields(sub3, "f3.", depth=1)

    # Check any other top-level fields
    for k in sorted(top.keys()):
        if k in [2, 3]:
            continue
        for v in top[k]:
            if isinstance(v, bytes) and len(v) > 4:
                try:
                    sub_x = _parse_proto_fields(v)
                    if sub_x:
                        print(f"\n=== f{k} SUB-MESSAGE ({len(v)} bytes) ===")
                        dump_fields(sub_x, f"f{k}.", depth=1)
                except:
                    pass

client.close()
print("\n=== DONE ===")
