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


def payload_varints(pairs: list[tuple[int, int | None]]) -> bytes:
    b = bytearray()
    for k, v in pairs:
        if v is None:
            continue
        b += vfield(k, int(v))
    return bytes(b)


def vals_now():
    tz = timezone(timedelta(hours=-5))
    now = datetime.now(tz)
    t0 = now.replace(hour=0, minute=0, second=0, microsecond=0)
    y0 = t0 - timedelta(days=1)
    w0 = t0 - timedelta(days=7)
    return {
        "today_ymd": int(t0.strftime('%Y%m%d')),
        "yesterday_ymd": int(y0.strftime('%Y%m%d')),
        "week_ago_ymd": int(w0.strftime('%Y%m%d')),
        "today_ts": int(t0.timestamp()),
        "yesterday_ts": int(y0.timestamp()),
        "week_ago_ts": int(w0.timestamp()),
    }


def decode_val(v: Any) -> Any:
    if isinstance(v, int):
        d = {"type": "int", "value": v}
        if 1700000000 < v < 2000000000:
            d["ts"] = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(v))
        return d
    if isinstance(v, bytes):
        d: dict[str, Any] = {"type": "bytes", "len": len(v)}
        if len(v) <= 120:
            try:
                d["utf8"] = v.decode('utf-8')
            except Exception:
                pass
        try:
            sub = _parse_proto_fields(v)
            d["sub_keys"] = sorted(sub.keys())
            d["sub_preview"] = {str(k): [sv if isinstance(sv, int) else {"bytes": len(sv)} for sv in sub[k][:5]] for k in sorted(sub.keys())[:20]}
        except Exception:
            pass
        return d
    return {"type": type(v).__name__}


def parse_fields(payload: bytes):
    ff = _parse_proto_fields(payload)
    return {str(k): [decode_val(v) for v in ff[k][:10]] for k in sorted(ff.keys())}


def drain(client: PPPokerClient, timeout=2.0):
    client.sock.settimeout(timeout)
    buf = b''
    try:
        while True:
            c = client.sock.recv(65536)
            if not c:
                break
            buf += c
    except Exception:
        pass
    msgs = []
    pos = 0
    while pos < len(buf):
        if pos + 4 > len(buf):
            break
        tlen = struct.unpack('>I', buf[pos:pos+4])[0]
        if pos + 4 + tlen > len(buf):
            break
        frame = buf[pos:pos+4+tlen]
        pos += 4 + tlen
        p = parse_response(frame)
        name = p.get('message')
        if name in NOISE:
            continue
        payload = p.get('payload', b'') or b''
        item = {"message": name, "payload_len": len(payload)}
        if payload:
            try:
                item["fields"] = parse_fields(payload)
            except Exception as e:
                item["parse_error"] = str(e)
        msgs.append(item)
    return msgs


