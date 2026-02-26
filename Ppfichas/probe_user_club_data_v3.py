#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, struct, sys, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
from pppoker_direct_api import PPPokerClient, _parse_proto_fields, build_message, encode_varint, get_local_rdkey, http_login, parse_response  # type: ignore

NOISE = {'pb.HeartBeatRSP','pb.CallGameBRC','pb.PushBRC','pb.NoticeBRC','pb.ClubInfoRSP','pb.DiamondRSP'}
REQS = ['pb.UserClubDataREQ','pb.MemberGameDataREQ','pb.GameDataREQ']

def vf(k,v): return encode_varint((k<<3)|0)+encode_varint(v)
def pl(pairs):
    b=bytearray()
    for k,v in pairs:
        if v is None: continue
        b += vf(k,int(v))
    return bytes(b)

def dayvals():
    tz=timezone(timedelta(hours=-5)); now=datetime.now(tz); t0=now.replace(hour=0,minute=0,second=0,microsecond=0); y0=t0-timedelta(days=1); w0=t0-timedelta(days=7)
    ymd=lambda d:int(d.strftime('%Y%m%d'))
    return {'t0_ymd':ymd(t0),'y0_ymd':ymd(y0),'w0_ymd':ymd(w0),'t0_ts':int(t0.timestamp()),'y0_ts':int(y0.timestamp()),'w0_ts':int(w0.timestamp())}

def decode(v: Any):
    if isinstance(v,int):
        d={'t':'i','v':v}
        if 1700000000 < v < 2000000000: d['ts']=time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(v))
        return d
    if isinstance(v,bytes):
        d={'t':'b','n':len(v)}
        try:
            sub=_parse_proto_fields(v); d['sub']=sorted(sub.keys())
        except Exception:
            pass
        return d
    return {'t':type(v).__name__}

def drain(c, timeout=1.5):
    c.sock.settimeout(timeout); buf=b''
    try:
        while True:
            x=c.sock.recv(65536)
            if not x: break
            buf += x
    except Exception:
        pass
    out=[]; pos=0
    while pos < len(buf):
        if pos+4>len(buf): break
        tlen=struct.unpack('>I', buf[pos:pos+4])[0]
        if pos+4+tlen>len(buf): break
        fr=buf[pos:pos+4+tlen]; pos += 4+tlen
        p=parse_response(fr); m=p.get('message')
        if m in NOISE: continue
        pay=p.get('payload',b'') or b''
        item={'m':m,'len':len(pay)}
        if pay:
            ff=_parse_proto_fields(pay)
            item['f']={str(k):[decode(v) for v in ff[k][:6]] for k in sorted(ff.keys())}
        out.append(item)
    return out

def score(msgs):
    s=0
    for m in msgs:
        name=m.get('m','')
        if name=='pb.UserClubDataRSP': s += 1000
        if name=='pb.MemberGameDataRSP': s += 300
        if name=='pb.GameDataRSP': s += 100
        if name=='pb.UserLogoutRSP': s -= 500
        for vals in (m.get('f') or {}).values():
            for v in vals:
                if isinstance(v,dict) and v.get('t')=='i':
                    n=v.get('v')
                    if isinstance(n,int) and n != 0 and not (1700000000 < n < 2000000000): s += 10
    return s

