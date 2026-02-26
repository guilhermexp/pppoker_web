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
REQS = ["pb.GameDataREQ", "pb.MemberGameDataREQ", "pb.UserClubDataREQ"]


def vf(k: int, v: int) -> bytes:
    return encode_varint((k << 3) | 0) + encode_varint(v)


def payload_varints(pairs: list[tuple[int, int | None]]) -> bytes:
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
    w0 = t0 - timedelta(days=7)
    return {
        "today_ymd": int(t0.strftime("%Y%m%d")),
        "yesterday_ymd": int(y0.strftime("%Y%m%d")),
        "week_ago_ymd": int(w0.strftime("%Y%m%d")),
        "today_ts": int(t0.timestamp()),
        "yesterday_ts": int(y0.timestamp()),
        "week_ago_ts": int(w0.timestamp()),
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
            item["f"] = {str(k): [decode(v) for v in ff[k][:8]] for k in sorted(ff.keys())}
        out.append(item)
    return out


def score(msgs):
    s = 0
    for m in msgs:
        name = m.get("m", "")
        if name == "pb.UserClubDataRSP":
            s += 1000
        if name == "pb.GameDataRSP":
            s += 200
        if name == "pb.MemberGameDataRSP":
            s += 120
        if name == "pb.UserLogoutRSP":
            s -= 500
        fields = m.get("f") or {}
        if name == "pb.GameDataRSP":
            # f9=-1 looks like invalid params
            f9 = fields.get("9") or []
            if any(isinstance(v, dict) and v.get("t") == "i" and v.get("v") == -1 for v in f9):
                s -= 250
        for vals in fields.values():
            for v in vals:
                if isinstance(v, dict) and v.get("t") == "i":
                    n = v.get("v")
                    if isinstance(n, int) and n != 0 and not (1700000000 < n < 2000000000):
                        s += 20
    return s


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


def main():
    ap = argparse.ArgumentParser(description="Probe GameData/UserClubData with export-like payload shapes")
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, default=None)
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--uid", type=int)
    ap.add_argument("--rdkey")
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_game_data_v4_exportshape_results.json"))
    args = ap.parse_args()

    login = make_login(args)
    if not login.get("success"):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1

    uid = int(login["uid"])
    d = dayvals()

    # Discover one room id (some requests may require it)
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

    # 609 came from ExportGameDataREQ = "all"
    game_types = [None, 609, 0, 1, 2, 3, 5, 6, 7, 10]
    date_modes = [None, 0, 1, 2, 3, 7]

    templates: list[tuple[str, list[tuple[int, int | None]]]] = []

    def add(label: str, pairs: list[tuple[int, int | None]]):
        templates.append((label, pairs))

    # Baselines (accepted in v3 when f1=club)
    add("base club", [(1, args.club)])
    add("club + liga(f2)", [(1, args.club), (2, args.liga)])
    add("club + uid(f2)", [(1, args.club), (2, uid)])
    add("club + ymds(f2,f3)", [(1, args.club), (2, d["yesterday_ymd"]), (3, d["today_ymd"])])

    # Export-like shapes using fields 12/13/15/16/17 (+ optional uid/liga/date ts fields)
    for gt in game_types:
        add(
            f"export-ish ymd12/13 gt={gt}",
            [(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
        )
        add(
            f"export-ish y0..t0 (12/13) gt={gt}",
            [(1, args.club), (4, uid), (8, args.liga), (12, d["yesterday_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
        )
        add(
            f"export-ish ts(2/3)+ymd(12/13) gt={gt}",
            [(1, args.club), (2, d["today_ts"]), (3, d["today_end_ts"]), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
        )
        add(
            f"club+ymd(f2,f3)+gt15={gt}",
            [(1, args.club), (2, d["today_ymd"]), (3, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
        )
        add(
            f"club+room(f2)+ymd12/13+gt15={gt}",
            [(1, args.club), (2, room_any), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
        )

    for dm in date_modes:
        for gt in [None, 609, 5, 10]:
            add(
                f"club dateMode(f2) date(f3) gt15={gt} dm={dm}",
                [(1, args.club), (2, dm), (3, d["today_ymd"]), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
            )
            add(
                f"club date(f2) dateMode(f3) gt15={gt} dm={dm}",
                [(1, args.club), (2, d["today_ymd"]), (3, dm), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0)],
            )

    # Try a few filter-like fields hinted by UI strings (f14/f15/f18/f19 guesses)
    for gt in [609, 5, 10]:
        for fk in [14, 18, 19]:
            for fv_ in [0, 1, 2, 3, 4, 5]:
                add(
                    f"club ymd12/13 gt15={gt} + f{fk}={fv_}",
                    [(1, args.club), (4, uid), (8, args.liga), (12, d["today_ymd"]), (13, d["today_ymd"]), (15, gt), (16, 0), (17, 0), (fk, fv_)],
                )

    # Deduplicate exact payloads
    seen = set()
    deduped = []
    for label, pairs in templates:
        payload = payload_varints(pairs)
        if payload in seen:
            continue
        seen.add(payload)
        deduped.append((label, pairs, payload))

    results = []
    total = len(deduped) * len(REQS)
    print(f"[*] Testing {len(deduped)} payloads x {len(REQS)} reqs = {total} attempts")

    idx = 0
    for req in REQS:
        for label, pairs, payload in deduped:
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
                    "pairs": [{"f": k, "v": v} for k, v in pairs if v is not None],
                    "payload_hex": payload.hex(),
                    "msgs": msgs,
                    "score": score(msgs),
                }
            )
            if idx % 40 == 0:
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
            for r in res_sorted[:40]
        ],
    }
    Path(args.out).write_text(json.dumps({"summary": summary, "results": res_sorted}, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print("Saved:", args.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