def score(msgs):
    score = 0
    for m in msgs:
        if m.get('message') == 'pb.UserClubDataRSP':
            score += 100
        if m.get('message') and m.get('message') != 'pb.GameDataRSP':
            score += 10
        for vals in (m.get('fields') or {}).values():
            for v in vals:
                if isinstance(v, dict) and v.get('type') == 'int':
                    n = v.get('value')
                    if isinstance(n, int) and n not in (0,):
                        if not (1700000000 < n < 2000000000):
                            score += 3
    return score


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--club', type=int, required=True)
    ap.add_argument('--liga', type=int, default=None)
    ap.add_argument('--username')
    ap.add_argument('--password')
    ap.add_argument('--uid', type=int)
    ap.add_argument('--rdkey')
    ap.add_argument('--use-local-rdkey', action='store_true')
    ap.add_argument('--out', default=str(BASE_DIR / 'probe_user_club_data_v2_results.json'))
    args = ap.parse_args()

    if args.uid and args.rdkey:
        login = {'success': True, 'uid': args.uid, 'rdkey': args.rdkey}
    elif args.use_local_rdkey:
        login = get_local_rdkey()
    else:
        if not args.username or not args.password:
            print('use --use-local-rdkey ou informe --username/--password')
            return 2
        login = http_login(args.username, args.password)
    if not login.get('success'):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1
    uid = int(login['uid'])

    client = PPPokerClient(uid, login['rdkey'])
    if not client.connect(login.get('gserver_ip')) or not client.login():
        print('tcp auth failed')
        return 1
    client.enter_club(args.club)
    _ = drain(client, 1.0)

    rooms = client.list_club_rooms(args.club).get('rooms', [])
    room_ids = [int(r.get('room_id')) for r in rooms if r.get('room_id') is not None]
    room_any = room_ids[0] if room_ids else None
    room_small = min(room_ids) if room_ids else None
    room_big = max(room_ids) if room_ids else None

    d = vals_now()

    payloads: list[tuple[str, list[tuple[int, int | None]]]] = [
        ('empty', []),
        ('f1=club', [(1, args.club)]),
        ('f1=uid', [(1, uid)]),
        ('f1=liga', [(1, args.liga)]),
        ('f1=room_any', [(1, room_any)]),
        ('f1=club,f2=uid', [(1, args.club), (2, uid)]),
        ('f1=uid,f2=club', [(1, uid), (2, args.club)]),
        ('f1=club,f2=liga', [(1, args.club), (2, args.liga)]),
        ('f1=club,f2=today_ymd', [(1, args.club), (2, d['today_ymd'])]),
        ('f1=club,f2=y0_ymd,f3=t0_ymd', [(1, args.club), (2, d['yesterday_ymd']), (3, d['today_ymd'])]),
        ('f1=club,f2=y0_ts,f3=t0_ts', [(1, args.club), (2, d['yesterday_ts']), (3, d['today_ts'])]),
        ('f1=club,f2=dateType0,f3=today_ymd', [(1, args.club), (2, 0), (3, d['today_ymd'])]),
        ('f1=club,f2=dateType1,f3=today_ymd', [(1, args.club), (2, 1), (3, d['today_ymd'])]),
        ('f1=club,f2=dateType2,f3=today_ymd', [(1, args.club), (2, 2), (3, d['today_ymd'])]),
        ('f1=club,f2=dateType3,f3=today_ymd', [(1, args.club), (2, 3), (3, d['today_ymd'])]),
        ('f1=club,f2=today_ymd,f3=filter0', [(1, args.club), (2, d['today_ymd']), (3, 0)]),
        ('f1=club,f2=today_ymd,f3=filter1', [(1, args.club), (2, d['today_ymd']), (3, 1)]),
        ('f1=club,f2=today_ymd,f3=filter2', [(1, args.club), (2, d['today_ymd']), (3, 2)]),
        ('f1=club,f2=today_ymd,f3=filter7', [(1, args.club), (2, d['today_ymd']), (3, 7)]),
        ('f1=club,f2=today_ymd,f3=room_any', [(1, args.club), (2, d['today_ymd']), (3, room_any)]),
        ('f1=club,f2=today_ymd,f3=room_small', [(1, args.club), (2, d['today_ymd']), (3, room_small)]),
        ('f1=club,f2=today_ymd,f3=room_big', [(1, args.club), (2, d['today_ymd']), (3, room_big)]),
        ('f1=uid,f2=today_ymd,f3=club', [(1, uid), (2, d['today_ymd']), (3, args.club)]),
        ('f1=uid,f2=club,f3=today_ymd', [(1, uid), (2, args.club), (3, d['today_ymd'])]),
        ('f1=uid,f2=club,f3=y0_ymd,f4=t0_ymd', [(1, uid), (2, args.club), (3, d['yesterday_ymd']), (4, d['today_ymd'])]),
        ('f1=club,f2=uid,f3=y0_ymd,f4=t0_ymd', [(1, args.club), (2, uid), (3, d['yesterday_ymd']), (4, d['today_ymd'])]),
        ('f1=club,f2=uid,f3=dateType1,f4=today_ymd', [(1, args.club), (2, uid), (3, 1), (4, d['today_ymd'])]),
    ]

    results = []
    for label, pairs in payloads:
        payload = payload_varints(pairs)
        try:
            client.send(build_message('pb.UserClubDataREQ', payload))
        except Exception as e:
            results.append({"label": label, "pairs": [{"field": k, "value": v} for k, v in pairs if v is not None], "send_error": str(e)})
            continue
        time.sleep(0.4)
        msgs = drain(client, 2.2)
        results.append({
            "label": label,
            "pairs": [{"field": k, "value": v} for k, v in pairs if v is not None],
            "payload_hex": payload.hex(),
            "messages": msgs,
            "score": score(msgs),
        })
        time.sleep(0.15)

    results_sorted = sorted(results, key=lambda r: r.get('score', 0), reverse=True)
    summary = {
        "uid": uid,
        "club": args.club,
        "liga": args.liga,
        "tested": len(results),
        "responses": sum(1 for r in results if r.get('messages')),
        "userClubDataRsp": sum(1 for r in results for m in r.get('messages', []) if m.get('message') == 'pb.UserClubDataRSP'),
        "top": [
            {
                "label": r.get('label'),
                "score": r.get('score', 0),
                "rsp": [m.get('message') for m in r.get('messages', [])],
            }
            for r in results_sorted[:15]
        ],
    }

    out = {"summary": summary, "results": results_sorted}
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False, indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f'Saved: {args.out}')
    client.close()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
