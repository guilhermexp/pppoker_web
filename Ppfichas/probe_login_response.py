#!/usr/bin/env python3
"""
Probe: Decodifica UserLoginRSP completo e HTTP login response
para descobrir se contém lista de clubes vinculados.
"""
import sys
import json
import time

sys.path.insert(0, '.')
from pppoker_direct_api import (
    http_login, parse_response,
    _parse_proto_fields, decode_varint, build_message,
    encode_varint, build_user_login_req
)

# =====================================================================
# 1. HTTP Login — ver TODOS os campos retornados
# =====================================================================

def probe_http_login(username: str, password: str):
    """Faz HTTP login e mostra a resposta JSON completa do servidor."""
    import requests
    import hashlib
    from pppoker_direct_api import crypto_password, xxtea_encode_for_http
    import urllib3
    urllib3.disable_warnings()

    pwd_crypto = crypto_password(password)
    pwd_encrypted, utc_timestamp = xxtea_encode_for_http(pwd_crypto)

    import random
    udid = hashlib.md5(f"pppoker_device_{random.randint(0, 999999)}".encode()).hexdigest()

    urls = [
        "https://api.pppoker.club/poker/api/login.php",
        "https://www.cozypoker.net/poker/api/login.php",
    ]

    data = {
        'type': '4',
        'region': '2',
        'username': username,
        'password': pwd_encrypted,
        't': str(utc_timestamp),
        'os': 'mac',
        'distributor': '0',
        'sub_distributor': '0',
        'country': 'BR',
        'appid': 'globle',
        'clientvar': '4.2.75',
        'imei': udid,
        'lang': 'pt',
        'languagecode': 'pt',
        'platform_type': '4',
        'app_type': '1',
        'app_build_code': '221',
    }

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'UnityPlayer/2021.3.33f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)',
    }

    for url in urls:
        try:
            resp = requests.post(url, data=data, headers=headers, timeout=30, verify=False)
            result = resp.json()
            print(f"\n{'='*60}")
            print(f"HTTP LOGIN RESPONSE (de {url})")
            print(f"{'='*60}")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            print(f"\nTOTAL DE CAMPOS: {len(result)}")
            print(f"CAMPOS: {list(result.keys())}")
            return result
        except Exception as e:
            print(f"Erro em {url}: {e}")
            continue
    return None


# =====================================================================
# 2. TCP Login — decodificar UserLoginRSP completo
# =====================================================================

def probe_tcp_login(uid: int, rdkey: str, server_ip: str, server_port: int = 4000):
    """Faz TCP login e decodifica o UserLoginRSP completo."""
    import socket
    import struct

    print(f"\n{'='*60}")
    print(f"TCP LOGIN — Conectando a {server_ip}:{server_port}")
    print(f"{'='*60}")

    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(10)

    try:
        sock.connect((server_ip, server_port))
        print(f"[+] Conectado!")
    except Exception as e:
        print(f"[-] Falha ao conectar: {e}")
        return

    # Send login
    login_req = build_user_login_req(uid, rdkey)
    sock.sendall(login_req)
    time.sleep(1)

    # Read ALL responses (pode vir múltiplas mensagens)
    responses = []
    for attempt in range(10):
        try:
            data = sock.recv(65536)
            if not data:
                break
            responses.append(data)
            time.sleep(0.3)
        except socket.timeout:
            break
        except Exception as e:
            print(f"    recv error: {e}")
            break

    print(f"\n[*] Recebidas {len(responses)} respostas")

    for i, raw in enumerate(responses):
        # Pode ter múltiplas mensagens concatenadas
        offset = 0
        msg_num = 0
        while offset < len(raw) - 4:
            try:
                total_len = struct.unpack('>I', raw[offset:offset+4])[0]
                msg_data = raw[offset:offset+4+total_len]
                parsed = parse_response(msg_data)
                msg_num += 1

                print(f"\n--- Resposta {i+1}.{msg_num}: {parsed['message']} ---")
                print(f"    Payload size: {len(parsed['payload'])} bytes")

                if parsed['message'] == 'pb.UserLoginRSP':
                    print(f"\n    >>> DECODIFICANDO UserLoginRSP <<<")
                    decode_login_rsp(parsed['payload'])
                elif parsed['payload']:
                    # Mostrar campos de qualquer mensagem
                    try:
                        fields = _parse_proto_fields(parsed['payload'])
                        for fn, vals in sorted(fields.items()):
                            for v in vals:
                                if isinstance(v, bytes):
                                    # Tentar decodificar sub-mensagem
                                    try:
                                        sub = _parse_proto_fields(v)
                                        if sub:
                                            print(f"    f{fn} = sub-msg: {dict((k, vs) for k,vs in sub.items())}")
                                            continue
                                    except:
                                        pass
                                    print(f"    f{fn} = bytes({len(v)}) {v[:50].hex()}")
                                else:
                                    print(f"    f{fn} = {v}")
                    except Exception as e:
                        print(f"    Parse error: {e}")

                offset += 4 + total_len
            except Exception as e:
                print(f"    Frame parse error at offset {offset}: {e}")
                break

    sock.close()


