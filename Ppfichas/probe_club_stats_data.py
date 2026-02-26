#!/usr/bin/env python3
"""Probe the newly discovered message names from IL2CPP metadata:
- pb.ClubStatsDataREQ → pb.ClubStatsDataRSP
- pb.ClubGetAgentDataREQ → pb.ClubGetAgentDataRSP
- pb.RoomHistoryREQ → pb.RoomHistoryRSP

These were found in the PPPoker Unity metadata but not previously tested.
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


def deep_decode(data: bytes, depth: int = 0, max_depth: int = 4) -> dict:
    """Recursively decode protobuf fields with nested sub-messages."""
    if depth >= max_depth:
        return {"raw_hex": data.hex()[:100]}

    ff = _parse_proto_fields(data)
    result = {}
    for k in sorted(ff.keys()):
        vals = []
        for v in ff[k][:20]:  # up to 20 repeated values
            if isinstance(v, int):
                d: dict[str, Any] = {"v": v}
                if v != 0:
                    d["div100"] = round(v / 100, 2)
                    d["div1000"] = round(v / 1000, 3)
                if 1700000000 < v < 2000000000:
                    d["ts"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(v))
                vals.append(d)
            elif isinstance(v, bytes):
                d = {"bytes": len(v)}
                try:
                    text = v.decode("utf-8")
                    if all(c.isprintable() or c in '\n\r\t' for c in text) and len(text) < 200:
                        d["text"] = text
                except (UnicodeDecodeError, ValueError):
                    pass
                # Try sub-message decode
                if len(v) >= 2:
                    try:
                        sub = deep_decode(v, depth + 1, max_depth)
                        if sub:
                            d["sub"] = sub
                    except Exception:
                        pass
                vals.append(d)
        result[str(k)] = vals
    return result


def drain(c: PPPokerClient, timeout=4.0):
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
            item["f"] = deep_decode(pay)
            item["hex"] = pay.hex()[:300]
        out.append(item)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, required=True)
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_club_stats_data_results.json"))
    args = ap.parse_args()

    if args.use_local_rdkey:
        login = get_local_rdkey()
    elif args.username and args.password:
        login = http_login(args.username, args.password)
    else:
        print("Need --use-local-rdkey or credentials")
        return 1

    if not login.get("success"):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1

    uid = int(login["uid"])

    # Dates in UTC-5 (PPPoker timezone)
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = today - timedelta(days=1)
    week_ago = today - timedelta(days=7)

    today_ymd = int(today.strftime("%Y%m%d"))
    yesterday_ymd = int(yesterday.strftime("%Y%m%d"))
    week_ago_ymd = int(week_ago.strftime("%Y%m%d"))

    print(f"Club: {args.club}, Liga: {args.liga}, UID: {uid}")
    print(f"Today (UTC-5): {today_ymd}, Yesterday: {yesterday_ymd}")

    # Messages to test
    msg_names = [
        "pb.ClubStatsDataREQ",
        "pb.ClubGetAgentDataREQ",
        "pb.RoomHistoryREQ",
    ]

    # Extensive payload combinations
    payloads = [
        # Basic
        ("empty", []),
        ("f1=club", [(1, args.club)]),
        ("f1=liga", [(1, args.liga)]),
        # Club + liga
        ("f1=club,f2=liga", [(1, args.club), (2, args.liga)]),
        ("f1=liga,f2=club", [(1, args.liga), (2, args.club)]),
        # With dates (yesterday = the day with 427 games in screenshot)
        ("f1=club,f2=yesterday", [(1, args.club), (2, yesterday_ymd)]),
        ("f1=club,f2=yesterday,f3=yesterday", [(1, args.club), (2, yesterday_ymd), (3, yesterday_ymd)]),
        ("f1=club,f2=yesterday,f3=today", [(1, args.club), (2, yesterday_ymd), (3, today_ymd)]),
        ("f1=liga,f2=yesterday,f3=yesterday", [(1, args.liga), (2, yesterday_ymd), (3, yesterday_ymd)]),
        ("f1=liga,f2=yesterday,f3=today", [(1, args.liga), (2, yesterday_ymd), (3, today_ymd)]),
        # Club + liga + dates
        ("f1=club,f2=liga,f3=yesterday,f4=yesterday", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, yesterday_ymd)]),
        ("f1=club,f2=liga,f3=yesterday,f4=today", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, today_ymd)]),
        ("f1=liga,f2=club,f3=yesterday,f4=yesterday", [(1, args.liga), (2, args.club), (3, yesterday_ymd), (4, yesterday_ymd)]),
        # With uid
        ("f1=club,f2=uid", [(1, args.club), (2, uid)]),
        ("f1=liga,f2=uid", [(1, args.liga), (2, uid)]),
        ("f1=club,f2=liga,f3=uid", [(1, args.club), (2, args.liga), (3, uid)]),
        # Period codes
        ("f1=club,f2=0", [(1, args.club), (2, 0)]),
        ("f1=club,f2=1", [(1, args.club), (2, 1)]),
        ("f1=club,f2=2", [(1, args.club), (2, 2)]),
        ("f1=liga,f2=0", [(1, args.liga), (2, 0)]),
        ("f1=liga,f2=1", [(1, args.liga), (2, 1)]),
        ("f1=liga,f2=2", [(1, args.liga), (2, 2)]),
        # Week range
        ("f1=club,f2=liga,f3=wk,f4=today", [(1, args.club), (2, args.liga), (3, week_ago_ymd), (4, today_ymd)]),
        ("f1=liga,f2=wk,f3=today", [(1, args.liga), (2, week_ago_ymd), (3, today_ymd)]),
        # Extra fields
        ("f1=club,f2=liga,f3=yesterday,f4=yesterday,f5=0", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, yesterday_ymd), (5, 0)]),
        ("f1=club,f2=liga,f3=yesterday,f4=yesterday,f5=1", [(1, args.club), (2, args.liga), (3, yesterday_ymd), (4, yesterday_ymd), (5, 1)]),
    ]

    c = PPPokerClient(uid, login["rdkey"])
    if not c.connect(login.get("gserver_ip")) or not c.login():
        print("TCP login failed")
        return 1
    c.enter_club(args.club)
    _ = drain(c, 1.0)

    results = []
    interesting = []
    total = len(msg_names) * len(payloads)
    idx = 0

    for msg_name in msg_names:
        for plabel, pairs in payloads:
            idx += 1
            payload = payload_varints(pairs)
            try:
                c.send(build_message(msg_name, payload))
            except Exception as e:
                results.append({"req": msg_name, "label": plabel, "error": str(e)})
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

            time.sleep(0.35)
            msgs = drain(c, 3.0)

            entry = {
                "req": msg_name,
                "label": plabel,
                "pairs": [(k, v) for k, v in pairs],
                "hex": payload.hex(),
                "msgs": msgs,
            }
            results.append(entry)

            # Check if interesting (has non-zero data or large payloads)
            has_data = False
            for m in msgs:
                if m.get("len", 0) > 20:
                    has_data = True
                ff = m.get("f", {})
                for k, vals in ff.items():
                    for v in vals:
                        if isinstance(v, dict):
                            val = v.get("v")
                            if isinstance(val, int) and val != 0 and not (1700000000 < val < 2000000000):
                                has_data = True
                            if v.get("bytes", 0) > 10:
                                has_data = True

            if has_data:
                interesting.append(entry)
                print(f"\n*** HIT *** [{idx}/{total}] {msg_name} / {plabel}")
                for m in msgs:
                    print(f"  -> {m.get('m')} len={m.get('len')}")
                    ff = m.get("f", {})
                    for k, vals in sorted(ff.items(), key=lambda x: int(x[0])):
                        print(f"     f{k}: {json.dumps(vals, default=str)[:200]}")
                print()
            else:
                rsp_names = [m.get("m") for m in msgs]
                if idx % 10 == 0 or any(rsp_names):
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
        "dates": {"today": today_ymd, "yesterday": yesterday_ymd, "week_ago": week_ago_ymd},
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
    print(f"Saved: {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
