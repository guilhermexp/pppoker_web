#!/usr/bin/env python3
"""
Probe 3: Testar GameDataREQ com payloads variados + procurar equivalente
in-app do export (sem enviar email).

Também testa padrões com "Stat", "Score", "Rank", "Summary".
"""
import sys
sys.path.insert(0, '/Users/macosx/Ppfichas')
from pppoker_direct_api import (
    PPPokerClient, http_login, build_message,
    parse_response, _parse_proto_fields, _first, encode_varint
)
import struct, time
from datetime import datetime, timezone, timedelta

CLUB_ID = 4366162

print("=" * 60)
print("PROBE 3: GameDataREQ + Stat/Score/Rank/Summary patterns")
print("=" * 60)

login = http_login("FastchipsOnline", "pppokerchips0000")
client = PPPokerClient(login["uid"], login["rdkey"])
client.connect(login.get("gserver_ip"))
client.login()
client.enter_club(CLUB_ID)
print(f"Logado como UID {login['uid']}\n")

def drain_and_show(timeout=4, filter_msgs=None):
    """Drain buffer and show all responses."""
    client.sock.settimeout(timeout)
    buf = b''
    try:
        while True:
            buf += client.sock.recv(65536)
    except:
        pass

    pos = 0
    found = []
    skip = {'pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.NoticeBRC',
            'pb.ClubInfoRSP', 'pb.DiamondRSP'}
    while pos < len(buf):
        if pos + 4 > len(buf): break
        tlen = struct.unpack('>I', buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf): break
        parsed = parse_response(buf[pos:pos+4+tlen])
        pos += 4 + tlen
        msg = parsed['message']
        if msg in skip:
            continue
        if filter_msgs and msg not in filter_msgs:
            continue

        found.append(msg)
        print(f"\n  [{msg}] (payload: {len(parsed.get('payload', b''))} bytes)")
        payload_rsp = parsed.get('payload', b'')
        if payload_rsp:
            ff = _parse_proto_fields(payload_rsp)
            for k in sorted(ff.keys()):
                for v in ff[k]:
                    if isinstance(v, int):
                        extra = ""
                        if abs(v) > 1000 and abs(v) < 2000000000:
                            extra = f" (/ 100 = {v/100:.2f})"
                        elif 1700000000 < v < 1800000000:
                            dt = time.strftime('%Y-%m-%d %H:%M', time.localtime(v))
                            extra = f" (ts: {dt})"
                        print(f"    f{k} = {v}{extra}")
                    elif isinstance(v, bytes):
                        if len(v) < 80:
                            try:
                                decoded = v.decode()
                                print(f"    f{k} = '{decoded}'")
                            except:
                                print(f"    f{k} = <bytes:{len(v)}>")
                                try:
                                    sub = _parse_proto_fields(v)
                                    for sk in sorted(sub.keys()):
                                        for sv in sub[sk]:
                                            if isinstance(sv, int):
                                                e2 = ""
                                                if abs(sv) > 100:
                                                    e2 = f" (/ 100 = {sv/100:.2f})"
                                                print(f"      .f{sk} = {sv}{e2}")
                                            elif isinstance(sv, bytes) and len(sv) < 50:
                                                try:
                                                    print(f"      .f{sk} = '{sv.decode()}'")
                                                except:
                                                    print(f"      .f{sk} = <bytes:{len(sv)}>")
                                except:
                                    pass
                        else:
                            print(f"    f{k} = <bytes:{len(v)}>")
                            # For large payloads, try to parse and show structure
                            try:
                                sub = _parse_proto_fields(v)
                                print(f"      (sub-message keys: {sorted(sub.keys())})")
                                # Show first few fields
                                for sk in sorted(sub.keys())[:10]:
                                    sv = sub[sk][0] if sub[sk] else None
                                    if isinstance(sv, int):
                                        print(f"      .f{sk} = {sv}")
                                    elif isinstance(sv, bytes) and len(sv) < 40:
                                        try:
                                            print(f"      .f{sk} = '{sv.decode()}'")
                                        except:
                                            print(f"      .f{sk} = <bytes:{len(sv)}>")
                            except:
                                pass
    return found


