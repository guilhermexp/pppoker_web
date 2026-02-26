#!/usr/bin/env python3
"""
Probe v2 para pb.GameDataREQ com contexto real (clube/liga/rooms/datas).

Objetivo:
- testar combinações mais prováveis de payload usando IDs reais (club, liga, room)
- capturar GameDataRSP e respostas correlatas
- salvar resumo estruturado em JSON para comparação rápida

Nao altera estado do clube; apenas leitura/probing.
"""

from __future__ import annotations

import argparse
import json
import os
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
    _first,
    _parse_proto_fields,
    build_message,
    encode_varint,
    http_login,
    parse_response,
)

NOISE_MSGS = {
    "pb.HeartBeatRSP",
    "pb.CallGameBRC",
    "pb.PushBRC",
    "pb.NoticeBRC",
    "pb.ClubInfoRSP",
    "pb.DiamondRSP",
}


def vfield(field_no: int, value: int) -> bytes:
    tag = (field_no << 3) | 0  # varint
    return encode_varint(tag) + encode_varint(value)


def build_varint_payload(pairs: list[tuple[int, int | None]]) -> bytes:
    out = bytearray()
    for field_no, value in pairs:
        if value is None:
            continue
        out += vfield(field_no, int(value))
    return bytes(out)


def beijing_like_day_values() -> dict[str, int]:
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    today0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    y0 = today0 - timedelta(days=1)
    w0 = today0 - timedelta(days=7)

    def ymd(dt: datetime) -> int:
        return int(dt.strftime("%Y%m%d"))

    return {
        "today_ts": int(today0.timestamp()),
        "yesterday_ts": int(y0.timestamp()),
        "week_ago_ts": int(w0.timestamp()),
        "today_ymd": ymd(today0),
        "yesterday_ymd": ymd(y0),
        "week_ago_ymd": ymd(w0),
        "range_days_1": 1,
        "range_days_7": 7,
        "range_days_30": 30,
    }


def decode_value(v: Any) -> Any:
    if isinstance(v, int):
        out: dict[str, Any] = {"type": "int", "value": v}
        if abs(v) > 100:
            out["div100"] = v / 100
        if 1700000000 < v < 2000000000:
            try:
                out["ts_local"] = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(v))
            except Exception:
                pass
        return out

    if isinstance(v, bytes):
        entry: dict[str, Any] = {"type": "bytes", "len": len(v)}
        if len(v) <= 200:
            try:
                entry["utf8"] = v.decode("utf-8")
            except Exception:
                pass
        try:
            sub = _parse_proto_fields(v)
            entry["sub_keys"] = sorted(sub.keys())
            sub_preview: dict[str, list[Any]] = {}
            for k in sorted(sub.keys())[:20]:
                vals = []
                for sv in sub[k][:5]:
                    if isinstance(sv, int):
                        vals.append(sv)
                    elif isinstance(sv, bytes):
                        vals.append({"bytes": len(sv)})
                    else:
                        vals.append(str(type(sv)))
                sub_preview[str(k)] = vals
            entry["sub_preview"] = sub_preview
        except Exception:
            pass
        return entry

    return {"type": type(v).__name__, "repr": repr(v)}


def parse_payload_fields(payload: bytes) -> dict[str, list[Any]]:
    fields = _parse_proto_fields(payload)
    out: dict[str, list[Any]] = {}
    for k in sorted(fields.keys()):
        out[str(k)] = [decode_value(v) for v in fields[k][:10]]
    return out


def drain_messages(client: PPPokerClient, timeout: float = 2.5) -> list[dict[str, Any]]:
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

    out: list[dict[str, Any]] = []
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf):
            break
        tlen = struct.unpack(">I", buf[pos : pos + 4])[0]
        if pos + 4 + tlen > len(buf):
            break
        frame = buf[pos : pos + 4 + tlen]
        pos += 4 + tlen
        parsed = parse_response(frame)
        msg = parsed.get("message")
        if msg in NOISE_MSGS:
            continue
        payload = parsed.get("payload", b"") or b""
        item = {
            "message": msg,
            "payload_len": len(payload),
        }
        if payload:
            try:
                item["fields"] = parse_payload_fields(payload)
            except Exception as e:
                item["parse_error"] = str(e)
        out.append(item)
    return out


