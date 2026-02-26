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


def vfield(k: int, v: int) -> bytes:
    return encode_varint((k << 3) | 0) + encode_varint(v)


def bfield(k: int, b: bytes) -> bytes:
    return encode_varint((k << 3) | 2) + encode_varint(len(b)) + b


def payload_varints(pairs: list[tuple[int, int | None]]) -> bytes:
    out = bytearray()
    for k, v in pairs:
        if v is None:
            continue
        out += vfield(k, int(v))
    return bytes(out)


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
            d["sub"] = {str(k): [decode(x) for x in sub[k][:6]] for k in sorted(sub.keys())[:12]}
        except Exception:
            pass
        return d
    return {"t": type(v).__name__}


def drain(c: PPPokerClient, timeout=1.8):
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
        tlen = struct.unpack(">I", buf[pos : pos + 4])[0]
        if pos + 4 + tlen > len(buf):
            break
        fr = buf[pos : pos + 4 + tlen]
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


def score(msgs):
    s = 0
    for m in msgs:
        name = m.get("m")
        if name == "pb.UserClubDataRSP":
            s += 2000
        if name == "pb.GameDataRSP":
            s += 200
        if name == "pb.MemberGameDataRSP":
            s += 100
        if name == "pb.UserLogoutRSP":
            s -= 600
        for vals in (m.get("f") or {}).values():
            for v in vals:
                if isinstance(v, dict) and v.get("t") == "i":
                    n = v.get("v")
                    if isinstance(n, int) and n != 0 and not (1700000000 < n < 2000000000):
                        s += 20
    return s


def make_login(args):
    if args.use_local_rdkey:
        return get_local_rdkey()
    if args.uid and args.rdkey:
        return {"success": True, "uid": args.uid, "rdkey": args.rdkey}
    if args.username and args.password:
        return http_login(args.username, args.password)
    return {"success": False, "error": "Provide --use-local-rdkey OR (--uid --rdkey) OR (--username --password)"}


def main():
    ap = argparse.ArgumentParser(description="Probe UserClubDataREQ with nested (wire-type 2) payloads")
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, default=None)
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--uid", type=int)
    ap.add_argument("--rdkey")
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_user_club_data_v5_nested_results.json"))
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

    # Inner payloads are based on accepted GameDataREQ top-level shapes.
    inners: list[tuple[str, bytes]] = []
    inner_pairs_list = [
        ("club", [(1, args.club)]),
        ("club,ymd", [(1, args.club), (2, d["today_ymd"])]),
        ("club,y0..t0", [(1, args.club), (2, d["yesterday_ymd"]), (3, d["today_ymd"])]),
        ("club,date,filter0", [(1, args.club), (2, d["today_ymd"]), (3, 0)]),
        ("club,date,filter1", [(1, args.club), (2, d["today_ymd"]), (3, 1)]),
        ("club,date,filter2", [(1, args.club), (2, d["today_ymd"]), (3, 2)]),
        ("club,date,room", [(1, args.club), (2, d["today_ymd"]), (3, room_any)]),
        ("export-ish all", [(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 609), (16, 0), (17, 0)]),
        ("export-ish cash", [(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 5), (16, 0), (17, 0)]),
        ("export-ish spin", [(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 10), (16, 0), (17, 0)]),
        ("export-ish ts+ymd", [(1, args.club), (2, d["today_ts"]), (3, d["today_end_ts"]), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, 609), (16, 0), (17, 0)]),
    ]
    for label, pairs in inner_pairs_list:
        inners.append((label, payload_varints(pairs)))

    wrappers: list[tuple[str, bytes]] = []
    for ilabel, inner in inners:
        wrappers.extend(
            [
                (f"top f1=<inner:{ilabel}>", bfield(1, inner)),
                (f"top f2=<inner:{ilabel}>", bfield(2, inner)),
                (f"top f3=<inner:{ilabel}>", bfield(3, inner)),
                (f"top f1=club + f2=<inner:{ilabel}>", payload_varints([(1, args.club)]) + bfield(2, inner)),
                (f"top f1=uid + f2=<inner:{ilabel}>", payload_varints([(1, uid)]) + bfield(2, inner)),
                (f"top f1=club + f3=<inner:{ilabel}>", payload_varints([(1, args.club)]) + bfield(3, inner)),
                (f"top f1=club,f2=uid + f3=<inner:{ilabel}>", payload_varints([(1, args.club), (2, uid)]) + bfield(3, inner)),
                (f"top f1=club,f4=uid + f2=<inner:{ilabel}>", payload_varints([(1, args.club), (4, uid)]) + bfield(2, inner)),
            ]
        )

    # A few fully nested guesses: top payload contains two submessages (query + filter)
    for ilabel, inner in inners[:6]:
        wrappers.extend(
            [
                (f"top f1=<inner>,f2=<inner> ({ilabel})", bfield(1, inner) + bfield(2, inner)),
                (f"top f2=<inner>,f3=<inner> ({ilabel})", bfield(2, inner) + bfield(3, inner)),
            ]
        )

    # Dedup payloads
    seen = set()
    payloads = []
    for label, p in wrappers:
        if p in seen:
            continue
        seen.add(p)
        payloads.append((label, p))

    reqs = ["pb.UserClubDataREQ", "pb.GameDataREQ"]
    total = len(payloads) * len(reqs)
    print(f"[*] Testing {len(payloads)} nested payloads x {len(reqs)} reqs = {total} attempts")

    results = []
    idx = 0
    for req in reqs:
        for label, payload in payloads:
            idx += 1
            c = connect_login(login)
            if c is None:
                results.append({"req": req, "label": label, "connect_error": True})
                continue
            c.enter_club(args.club)
            _ = drain(c, 0.4)
            try:
                c.send(build_message(req, payload))
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
                    "req": req,
                    "label": label,
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
        "tested": len(results),
        "top": [
            {
                "req": r["req"],
                "label": r["label"],
                "score": r["score"],
                "rsp": [m.get("m") for m in r.get("msgs", [])],
            }
            for r in res_sorted[:50]
        ],
    }
    Path(args.out).write_text(json.dumps({"summary": summary, "results": res_sorted}, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("Saved:", args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
