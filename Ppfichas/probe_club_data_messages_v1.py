#!/usr/bin/env python3
"""Probe dirigido para mensagens de 'Dados no clube' descobertas nas strings do UnityCache.

Foco:
- pb.UserClubDataREQ
- pb.MemberGameDataREQ
- pb.GameDataREQ (baseline)
- mensagens correlatas de rakeback (opcional)

Nao altera estado; apenas leitura/probing.
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

CANDIDATE_REQS = [
    "pb.UserClubDataREQ",
    "pb.MemberGameDataREQ",
    "pb.GameDataREQ",
    "pb.FetchClubRakeRebateREQ",
    "pb.ClubAgentRakeBackFlowREQ",
]


def vtag(field_no: int) -> bytes:
    return encode_varint((field_no << 3) | 0)


def vfield(field_no: int, value: int) -> bytes:
    return vtag(field_no) + encode_varint(value)


def payload_varints(pairs: list[tuple[int, int | None]]) -> bytes:
    buf = bytearray()
    for k, v in pairs:
        if v is None:
            continue
        buf += vfield(k, int(v))
    return bytes(buf)


def ymd_range(days_back: int = 0, span_days: int = 0) -> dict[str, int]:
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    target = now - timedelta(days=days_back)
    d0 = target.replace(hour=0, minute=0, second=0, microsecond=0)
    start = d0 - timedelta(days=span_days)

    def ymd(dt: datetime) -> int:
        return int(dt.strftime("%Y%m%d"))

    return {
        "start_ymd": ymd(start),
        "end_ymd": ymd(d0),
        "start_ts": int(start.timestamp()),
        "end_ts": int(d0.timestamp()),
        "today_ymd": ymd(now.replace(hour=0, minute=0, second=0, microsecond=0)),
    }


def decode_val(v: Any) -> Any:
    if isinstance(v, int):
        info: dict[str, Any] = {"type": "int", "value": v}
        if abs(v) > 100:
            info["div100"] = v / 100
        if 1700000000 < v < 2000000000:
            info["ts"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(v))
        return info
    if isinstance(v, bytes):
        out: dict[str, Any] = {"type": "bytes", "len": len(v)}
        if len(v) <= 128:
            try:
                out["utf8"] = v.decode("utf-8")
            except Exception:
                pass
        try:
            sub = _parse_proto_fields(v)
            out["sub_keys"] = sorted(sub.keys())
            preview: dict[str, list[Any]] = {}
            for k in sorted(sub.keys())[:15]:
                vals = []
                for sv in sub[k][:5]:
                    if isinstance(sv, int):
                        vals.append(sv)
                    elif isinstance(sv, bytes):
                        vals.append({"bytes": len(sv)})
                preview[str(k)] = vals
            out["sub_preview"] = preview
        except Exception:
            pass
        return out
    return {"type": type(v).__name__, "repr": repr(v)}


def parse_fields(payload: bytes) -> dict[str, list[Any]]:
    ff = _parse_proto_fields(payload)
    out: dict[str, list[Any]] = {}
    for k in sorted(ff.keys()):
        out[str(k)] = [decode_val(v) for v in ff[k][:10]]
    return out


def drain(client: PPPokerClient, timeout=2.5) -> list[dict[str, Any]]:
    client.sock.settimeout(timeout)
    buf = b""
    try:
        while True:
            chunk = client.sock.recv(65536)
            if not chunk:
                break
            buf += chunk
    except Exception:
        pass

    items: list[dict[str, Any]] = []
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf):
            break
        tlen = struct.unpack(">I", buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf):
            break
        frame = buf[pos:pos+4+tlen]
        pos += 4 + tlen
        parsed = parse_response(frame)
        msg = parsed.get("message")
        if msg in NOISE:
            continue
        payload = parsed.get("payload", b"") or b""
        item = {"message": msg, "payload_len": len(payload)}
        if payload:
            try:
                item["fields"] = parse_fields(payload)
            except Exception as e:
                item["parse_error"] = str(e)
        items.append(item)
    return items


def score_message(msg: dict[str, Any]) -> dict[str, Any]:
    fields = msg.get("fields", {})
    nonzero_ints = []
    for k, vals in fields.items():
        for v in vals:
            if isinstance(v, dict) and v.get("type") == "int":
                val = v.get("value")
                if isinstance(val, int) and val != 0:
                    # ignore obvious timestamps for scoring
                    if not (1700000000 < val < 2000000000):
                        nonzero_ints.append({"field": k, "value": val})
    msg["nonzero_ints_excl_ts"] = nonzero_ints[:50]
    msg["interesting"] = len(nonzero_ints) > 0 or msg.get("payload_len", 0) > 30
    return msg


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--club", type=int, required=True)
    ap.add_argument("--liga", type=int, default=None)
    ap.add_argument("--username")
    ap.add_argument("--password")
    ap.add_argument("--uid", type=int)
    ap.add_argument("--rdkey")
    ap.add_argument("--use-local-rdkey", action="store_true")
    ap.add_argument("--out", default=str(BASE_DIR / "probe_club_data_messages_v1_results.json"))
    args = ap.parse_args()

    if args.uid and args.rdkey:
        login = {"success": True, "uid": args.uid, "rdkey": args.rdkey}
    elif args.use_local_rdkey:
        login = get_local_rdkey()
    else:
        if not args.username or not args.password:
            print("use --use-local-rdkey ou informe --username/--password")
            return 2
        login = http_login(args.username, args.password)
    if not login.get("success"):
        print(json.dumps({"login_error": login}, ensure_ascii=False, indent=2))
        return 1

    client = PPPokerClient(login["uid"], login["rdkey"])
    if not client.connect(login.get("gserver_ip")) or not client.login():
        print("tcp login failed")
        return 1
    client.enter_club(args.club)
    _ = drain(client, 1.0)

    day0 = ymd_range(days_back=0, span_days=0)
    day1 = ymd_range(days_back=1, span_days=0)
    last7 = ymd_range(days_back=0, span_days=7)

    payloads = [
        ("club", [(1, args.club)]),
        ("liga", [(1, args.liga)]),
        ("club+liga", [(1, args.club), (2, args.liga)]),
        ("club+y0_ymd..t0_ymd", [(1, args.club), (2, day1["start_ymd"]), (3, day0["end_ymd"])]),
        ("club+y0_ts..t0_ts", [(1, args.club), (2, day1["start_ts"]), (3, day0["end_ts"])]),
        ("club+last7_ymd", [(1, args.club), (2, last7["start_ymd"]), (3, last7["end_ymd"])]),
        ("club+last7_ts", [(1, args.club), (2, last7["start_ts"]), (3, last7["end_ts"])]),
        ("club+filter0+y0..t0", [(1, args.club), (2, 0), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
        ("club+filter1+y0..t0", [(1, args.club), (2, 1), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
        ("club+filter2+y0..t0", [(1, args.club), (2, 2), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
        ("club+filter7+y0..t0", [(1, args.club), (2, 7), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
        ("club+liga+y0..t0", [(1, args.club), (2, args.liga), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
        ("liga+club+y0..t0", [(1, args.liga), (2, args.club), (3, day1["start_ymd"]), (4, day0["end_ymd"])]),
    ]

    results: list[dict[str, Any]] = []
    for req_name in CANDIDATE_REQS:
        for label, pairs in payloads:
            payload = payload_varints(pairs)
            try:
                client.send(build_message(req_name, payload))
            except Exception as e:
                results.append({
                    "req": req_name,
                    "label": label,
                    "pairs": [{"field": k, "value": v} for k, v in pairs if v is not None],
                    "send_error": str(e),
                })
                continue
            time.sleep(0.35)
            msgs = [score_message(m) for m in drain(client, 2.0)]
            results.append({
                "req": req_name,
                "label": label,
                "pairs": [{"field": k, "value": v} for k, v in pairs if v is not None],
                "payload_hex": payload.hex(),
                "messages": msgs,
            })
            time.sleep(0.15)

    summary: dict[str, Any] = {
        "club": args.club,
        "liga": args.liga,
        "uid": login.get("uid"),
        "tested": len(results),
        "reqs": {},
        "interesting": [],
    }

    for r in results:
        req = r.get("req")
        entry = summary["reqs"].setdefault(req, {"responses": 0, "message_names": {}, "interesting": 0})
        msgs = r.get("messages", [])
        if msgs:
          entry["responses"] += 1
        for m in msgs:
            n = m.get("message")
            entry["message_names"][n] = entry["message_names"].get(n, 0) + 1
            if m.get("interesting"):
                entry["interesting"] += 1
                summary["interesting"].append({
                    "req": req,
                    "label": r.get("label"),
                    "rsp": n,
                    "payload_len": m.get("payload_len"),
                    "nonzero_ints_excl_ts": m.get("nonzero_ints_excl_ts", [])[:10],
                })

    Path(args.out).write_text(json.dumps({"summary": summary, "results": results}, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Saved: {args.out}")

    try:
        client.close()
    except Exception:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