def classify_rooms(rooms: list[dict[str, Any]]) -> dict[str, Any]:
    def gt(r: dict[str, Any]) -> str:
        return str(r.get("game_type") or "").lower()

    active = [r for r in rooms if r.get("is_running") or (r.get("current_players") or 0) > 0]
    spin = [r for r in rooms if "spin" in gt(r)]
    mtt = [r for r in rooms if "mtt" in gt(r) or "tournament" in gt(r) or "torneio" in gt(r)]
    nlh = [r for r in rooms if "nlh" in gt(r) or "hold" in gt(r)]

    def pick_id(cands: list[dict[str, Any]]) -> int | None:
        if not cands:
            return None
        cands = sorted(cands, key=lambda r: ((r.get("current_players") or 0), (r.get("start_ts") or 0)), reverse=True)
        return int(cands[0].get("room_id")) if cands[0].get("room_id") is not None else None

    return {
        "total": len(rooms),
        "active_total": len(active),
        "spin_total": len(spin),
        "mtt_total": len(mtt),
        "nlh_total": len(nlh),
        "room_id_any": pick_id(rooms),
        "room_id_active": pick_id(active),
        "room_id_spin": pick_id(spin),
        "room_id_mtt": pick_id(mtt),
        "room_id_nlh": pick_id(nlh),
    }


def send_probe(client: PPPokerClient, name: str, payload: bytes, sleep_s: float = 0.35) -> list[dict[str, Any]]:
    client.send(build_message("pb.GameDataREQ", payload))
    time.sleep(sleep_s)
    msgs = drain_messages(client, timeout=2.5)
    return msgs


