#!/usr/bin/env python3
"""
Probe 4: Investigar pb.FundREQ e derivados (respondeu!).
Também testa ClubConfigRSP em detalhe e novos padrões.
"""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_message,
    parse_response, _parse_proto_fields, _first, encode_varint
)
import struct, time

CLUB_ID = 4366162
LIGA_ID = 1765

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("gserver_ip"))
client.login()
client.enter_club(CLUB_ID)
print(f"Logado como UID {login['uid']}\n")

def drain_and_show(timeout=4):
    """Drain buffer and show all non-noise responses."""
    client.sock.settimeout(timeout)
    buf = b''
    try:
        while True:
            buf += client.sock.recv(65536)
    except:
        pass

    skip = {'pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
            'pb.ClubInfoRSP', 'pb.DiamondRSP'}
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf): break
        tlen = struct.unpack('>I', buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf): break
        parsed = parse_response(buf[pos:pos+4+tlen])
        pos += 4 + tlen
        msg = parsed['message']
        if msg in skip:
            continue

        print(f"\n  [{msg}] ({len(parsed.get('payload', b''))} bytes)")
        payload_rsp = parsed.get('payload', b'')
        if payload_rsp:
            ff = _parse_proto_fields(payload_rsp)
            for k in sorted(ff.keys()):
                for idx, v in enumerate(ff[k]):
                    if isinstance(v, int):
                        extra = ""
                        if abs(v) > 100:
                            extra = f" (/ 100 = {v/100:.2f})"
                        if 1700000000 < v < 1800000000:
                            dt = time.strftime('%Y-%m-%d %H:%M', time.localtime(v))
                            extra = f" (ts: {dt})"
                        print(f"    f{k} = {v}{extra}")
                    elif isinstance(v, bytes):
                        if len(v) < 100:
                            try:
                                print(f"    f{k} = '{v.decode()}'")
                            except:
                                print(f"    f{k} = <bytes:{len(v)}>")
                                try:
                                    sub = _parse_proto_fields(v)
                                    for sk in sorted(sub.keys())[:15]:
                                        for sv in sub[sk]:
                                            if isinstance(sv, int):
                                                e2 = f" (/ 100 = {sv/100:.2f})" if abs(sv) > 100 else ""
                                                print(f"      .f{sk} = {sv}{e2}")
                                            elif isinstance(sv, bytes) and len(sv) < 40:
                                                try:
                                                    print(f"      .f{sk} = '{sv.decode()}'")
                                                except:
                                                    print(f"      .f{sk} = <bytes:{len(sv)}>")
                                except:
                                    pass
                        else:
                            print(f"    f{k}[{idx}] = <bytes:{len(v)}>")


# ============================================================
# FASE 1: pb.FundREQ com payloads variados
# ============================================================
print("=" * 60)
print("FASE 1: pb.FundREQ / pb.ClubFundREQ - variantes")
print("=" * 60)

