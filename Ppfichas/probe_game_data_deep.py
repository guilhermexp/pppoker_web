#!/usr/bin/env python3
"""Deep probe of GameDataREQ / MemberGameDataREQ with many field combinations.

The previous probes returned all zeros. The app shows 372 games for "Ontem".
This probe tries every reasonable field combination to find the correct payload.
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from pppoker_direct_api import (
    PPPokerClient,
    _parse_proto_fields,
    build_message,
    encode_varint,
    get_local_rdkey,
    http_login,
    parse_response,
)

NOISE = {
    "pb.HeartBeatRSP",
    "pb.CallGameBRC",
    "pb.PushBRC",
    "pb.NoticeBRC",
    "pb.ClubInfoRSP",
    "pb.DiamondRSP",
}


def vf(k: int, v: int) -> bytes:
    return encode_varint((k << 3) | 0) + encode_varint(v)


def payload_varints(pairs: list[tuple[int, int | None]]) -> bytes:
    b = bytearray()
    for k, v in pairs:
        if v is None:
            continue
        b += vf(k, int(v))
    return bytes(b)


def drain(c: PPPokerClient, timeout=3.0):
    c.sock.settimeout(timeout)
    buf = b""
    try:
        while True:
            x = c.sock.recv(65536)
            if not x:
                break
            buf += x
    except Exception:
        pass
    out = []
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf):
            break
        tlen = struct.unpack(">I", buf[pos:pos + 4])[0]
        if pos + 4 + tlen > len(buf):
            break
        fr = buf[pos:pos + 4 + tlen]
        pos += 4 + tlen
        p = parse_response(fr)
        m = p.get("message")
        if m in NOISE:
            continue
        pay = p.get("payload", b"") or b""
        item = {"m": m, "len": len(pay)}
        if pay:
            ff = _parse_proto_fields(pay)
            decoded = {}
            for k in sorted(ff.keys()):
                vals = []
                for v in ff[k][:10]:
                    if isinstance(v, int):
                        d = {"v": v}
                        if v != 0:
                            d["div100"] = v / 100
                        if 1700000000 < v < 2000000000:
                            d["ts"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(v))
                        vals.append(d)
                    elif isinstance(v, bytes):
                        d = {"bytes": len(v)}
                        try:
                            sub = _parse_proto_fields(v)
                            d["sub_keys"] = sorted(sub.keys())
                            # Decode sub values
                            for sk in sorted(sub.keys())[:8]:
                                sv_list = []
                                for sv in sub[sk][:5]:
                                    if isinstance(sv, int):
                                        sv_list.append(sv)
                                    elif isinstance(sv, bytes):
                                        try:
                                            sv_list.append(sv.decode("utf-8"))
                                        except:
                                            sv_list.append(f"<{len(sv)}B>")
                                d[f"sub_f{sk}"] = sv_list
                        except:
                            pass
                        vals.append(d)
                decoded[str(k)] = vals
            item["f"] = decoded
        out.append(item)
    return out


def is_interesting(msgs):
    """Check if response has non-zero data fields."""
    for m in msgs:
        ff = m.get("f", {})
        for k, vals in ff.items():
            for v in vals:
                if isinstance(v, dict) and "v" in v:
                    val = v["v"]
                    if val != 0 and not (1700000000 < val < 2000000000):
                        return True
                if isinstance(v, dict) and "bytes" in v and v["bytes"] > 10:
                    return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, required=True)
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--uid", type=int)
    ap.add_argument("--rdkey")
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_game_data_deep_results.json"))
    args = ap.parse_args()

    if args.use_local_rdkey:
        login = get_local_rdkey()
    elif args.uid and args.rdkey:
        login = {"success": True, "uid": args.uid, "rdkey": args.rdkey}
    elif args.username and args.password:
        login = http_login(args.username, args.password)
    else:
        print("Need --use-local-rdkey or credentials")
        return 1

    if not login.get("success"):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1

    uid = int(login["uid"])

    # Date calculations (PPPoker uses UTC-5)
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    today_ymd = int(today.strftime("%Y%m%d"))
    yesterday_ymd = int(yesterday.strftime("%Y%m%d"))
    week_ago_ymd = int(week_ago.strftime("%Y%m%d"))
    today_ts = int(today.timestamp())
    yesterday_ts = int(yesterday.timestamp())

    print(f"Club: {args.club}, Liga: {args.liga}, UID: {uid}")
    print(f"Today: {today_ymd}, Yesterday: {yesterday_ymd}, Week ago: {week_ago_ymd}")
    print()

    # Message names to test
    msg_names = [
        "pb.GameDataREQ",
        "pb.MemberGameDataREQ",
        "pb.UserClubDataREQ",
    ]

    # Extended payload combinations to try
    # The key insight: maybe liga_id goes in field 1 (not club_id!)
    # Or maybe we need date in YMD format in specific fields
    payloads = [
        # Original: club in f1
        ("f1=club", [(1, args.club)]),
        # Liga in f1
        ("f1=liga", [(1, args.liga)]),
        # Liga in f1, club in f2
        ("f1=liga,f2=club", [(1, args.liga), (2, args.club)]),
        # Club f1, liga f2
        ("f1=club,f2=liga", [(1, args.club), (2, args.liga)]),
        # Club f1, liga f2, yesterday ymd f3
        ("f1=club,f2=liga,f3=y_ymd", [(1, args.club), (2, args.liga), (3, yesterday_ymd)]),
        # Club f1, liga f2, today ymd f3
        ("f1=club,f2=liga,f3=t_ymd", [(1, args.club), (2, args.liga), (3, today_ymd)]),
        # Club f1, liga f2, y_ymd f3, t_ymd f4
        ("f1=club,f2=liga,f3=y_ymd,f4=t_ymd", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, today_ymd)]),
        # Liga f1, y_ymd f2, t_ymd f3
        ("f1=liga,f2=y_ymd,f3=t_ymd", [(1, args.liga), (2, yesterday_ymd), (3, today_ymd)]),
        # Club f1, y_ymd f2, t_ymd f3
        ("f1=club,f2=y_ymd,f3=t_ymd", [(1, args.club), (2, yesterday_ymd), (3, today_ymd)]),
        # Liga in f1, club f2, dates f3+f4
        ("f1=liga,f2=club,f3=y_ymd,f4=t_ymd", [(1, args.liga), (2, args.club), (3, yesterday_ymd), (4, today_ymd)]),
        # With week range
        ("f1=club,f2=liga,f3=wk_ymd,f4=t_ymd", [(1, args.club), (2, args.liga), (3, week_ago_ymd), (4, today_ymd)]),
        ("f1=liga,f2=wk_ymd,f3=t_ymd", [(1, args.liga), (2, week_ago_ymd), (3, today_ymd)]),
        # uid in payload
        ("f1=club,f2=uid", [(1, args.club), (2, uid)]),
        ("f1=club,f2=uid,f3=liga", [(1, args.club), (2, uid), (3, args.liga)]),
        ("f1=liga,f2=uid", [(1, args.liga), (2, uid)]),
        ("f1=liga,f2=uid,f3=y_ymd,f4=t_ymd", [(1, args.liga), (2, uid), (3, yesterday_ymd), (4, today_ymd)]),
        # With game type filter (0=all, 1=NLH, 2=PLO, 3=MTT, 5=NLH cash, etc)
        ("f1=club,f2=liga,f3=0", [(1, args.club), (2, args.liga), (3, 0)]),
        ("f1=club,f2=liga,f3=y_ymd,f4=t_ymd,f5=0", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, today_ymd), (5, 0)]),
        # f8=liga (from ExportGameDataREQ pattern)
        ("f1=club,f4=uid,f8=liga,f12=y_ymd,f13=t_ymd,f15=609,f16=0", [
            (1, args.club), (4, uid), (8, args.liga),
            (12, yesterday_ymd), (13, today_ymd), (15, 609), (16, 0),
        ]),
        # Simpler export-like
        ("f1=club,f8=liga,f12=y_ymd,f13=t_ymd", [
            (1, args.club), (8, args.liga), (12, yesterday_ymd), (13, today_ymd),
        ]),
        # Try timestamp instead of ymd
        ("f1=club,f2=liga,f3=y_ts,f4=t_ts", [(1, args.club), (2, args.liga), (3, yesterday_ts), (4, today_ts)]),
        ("f1=liga,f2=y_ts,f3=t_ts", [(1, args.liga), (2, yesterday_ts), (3, today_ts)]),
        # Period code (0=today, 1=yesterday, 2=last7days)
        ("f1=club,f2=0(today)", [(1, args.club), (2, 0)]),
        ("f1=club,f2=1(yesterday)", [(1, args.club), (2, 1)]),
        ("f1=club,f2=2(week)", [(1, args.club), (2, 2)]),
        ("f1=liga,f2=0(today)", [(1, args.liga), (2, 0)]),
        ("f1=liga,f2=1(yesterday)", [(1, args.liga), (2, 1)]),
        ("f1=liga,f2=2(week)", [(1, args.liga), (2, 2)]),
        # Club + period code + liga
        ("f1=club,f2=1,f3=liga", [(1, args.club), (2, 1), (3, args.liga)]),
        ("f1=club,f2=liga,f3=1", [(1, args.club), (2, args.liga), (3, 1)]),
    ]

    results = []
    interesting = []

    c = PPPokerClient(uid, login["rdkey"])
    if not c.connect(login.get("gserver_ip")) or not c.login():
        print("TCP login failed")
        return 1
    c.enter_club(args.club)
    _ = drain(c, 1.0)

    total = len(msg_names) * len(payloads)
    idx = 0

    for msg_name in msg_names:
        for plabel, pairs in payloads:
            idx += 1
            payload = payload_varints(pairs)
            try:
                c.send(build_message(msg_name, payload))
            except Exception as e:
                results.append({
                    "req": msg_name, "label": plabel,
                    "error": str(e),
                })
                # Reconnect
                try: c.close()
                except: pass
                c = PPPokerClient(uid, login["rdkey"])
                if not c.connect(login.get("gserver_ip")) or not c.login():
                    print("Reconnect failed!")
                    break
                c.enter_club(args.club)
                _ = drain(c, 0.5)
                continue

            time.sleep(0.3)
            msgs = drain(c, 2.5)

            entry = {
                "req": msg_name,
                "label": plabel,
                "pairs": [(k, v) for k, v in pairs if v is not None],
                "hex": payload.hex(),
                "msgs": msgs,
            }
            results.append(entry)

            has_data = is_interesting(msgs)
            if has_data:
                interesting.append({
                    "req": msg_name,
                    "label": plabel,
                    "msgs": msgs,
                })
                print(f"*** HIT *** [{idx}/{total}] {msg_name} / {plabel}")
                for m in msgs:
                    print(f"  -> {m.get('m')} len={m.get('len')}")
                    for k, vs in (m.get('f') or {}).items():
                        print(f"     f{k}: {json.dumps(vs, default=str)[:150]}")
            else:
                rsp_names = [m.get("m") for m in msgs]
                if idx % 10 == 0:
                    print(f"  [{idx}/{total}] {msg_name} / {plabel} -> {rsp_names}")

            time.sleep(0.15)

    try:
        c.close()
    except:
        pass

    out_data = {
        "club": args.club,
        "liga": args.liga,
        "uid": uid,
        "today_ymd": today_ymd,
        "yesterday_ymd": yesterday_ymd,
        "tested": len(results),
        "interesting_count": len(interesting),
        "interesting": interesting,
        "results": results,
    }

    Path(args.out).write_text(json.dumps(out_data, ensure_ascii=False, indent=2, default=str))
    print(f"\n{'='*60}")
    print(f"Tested: {len(results)}, Interesting: {len(interesting)}")
    if interesting:
        print("\nINTERESTING RESULTS:")
        for i in interesting:
            print(f"  {i['req']} / {i['label']}")
    else:
        print("\nNo interesting results found :(")
    print(f"Saved: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