# ============================================================
# FASE 1: GameDataREQ com payloads variados
# ============================================================
print("=" * 60)
print("FASE 1: pb.GameDataREQ com diferentes payloads")
print("=" * 60)

# Datas de hoje e ontem
now = datetime.now(timezone(timedelta(hours=-5)))
today_ts = int(now.replace(hour=0, minute=0, second=0).timestamp())
yesterday_ts = today_ts - 86400
week_ago_ts = today_ts - 7 * 86400

payloads_gd = [
    ("vazio", b''),
    ("f1=club_id", b'\x08' + encode_varint(CLUB_ID)),
    ("f1=club_id, f2=1", b'\x08' + encode_varint(CLUB_ID) + b'\x10\x01'),
    ("f1=club_id, f2=today_ts",
     b'\x08' + encode_varint(CLUB_ID) + b'\x10' + encode_varint(today_ts)),
    ("f1=club_id, f2=yesterday_ts, f3=today_ts",
     b'\x08' + encode_varint(CLUB_ID) +
     b'\x10' + encode_varint(yesterday_ts) +
     b'\x18' + encode_varint(today_ts)),
    ("f1=club_id, f2=week_ago_ts, f3=today_ts",
     b'\x08' + encode_varint(CLUB_ID) +
     b'\x10' + encode_varint(week_ago_ts) +
     b'\x18' + encode_varint(today_ts)),
]

for desc, pl in payloads_gd:
    print(f"\n--- pb.GameDataREQ: {desc} ---")
    client.send(build_message('pb.GameDataREQ', pl))
    time.sleep(0.5)
    drain_and_show(3, {'pb.GameDataRSP'})

# ============================================================
# FASE 2: ClubConfigREQ
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 2: pb.ClubConfigREQ")
print("=" * 60)

client.send(build_message('pb.ClubConfigREQ', b'\x08' + encode_varint(CLUB_ID)))
time.sleep(0.5)
drain_and_show(3)

# ============================================================
# FASE 3: Padrões com Stat/Score/Rank/Summary/Data
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 3: Stat/Score/Rank/Summary patterns")
print("=" * 60)

stat_names = [
    # Stat patterns
    "pb.ClubStatREQ",
    "pb.ClubStatisticsREQ",
    "pb.ClubMemberStatREQ",
    "pb.PlayerStatREQ",
    "pb.PlayerStatisticsREQ",

    # Score/Rank
    "pb.ClubScoreREQ",
    "pb.ClubRankREQ",
    "pb.ClubRankListREQ",
    "pb.PlayerScoreREQ",
    "pb.PlayerRankREQ",

    # Summary/Overview
    "pb.ClubSummaryREQ",
    "pb.ClubOverviewREQ",
    "pb.ClubDashboardREQ",
    "pb.ClubPanelREQ",
    "pb.ClubViewREQ",

    # Data patterns (like the export but in-app)
    "pb.ClubGameDataREQ",
    "pb.GameInfoREQ",
    "pb.ClubGameInfoREQ",
    "pb.InGameDataREQ",

    # Audit / Log
    "pb.AuditREQ",
    "pb.ClubAuditREQ",
    "pb.ActivityREQ",
    "pb.ClubActivityREQ",

    # Wallet / Fund
    "pb.WalletREQ",
    "pb.ClubWalletREQ",
    "pb.FundREQ",
    "pb.ClubFundREQ",

    # Settlement / Clearing
    "pb.SettlementREQ",
    "pb.ClubSettlementREQ",
    "pb.ClearingREQ",
    "pb.ClubClearingREQ",

    # Club variations
    "pb.ClubInfoDetailREQ",
    "pb.ClubDetailInfoREQ",
    "pb.ClubFullInfoREQ",
    "pb.ClubExtInfoREQ",

    # Agent data
    "pb.AgentDataREQ",
    "pb.ClubAgentDataREQ",
    "pb.AgentStatREQ",
    "pb.ClubAgentStatREQ",
    "pb.AgentReportREQ",
    "pb.ClubAgentReportREQ",
]

for name in stat_names:
    pl = b'\x08' + encode_varint(CLUB_ID)
    client.send(build_message(name, pl))
    time.sleep(0.1)