def decode_login_rsp(payload: bytes):
    """Decodifica todos os campos do UserLoginRSP."""
    fields = _parse_proto_fields(payload)

    print(f"    Total de campos de nível 1: {len(fields)}")

    for field_num in sorted(fields.keys()):
        vals = fields[field_num]
        for idx, val in enumerate(vals):
            prefix = f"    f{field_num}" if len(vals) == 1 else f"    f{field_num}[{idx}]"

            if isinstance(val, int):
                if val > 1700000000 and val < 2000000000:
                    print(f"{prefix} = {val} (timestamp: {time.strftime('%Y-%m-%d %H:%M', time.gmtime(val))})")
                else:
                    print(f"{prefix} = {val}")
            elif isinstance(val, str):
                if len(val) > 100:
                    print(f"{prefix} = str({len(val)}) '{val[:80]}...'")
                else:
                    print(f"{prefix} = '{val}'")
            elif isinstance(val, bytes):
                # Tentar decodificar como sub-mensagem
                try:
                    sub = _parse_proto_fields(val)
                    if sub and len(sub) > 0:
                        print(f"{prefix} = SUB-MSG ({len(val)} bytes):")
                        for sfn in sorted(sub.keys()):
                            for sv in sub[sfn]:
                                if isinstance(sv, bytes):
                                    try:
                                        sub2 = _parse_proto_fields(sv)
                                        if sub2 and len(sub2) > 0:
                                            print(f"      f{sfn} = SUB2-MSG ({len(sv)} bytes):")
                                            for s2fn in sorted(sub2.keys()):
                                                for s2v in sub2[s2fn]:
                                                    if isinstance(s2v, bytes):
                                                        print(f"        f{s2fn} = bytes({len(s2v)}) {s2v[:30].hex()}")
                                                    else:
                                                        print(f"        f{s2fn} = {s2v}")
                                            continue
                                    except:
                                        pass
                                    print(f"      f{sfn} = bytes({len(sv)}) {sv[:40].hex()}")
                                elif isinstance(sv, str):
                                    print(f"      f{sfn} = '{sv}'")
                                else:
                                    if sv > 1700000000 and sv < 2000000000:
                                        print(f"      f{sfn} = {sv} (ts: {time.strftime('%Y-%m-%d %H:%M', time.gmtime(sv))})")
                                    else:
                                        print(f"      f{sfn} = {sv}")
                    else:
                        print(f"{prefix} = bytes({len(val)}) {val[:50].hex()}")
                except:
                    print(f"{prefix} = bytes({len(val)}) {val[:50].hex()}")


# =====================================================================
# Main
# =====================================================================

if __name__ == '__main__':
    # Lê credenciais do environment ou usa as salvas
    import os

    username = os.environ.get('PPPOKER_USERNAME', '')
    password = os.environ.get('PPPOKER_PASSWORD', '')

    if not username or not password:
        # Tenta ler do .env do projeto web
        env_file = '/Users/macosx/Pppoker_web/.env'
        if os.path.exists(env_file):
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith('PPPOKER_USERNAME='):
                        username = line.split('=', 1)[1].strip().strip('"').strip("'")
                    elif line.startswith('PPPOKER_PASSWORD='):
                        password = line.split('=', 1)[1].strip().strip('"').strip("'")

    if not username or not password:
        print("Preciso das credenciais. Use:")
        print("  PPPOKER_USERNAME=xxx PPPOKER_PASSWORD=yyy python3 probe_login_response.py")
        sys.exit(1)

    print(f"[*] Usando username: {username}")

    # 1. HTTP Login
    http_result = probe_http_login(username, password)

    if http_result and http_result.get('code') == 0:
        uid = int(http_result['uid'])
        rdkey = http_result['rdkey']
        server_ip = http_result.get('gserver_ip', 'usbr-allentry.cozypoker.net')
        server_port = int(http_result.get('gserver_port', 4000))

        # 2. TCP Login
        probe_tcp_login(uid, rdkey, server_ip, server_port)
    else:
        print("\n[-] HTTP login falhou, não é possível fazer TCP login")
        if http_result:
            print(f"    code: {http_result.get('code')}")