def main() -> int:
    parser = argparse.ArgumentParser(description="Probe pb.GameDataREQ (v2)")
    parser.add_argument("--club", type=int, required=True)
    parser.add_argument("--liga", type=int, required=False)
    parser.add_argument("--username", default=os.getenv("PPPOKER_USERNAME"))
    parser.add_argument("--password", default=os.getenv("PPPOKER_PASSWORD"))
    parser.add_argument(
        "--out",
        default=str(BASE_DIR / "probe_game_data_v2_results.json"),
        help="Arquivo JSON de saída",
    )
    args = parser.parse_args()

    if not args.username or not args.password:
        print("username/password ausentes (use args ou env PPKOKER_*).", file=sys.stderr)
        return 2

    login = http_login(args.username, args.password)
    if not login.get("success"):
        print(json.dumps({"login_error": login}, ensure_ascii=False, indent=2))
        return 1

    client = PPPokerClient(login["uid"], login["rdkey"])
    if not client.connect(login.get("gserver_ip")):
        print("Falha ao conectar TCP", file=sys.stderr)
        return 1
    if not client.login():
        print("Falha no login TCP", file=sys.stderr)
        return 1

    client.enter_club(args.club)
    _ = drain_messages(client, timeout=1.0)

    rooms_result = client.list_club_rooms(args.club)
    rooms = rooms_result.get("rooms", []) if rooms_result.get("success") else []
    room_ctx = classify_rooms(rooms)

    d = beijing_like_day_values()
    liga_id = args.liga
    uid = int(login["uid"])

    payload_specs: list[tuple[str, list[tuple[int, int | None]]]] = [
        ("f1=club", [(1, args.club)]),
        ("f1=liga", [(1, liga_id)]),
        ("f1=room_any", [(1, room_ctx.get("room_id_any"))]),
        ("f1=room_active", [(1, room_ctx.get("room_id_active"))]),
        ("f1=club,f2=liga", [(1, args.club), (2, liga_id)]),
        ("f1=club,f2=uid", [(1, args.club), (2, uid)]),
        ("f1=club,f2=today_ymd", [(1, args.club), (2, d["today_ymd"])]),
        ("f1=club,f2=y0_ts", [(1, args.club), (2, d["yesterday_ts"])]),
        ("f1=club,f2=y0_ts,f3=t0_ts", [(1, args.club), (2, d["yesterday_ts"]), (3, d["today_ts"])]),
        ("f1=club,f2=w0_ts,f3=t0_ts", [(1, args.club), (2, d["week_ago_ts"]), (3, d["today_ts"])]),
        ("f1=club,f2=y0_ymd,f3=t0_ymd", [(1, args.club), (2, d["yesterday_ymd"]), (3, d["today_ymd"])]),
        ("f1=club,f2=w0_ymd,f3=t0_ymd", [(1, args.club), (2, d["week_ago_ymd"]), (3, d["today_ymd"])]),
        ("f1=club,f2=1,f3=y0_ymd,f4=t0_ymd", [(1, args.club), (2, 1), (3, d["yesterday_ymd"]), (4, d["today_ymd"])]),
        ("f1=club,f2=7,f3=t0_ymd", [(1, args.club), (2, 7), (3, d["today_ymd"])]),
        ("f1=club,f2=room_active", [(1, args.club), (2, room_ctx.get("room_id_active"))]),
        ("f1=club,f2=room_spin", [(1, args.club), (2, room_ctx.get("room_id_spin"))]),
        ("f1=club,f2=room_mtt", [(1, args.club), (2, room_ctx.get("room_id_mtt"))]),
        ("f1=club,f2=room_nlh", [(1, args.club), (2, room_ctx.get("room_id_nlh"))]),
        ("f1=club,f2=room_active,f3=y0_ts,f4=t0_ts", [(1, args.club), (2, room_ctx.get("room_id_active")), (3, d["yesterday_ts"]), (4, d["today_ts"])]),
        ("f1=club,f2=room_active,f3=y0_ymd,f4=t0_ymd", [(1, args.club), (2, room_ctx.get("room_id_active")), (3, d["yesterday_ymd"]), (4, d["today_ymd"])]),
        ("f1=club,f2=liga,f3=y0_ts,f4=t0_ts", [(1, args.club), (2, liga_id), (3, d["yesterday_ts"]), (4, d["today_ts"])]),
        ("f1=club,f2=liga,f3=y0_ymd,f4=t0_ymd", [(1, args.club), (2, liga_id), (3, d["yesterday_ymd"]), (4, d["today_ymd"])]),
        ("f1=liga,f2=club,f3=y0_ymd,f4=t0_ymd", [(1, liga_id), (2, args.club), (3, d["yesterday_ymd"]), (4, d["today_ymd"])]),
        ("f1=club,f2=liga,f3=room_active,f4=y0_ymd,f5=t0_ymd", [(1, args.club), (2, liga_id), (3, room_ctx.get("room_id_active")), (4, d["yesterday_ymd"]), (5, d["today_ymd"])]),
    ]

    results: list[dict[str, Any]] = []
    for label, pairs in payload_specs:
        payload = build_varint_payload(pairs)
        msgs = send_probe(client, label, payload)
        nonzero_game_rsp = False
        for m in msgs:
            if m.get("message") == "pb.GameDataRSP":
                fields = m.get("fields", {})
                for vals in fields.values():
                    for v in vals:
                        if isinstance(v, dict) and v.get("type") == "int" and v.get("value") not in (0, None):
                            if v.get("value") != 0:
                                nonzero_game_rsp = True
        results.append(
            {
                "label": label,
                "pairs": [{"field": f, "value": val} for f, val in pairs if val is not None],
                "payload_hex": payload.hex(),
                "messages": msgs,
                "has_game_data_rsp": any(m.get("message") == "pb.GameDataRSP" for m in msgs),
                "has_nonzero_game_data_rsp": nonzero_game_rsp,
            }
        )
        time.sleep(0.2)

    summary = {
        "club_id": args.club,
        "liga_id": liga_id,
        "login_uid": uid,
        "rooms_context": room_ctx,
        "tested": len(results),
        "with_game_data_rsp": sum(1 for r in results if r["has_game_data_rsp"]),
        "with_nonzero_game_data_rsp": sum(1 for r in results if r["has_nonzero_game_data_rsp"]),
        "timestamp": int(time.time()),
    }

    out = {
        "summary": summary,
        "results": results,
    }

    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))

    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"Saved: {args.out}")

    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