fund_tests = [
    # pb.FundREQ variants
    ("pb.FundREQ", "vazio", b''),
    ("pb.FundREQ", "f1=club_id", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FundREQ", "f1=liga_id", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.FundREQ", "f1=uid", b'\x08' + encode_varint(login['uid'])),
    ("pb.FundREQ", "f1=club_id, f2=uid",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(login['uid'])),
    ("pb.FundREQ", "f1=club_id, f2=liga_id",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(LIGA_ID)),
    ("pb.FundREQ", "f1=liga_id, f2=club_id",
     b'\x08' + encode_varint(LIGA_ID) + b'\x10' + encode_varint(CLUB_ID)),
    ("pb.FundREQ", "f1=club_id, f2=1",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10\x01'),
    ("pb.FundREQ", "f1=club_id, f2=0, f3=1",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10\x00' + b'\x18\x01'),

    # pb.ClubFundREQ variants
    ("pb.ClubFundREQ", "f1=club_id", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubFundREQ", "f1=club_id, f2=1",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10\x01'),
]

for msg_name, desc, pl in fund_tests:
    print(f"\n--- {msg_name}: {desc} ---")
    client.send(build_message(msg_name, pl))
    time.sleep(0.4)
    drain_and_show(3)

# ============================================================
# FASE 2: ClubConfigRSP deep dive (f3 sub-message)
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 2: ClubConfigRSP deep dive")
print("=" * 60)

client.send(build_message('pb.ClubConfigREQ', b'\x08' + encode_varint(CLUB_ID)))
time.sleep(0.5)

client.sock.settimeout(4)
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
    if parsed['message'] != 'pb.ClubConfigRSP':
        continue

    print(f"\n  [pb.ClubConfigRSP] ({len(parsed.get('payload', b''))} bytes)")
    ff = _parse_proto_fields(parsed.get('payload', b''))
    print(f"  f1 = {_first(ff, 1)} (club_id)")
    print(f"  f2 = {_first(ff, 2)} (code)")

    f3_raw = _first(ff, 3)
    if isinstance(f3_raw, bytes):
        sub = _parse_proto_fields(f3_raw)
        print(f"\n  f3 sub-message ({len(f3_raw)} bytes, {len(sub)} fields):")
        for k in sorted(sub.keys()):
            for v in sub[k]:
                if isinstance(v, int):
                    extra = ""
                    if abs(v) > 100:
                        extra = f" (/ 100 = {v/100:.2f})"
                    print(f"    f{k} = {v}{extra}")
                elif isinstance(v, bytes):
                    if len(v) < 100:
                        try:
                            decoded = v.decode()
                            if decoded.strip():
                                print(f"    f{k} = '{decoded}'")
                            else:
                                print(f"    f{k} = '' (empty)")
                        except:
                            print(f"    f{k} = <bytes:{len(v)}>")
                            try:
                                sub2 = _parse_proto_fields(v)
                                for sk in sorted(sub2.keys()):
                                    for sv in sub2[sk]:
                                        if isinstance(sv, int):
                                            print(f"      .f{sk} = {sv}")
                                        elif isinstance(sv, bytes) and len(sv) < 30:
                                            try:
                                                print(f"      .f{sk} = '{sv.decode()}'")
                                            except:
                                                pass
                            except:
                                pass
                    else:
                        print(f"    f{k} = <bytes:{len(v)}>")

# ============================================================
# FASE 3: Padrões com "Log" e "Record" mais específicos
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 3: Log/Record/Bill patterns")
print("=" * 60)

# Tentar com tipo de operação (send=1, withdraw=2, etc.)
log_tests = [
    # AddCoin related (já que AddCoinREQ funciona, talvez tenha log)
    ("pb.AddCoinRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CoinRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CoinRecordListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.AddCoinListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.AddCoinHistoryREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CoinHistoryREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Operate patterns (like ClubAgentPPCoin)
    ("pb.ClubAgentOperateREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubOperateREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.OperateREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.OperateRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.OperateListREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Statement / Flow
    ("pb.StatementREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubStatementREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.FlowREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubFlowREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CashFlowREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCashFlowREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Turn / Round (game data)
    ("pb.TurnREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.RoundREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.GameRoundREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.GameTurnREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubGameRoundREQ", b'\x08' + encode_varint(CLUB_ID)),

    # Credit specific
    ("pb.CreditREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CreditInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CreditLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.CreditRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCreditInfoREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCreditLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubCreditRecordREQ", b'\x08' + encode_varint(CLUB_ID)),

    # PPCoin variations
    ("pb.PPCoinRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.PPCoinHistoryREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.PPCoinLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.PPCoinListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubPPCoinListREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubPPCoinLogREQ", b'\x08' + encode_varint(CLUB_ID)),
    ("pb.ClubPPCoinRecordREQ", b'\x08' + encode_varint(CLUB_ID)),
]

for name, pl in log_tests:
    client.send(build_message(name, pl))
    time.sleep(0.08)

time.sleep(0.5)
drain_and_show(6)

# ============================================================
# FASE 4: Testar mensagens com liga_id em vez de club_id
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 4: Mensagens com liga_id")
print("=" * 60)

liga_tests = [
    ("pb.LeagueInfoREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueStatREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueDataREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueConfigREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueFundREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueBalanceREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.LeagueSummaryREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.FederationREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.FederationInfoREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.FederationMemberREQ", b'\x08' + encode_varint(LIGA_ID)),
    ("pb.FederationStatREQ", b'\x08' + encode_varint(LIGA_ID)),
]

for name, pl in liga_tests:
    client.send(build_message(name, pl))
    time.sleep(0.1)

time.sleep(0.5)
drain_and_show(5)

client.close()
print("\n[Done]")