def connect_login(login):
    c=PPPokerClient(int(login['uid']), login['rdkey'])
    if not c.connect(login.get('gserver_ip')): return None
    if not c.login():
        try: c.close()
        except: pass
        return None
    return c

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--club', type=int, required=True)
    ap.add_argument('--liga', type=int, default=None)
    ap.add_argument('--username')
    ap.add_argument('--password')
    ap.add_argument('--uid', type=int)
    ap.add_argument('--rdkey')
    ap.add_argument('--use-local-rdkey', action='store_true')
    ap.add_argument('--out', default=str(BASE_DIR/'probe_user_club_data_v3_results.json'))
    args=ap.parse_args()

    if args.use_local_rdkey:
        login = get_local_rdkey()
    elif args.uid and args.rdkey:
        login = {'success': True, 'uid': args.uid, 'rdkey': args.rdkey}
    elif args.username and args.password:
        login = http_login(args.username, args.password)
    else:
        print('Provide --use-local-rdkey OR (--uid --rdkey) OR (--username --password)')
        return 2

    if not login.get('success'):
        print(json.dumps(login, ensure_ascii=False, indent=2))
        return 1
    d=dayvals(); uid=int(login['uid'])

    # discover room ids once
    c0=connect_login(login)
    if c0 is None: print('tcp auth failed'); return 1
    c0.enter_club(args.club)
    _=drain(c0,0.7)
    rooms_res=c0.list_club_rooms(args.club)
    rooms=rooms_res.get('rooms',[]) if isinstance(rooms_res,dict) else []
    room_ids=[int(r.get('room_id')) for r in rooms if r.get('room_id') is not None]
    room_any=room_ids[0] if room_ids else None
    room_active=next((int(r.get('room_id')) for r in rooms if (r.get('is_running') or (r.get('current_players') or 0)>0) and r.get('room_id') is not None), room_any)
    c0.close()

    templates=[
      ('club', [(1,args.club)]),
      ('uid', [(1,uid)]),
      ('liga', [(1,args.liga)]),
      ('club,uid', [(1,args.club),(2,uid)]),
      ('uid,club', [(1,uid),(2,args.club)]),
      ('club,liga', [(1,args.club),(2,args.liga)]),
      ('club,t0ymd', [(1,args.club),(2,d['t0_ymd'])]),
      ('club,y0..t0 ymd', [(1,args.club),(2,d['y0_ymd']),(3,d['t0_ymd'])]),
      ('club,y0..t0 ts', [(1,args.club),(2,d['y0_ts']),(3,d['t0_ts'])]),
      ('club,dt=1,t0', [(1,args.club),(2,1),(3,d['t0_ymd'])]),
      ('club,dt=2,t0', [(1,args.club),(2,2),(3,d['t0_ymd'])]),
      ('club,dt=3,t0', [(1,args.club),(2,3),(3,d['t0_ymd'])]),
      ('club,date,filter=0', [(1,args.club),(2,d['t0_ymd']),(3,0)]),
      ('club,date,filter=1', [(1,args.club),(2,d['t0_ymd']),(3,1)]),
      ('club,date,filter=2', [(1,args.club),(2,d['t0_ymd']),(3,2)]),
      ('club,date,filter=3', [(1,args.club),(2,d['t0_ymd']),(3,3)]),
      ('club,date,filter=4', [(1,args.club),(2,d['t0_ymd']),(3,4)]),
      ('club,date,filter=5', [(1,args.club),(2,d['t0_ymd']),(3,5)]),
      ('club,date,room', [(1,args.club),(2,d['t0_ymd']),(3,room_active)]),
      ('uid,club,date', [(1,uid),(2,args.club),(3,d['t0_ymd'])]),
      ('club,uid,date', [(1,args.club),(2,uid),(3,d['t0_ymd'])]),
      ('uid,club,y0..t0', [(1,uid),(2,args.club),(3,d['y0_ymd']),(4,d['t0_ymd'])]),
      ('club,uid,y0..t0', [(1,args.club),(2,uid),(3,d['y0_ymd']),(4,d['t0_ymd'])]),
      ('club,liga,y0..t0', [(1,args.club),(2,args.liga),(3,d['y0_ymd']),(4,d['t0_ymd'])]),
      ('liga,club,y0..t0', [(1,args.liga),(2,args.club),(3,d['y0_ymd']),(4,d['t0_ymd'])]),
    ]

    # also field-shift variants for likely (club, dateType, date)
    for dt in [0,1,2,3,7]:
        for fields in [(1,2,3),(1,3,2),(2,1,3),(2,3,1),(3,1,2)]:
            a,b,c=fields
            templates.append((f'shift club/dt/date fields={fields} dt={dt}', [(a,args.club),(b,dt),(c,d['t0_ymd'])]))

    results=[]
    for req in REQS:
        for label,pairs in templates:
            c=connect_login(login)
            if c is None:
                results.append({'req':req,'label':label,'connect_error':True});
                continue
            c.enter_club(args.club)
            _=drain(c,0.4)
            payload=pl(pairs)
            try:
                c.send(build_message(req,payload))
                time.sleep(0.35)
                msgs=drain(c,1.5)
            except Exception as e:
                msgs=[{'m':'<send_error>','err':str(e)}]
            try: c.close()
            except: pass
            results.append({'req':req,'label':label,'pairs':[{'f':k,'v':v} for k,v in pairs if v is not None],'payload_hex':payload.hex(),'msgs':msgs,'score':score(msgs)})

    res_sorted=sorted(results,key=lambda r:r.get('score',0), reverse=True)
    summary={'club':args.club,'liga':args.liga,'uid':uid,'tested':len(results),'top':[{'req':r['req'],'label':r['label'],'score':r['score'],'rsp':[m.get('m') for m in r.get('msgs',[])]} for r in res_sorted[:40]]}
    Path(args.out).write_text(json.dumps({'summary':summary,'results':res_sorted},ensure_ascii=False,indent=2))
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print('Saved:', args.out)
    return 0

if __name__=='__main__':
    raise SystemExit(main())