time.sleep(0.5)
found = drain_and_show(6)
if found:
    print(f"\nNovas respostas: {found}")
else:
    print("\nNenhuma resposta nova")

# ============================================================
# FASE 4: Padrões chineses (PPPoker é empresa chinesa)
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 4: Padrões alternativos")
print("=" * 60)

# Trying patterns that match PPPoker's DLL namespaces
alt_names = [
    # From PP.Production namespace patterns
    "pb.ClubBillREQ",
    "pb.BillREQ",
    "pb.ClubBillListREQ",
    "pb.BillListREQ",

    # Insurance / Jackpot
    "pb.InsuranceREQ",
    "pb.ClubInsuranceREQ",
    "pb.JackpotREQ",
    "pb.ClubJackpotREQ",

    # Notification / Message
    "pb.ClubNoticeREQ",
    "pb.ClubMessageREQ",
    "pb.ClubMsgREQ",
    "pb.NoticeListREQ",

    # Player profile
    "pb.ProfileREQ",
    "pb.UserProfileREQ",
    "pb.PlayerProfileREQ",
    "pb.UserInfoREQ",

    # Hand history
    "pb.HandREQ",
    "pb.HandHistoryREQ",
    "pb.ClubHandREQ",
    "pb.GameHandREQ",
    "pb.ReplayREQ",
    "pb.HandReplayREQ",

    # Buy-in / Cash out
    "pb.BuyInREQ",
    "pb.CashOutREQ",
    "pb.ClubBuyInREQ",
    "pb.ClubCashOutREQ",
    "pb.BuyInLogREQ",
    "pb.CashOutLogREQ",

    # Chip variants
    "pb.ChipInfoREQ",
    "pb.ClubChipInfoREQ",
    "pb.ChipListREQ",
    "pb.ClubChipListREQ",
    "pb.ChipDetailREQ",
    "pb.ClubChipDetailREQ",

    # Finance
    "pb.FinanceREQ",
    "pb.ClubFinanceREQ",

    # Report with date range
    "pb.DailyReportREQ",
    "pb.ClubDailyReportREQ",
    "pb.WeeklyReportREQ",
    "pb.ClubWeeklyReportREQ",
]

for name in alt_names:
    pl = b'\x08' + encode_varint(CLUB_ID)
    client.send(build_message(name, pl))
    time.sleep(0.08)

time.sleep(0.5)
found = drain_and_show(6)
if found:
    print(f"\nNovas respostas: {found}")
else:
    print("\nNenhuma resposta nova")

# ============================================================
# FASE 5: HTTP API endpoints (rest)
# ============================================================
print("\n\n" + "=" * 60)
print("FASE 5: Testar HTTP API endpoints")
print("=" * 60)

import requests as req

base_urls = [
    "https://api.pppoker.club",
    "https://usbr-allentry.pppoker.club",
]

api_paths = [
    "/poker/api/club_info.php",
    "/poker/api/club_member.php",
    "/poker/api/club_balance.php",
    "/poker/api/club_stats.php",
    "/poker/api/member_info.php",
    "/poker/api/balance.php",
    "/poker/api/chip_log.php",
    "/poker/api/transaction.php",
    "/poker/api/game_data.php",
    "/poker/api/export.php",
]

headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'PPPoker/4.2.56 (iOS)',
}

for base in base_urls:
    for path in api_paths:
        url = base + path
        try:
            r = req.post(url, data={
                'uid': login['uid'],
                'rdkey': login['rdkey'],
                'club_id': CLUB_ID,
            }, headers=headers, timeout=5)
            if r.status_code != 404:
                print(f"  {url} -> {r.status_code}: {r.text[:200]}")
        except Exception as e:
            pass
        try:
            r = req.get(url, params={
                'uid': login['uid'],
                'rdkey': login['rdkey'],
                'club_id': CLUB_ID,
            }, headers=headers, timeout=5)
            if r.status_code != 404:
                print(f"  GET {url} -> {r.status_code}: {r.text[:200]}")
        except Exception as e:
            pass

client.close()
print("\n[Done]")
