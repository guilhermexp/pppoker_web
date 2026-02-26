#!/usr/bin/env python3
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

from pppoker_direct_api import (  # type: ignore
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


def payload_varints(pairs):
    b = bytearray()
    for k, v in pairs:
        if v is None:
            continue
        b += vf(k, int(v))
    return bytes(b)


def dayvals():
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    t0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    y0 = t0 - timedelta(days=1)
    return {
        "today_ymd": int(t0.strftime("%Y%m%d")),
        "yesterday_ymd": int(y0.strftime("%Y%m%d")),
        "today_ts": int(t0.timestamp()),
        "today_end_ts": int((t0 + timedelta(days=1) - timedelta(seconds=1)).timestamp()),
    }


def decode(v: Any):
    if isinstance(v, int):
        d = {"t": "i", "v": v}
        if 1700000000 < v < 2000000000:
            d["ts"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(v))
        return d
    if isinstance(v, bytes):
        d = {"t": "b", "n": len(v)}
        try:
            sub = _parse_proto_fields(v)
            d["sub"] = sorted(sub.keys())
        except Exception:
            pass
        return d
    return {"t": type(v).__name__}


def drain(c: PPPokerClient, timeout=1.6):
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
            item["f"] = {str(k): [decode(v) for v in ff[k][:6]] for k in sorted(ff.keys())}
        out.append(item)
    return out


def connect_login(login):
    c = PPPokerClient(int(login["uid"]), login["rdkey"])
    if not c.connect(login.get("gserver_ip")):
        return None
    if not c.login():
        try:
            c.close()
        except Exception:
            pass
        return None
    return c


def make_login(args):
    if args.use_local_rdkey:
        return get_local_rdkey()
    if args.uid and args.rdkey:
        return {"success": True, "uid": args.uid, "rdkey": args.rdkey}
    if args.username and args.password:
        return http_login(args.username, args.password)
    return {"success": False, "error": "Provide --use-local-rdkey OR (--uid --rdkey) OR (--username --password)"}


def score(msgs):
    s = 0
    for m in msgs:
        name = m.get("m", "")
        if name and name != "pb.UserLogoutRSP":
            s += 100
        if name == "pb.UserLogoutRSP":
            s -= 400
        for vals in (m.get("f") or {}).values():
            for v in vals:
                if isinstance(v, dict) and v.get("t") == "i":
                    n = v.get("v")
                    if isinstance(n, int) and n != 0 and not (1700000000 < n < 2000000000):
                        s += 15
    return s


def main():
    ap = argparse.ArgumentParser(description="Probe candidate dashboard-related protobuf message names")
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, default=None)
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--uid", type=int)
    ap.add_argument("--rdkey")
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_club_dashboard_names_v2_results.json"))
    args = ap.parse_args()

    login = make_login(args)
    if not login.get("success"):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1
    uid = int(login["uid"])
    d = dayvals()

    c0 = connect_login(login)
    if c0 is None:
        print("tcp auth failed")
        return 1
    c0.enter_club(args.club)
    _ = drain(c0, 0.6)
    rooms_res = c0.list_club_rooms(args.club)
    rooms = rooms_res.get("rooms", []) if isinstance(rooms_res, dict) else []
    room_ids = [int(r.get("room_id")) for r in rooms if r.get("room_id") is not None]
    room_any = room_ids[0] if room_ids else None
    c0.close()

    names = [
        # known / baseline
        "pb.GameDataREQ",
        "pb.MemberGameDataREQ",
        "pb.UserClubDataREQ",
        # likely panel / summary names
        "pb.ClubDataREQ",
        "pb.ClubDataStatisticsREQ",
        "pb.DataStatisticsREQ",
        "pb.GameDataStatisticsREQ",
        "pb.ClubGameDataStatisticsREQ",
        "pb.ShowDataStatisticsREQ",
        "pb.HistorySummaryREQ",
        "pb.ClubHistorySummaryREQ",
        "pb.GameHistorySummaryREQ",
        "pb.ClubGameHistoryREQ",
        "pb.GameHistoryREQ",
        # per-mode variants suggested by panel classes
        "pb.CashGameDataREQ",
        "pb.CashGameHistoryREQ",
        "pb.MttGameDataREQ",
        "pb.SngGameDataREQ",
        "pb.CrashGameDataREQ",
        "pb.FlashGameDataREQ",
        "pb.SpinGameDataREQ",
        "pb.SpinUpGameDataREQ",
        # club-prefixed variants
        "pb.ClubCashGameDataREQ",
        "pb.ClubMttGameDataREQ",
        "pb.ClubSngGameDataREQ",
        "pb.ClubCrashGameDataREQ",
        "pb.ClubFlashGameDataREQ",
        "pb.ClubSpinGameDataREQ",
        "pb.ClubSpinUpGameDataREQ",
        # member variants
        "pb.ClubMemberGameDataREQ",
        "pb.MemberClubDataREQ",
        "pb.UserGameDataREQ",
    ]

    payloads = [
        ("empty", b""),
        ("club", payload_varints([(1, args.club)])),
        ("club,date,filter0", payload_varints([(1, args.club), (2, d["today_ymd"]), (3, 0)])),
        ("club,date,filter1", payload_varints([(1, args.club), (2, d["today_ymd"]), (3, 1)])),
        ("club,y0..t0", payload_varints([(1, args.club), (2, d["yesterday_ymd"]), (3, d["today_ymd"])])),
        ("export-ish", payload_varints([(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 609), (16, 0), (17, 0)])),
        ("club+room+ymd", payload_varints([(1, args.club), (2, room_any), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 609)])),
    ]

    # Filter out names unknown to local message map (build_message will raise)
    buildable = []
    skipped = []
    for name in names:
        try:
            _ = build_message(name, b"")
            buildable.append(name)
        except Exception as e:
            skipped.append({"name": name, "error": str(e)})

    total = len(buildable) * len(payloads)
    print(f"[*] Buildable names: {len(buildable)} / {len(names)}")
    print(f"[*] Testing {len(buildable)} names x {len(payloads)} payloads = {total} attempts")

    results = []
    idx = 0
    for name in buildable:
        for plabel, payload in payloads:
            idx += 1
            c = connect_login(login)
            if c is None:
                results.append({"req": name, "payload_label": plabel, "connect_error": True})
                continue
            c.enter_club(args.club)
            _ = drain(c, 0.4)
            try:
                c.send(build_message(name, payload))
                time.sleep(0.35)
                msgs = drain(c, 1.6)
            except Exception as e:
                msgs = [{"m": "<send_error>", "err": str(e)}]
            try:
                c.close()
            except Exception:
                pass

            results.append(
                {
                    "req": name,
                    "payload_label": plabel,
                    "payload_hex": payload.hex(),
                    "msgs": msgs,
                    "score": score(msgs),
                }
            )
            if idx % 30 == 0:
                print(f"  ... {idx}/{total}")

    res_sorted = sorted(results, key=lambda r: r.get("score", 0), reverse=True)
    summary = {
        "club": args.club,
        "liga": args.liga,
        "uid": uid,
        "buildable": buildable,
        "skipped": skipped,
        "tested": len(results),
        "top": [
            {
                "req": r["req"],
                "payload": r["payload_label"],
                "score": r["score"],
                "rsp": [m.get("m") for m in r.get("msgs", [])],
            }
            for r in res_sorted[:60]
        ],
    }
    Path(args.out).write_text(json.dumps({"summary": summary, "results": res_sorted}, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("Saved:", args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
