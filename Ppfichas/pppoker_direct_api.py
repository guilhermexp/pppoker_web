#!/usr/bin/env python3
"""
PPPoker Direct API Client
Reverse engineered protocol for chip transfers

Usage:
    # Transfer chips
    python pppoker_direct_api.py transfer --uid 8980655 --rdkey YOUR_RDKEY --target 4210947 --amount 100

    # Get rdkey (capture from app or use HTTP login)
    The rdkey can be obtained by:
    1. Capturing traffic from PPPoker app (tcpdump)
    2. HTTP login endpoint (requires password)
"""

import socket
import struct
import time
import argparse
import sys
import hashlib
import base64
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    requests = None  # HTTP login won't work without requests


# ============================================================
# XXTEA encryption (standard Corrected Block TEA)
# Matches PP.Basic.XXTEA from PP.Production.Basic.dll
# ============================================================

def _xxtea_mx(z, y, s, p, e, k):
    return (((z >> 5) ^ (y << 2)) + ((y >> 3) ^ (z << 4))) ^ ((s ^ y) + (k[(p & 3) ^ e] ^ z))

def xxtea_encrypt_uint32(v, key):
    """Core XXTEA encrypt on uint32 arrays"""
    n = len(v) - 1
    if n < 1:
        return v
    DELTA = 0x9E3779B9
    q = 6 + 52 // (n + 1)
    z = v[n]
    s = 0
    for _ in range(q):
        s = (s + DELTA) & 0xFFFFFFFF
        e = (s >> 2) & 3
        for p in range(n):
            y = v[p + 1]
            mx = _xxtea_mx(z, y, s, p, e, key) & 0xFFFFFFFF
            v[p] = (v[p] + mx) & 0xFFFFFFFF
            z = v[p]
        p = n
        y = v[0]
        mx = _xxtea_mx(z, y, s, p, e, key) & 0xFFFFFFFF
        v[p] = (v[p] + mx) & 0xFFFFFFFF
        z = v[p]
    return v

def xxtea_to_uint32_array(data_bytes, include_length):
    """Convert bytes to uint32 array, optionally appending original length"""
    n = len(data_bytes)
    count = (n >> 2) + (1 if n & 3 else 0)
    if include_length:
        result = [0] * (count + 1)
        result[count] = n
    else:
        result = [0] * count
    # Copy bytes into uint32 array (little-endian)
    padded = data_bytes + b'\x00' * (count * 4 - n)
    for i in range(count):
        result[i] = struct.unpack_from('<I', padded, i * 4)[0]
    return result

def xxtea_to_byte_array(uint32_array, include_length):
    """Convert uint32 array back to bytes"""
    n = len(uint32_array) << 2
    if include_length:
        m = uint32_array[-1]
        n -= 4
        if m < n - 3 or m > n:
            return None
        n = m
    result = b''
    for v in uint32_array:
        result += struct.pack('<I', v)
    return result[:n]

def xxtea_fix_key(key_bytes):
    """Pad/truncate key to exactly 16 bytes (4 uint32s)"""
    if len(key_bytes) < 16:
        key_bytes = key_bytes + b'\x00' * (16 - len(key_bytes))
    key_bytes = key_bytes[:16]
    return list(struct.unpack('<4I', key_bytes))

def xxtea_encrypt(data_str, key_str):
    """XXTEA encrypt: string data + string key -> bytes (matches PP.Basic.XXTEA.Encrypt)"""
    data_bytes = data_str.encode('utf-8')
    key_bytes = key_str.encode('utf-8')
    v = xxtea_to_uint32_array(data_bytes, include_length=True)
    k = xxtea_fix_key(key_bytes)
    encrypted = xxtea_encrypt_uint32(v, k)
    return xxtea_to_byte_array(encrypted, include_length=False)

def crypto_password(password):
    """CryptoUtil.CryptoPassword: MD5(MD5(password)) lowercase"""
    md5_1 = hashlib.md5(password.encode()).hexdigest()
    return hashlib.md5(md5_1.encode()).hexdigest()

def get_http_crypto_key(utc_timestamp=None):
    """Generate time-based XXTEA key using Beijing time (UTC+8)"""
    if utc_timestamp is None:
        utc_now = datetime.now(timezone.utc)
    else:
        utc_now = datetime.fromtimestamp(utc_timestamp, tz=timezone.utc)
    beijing = utc_now.astimezone(timezone(timedelta(hours=8)))
    suffix = "d5659066d5"  # production suffix
    return f"{beijing.month:02d}{beijing.day:02d}{beijing.hour:02d}{beijing.minute:02d}{beijing.second:02d}{suffix}"

def xxtea_encode_for_http(plaintext):
    """CryptoUtil._XXTeaEncodeForHttp: returns (base64_encrypted, utc_timestamp)"""
    utc_now = int(time.time())
    key = get_http_crypto_key(utc_now)
    encrypted = xxtea_encrypt(plaintext, key)
    return base64.b64encode(encrypted).decode(), utc_now


def get_local_rdkey() -> dict:
    """
    Get rdkey from local PPPoker app preferences (no network needed).

    PPPoker stores login credentials in the app container plist:
    - LoginTypeItemData.Password = server-assigned session token
    - This token is used directly as rdkey for TCP login
    - It persists across app restarts and doesn't expire on its own

    This method does NOT require the PPPoker app to be running.
    """
    import subprocess
    import json
    import os
    import glob as glob_mod
    import plistlib

    # Method 1 (PRIMARY): App Container plist - LoginTypeItemData
    containers = os.path.expanduser("~/Library/Containers/")
    if os.path.isdir(containers):
        pattern = os.path.join(containers, "*/Data/Library/Preferences/com.lein.pppokergame*.plist")
        for plist_path in glob_mod.glob(pattern):
            try:
                with open(plist_path, 'rb') as f:
                    plist = plistlib.load(f)

                # Read LoginTypeItemData - contains the real session token
                ltid_str = plist.get('PP.PPPoker.Login.LoginTypeItemData')
                if ltid_str:
                    ltid = json.loads(ltid_str)
                    login_dict = ltid.get('_loginTypeDict', {})
                    for login_name, login_info in login_dict.items():
                        uid = login_info.get('Uid')
                        rdkey = login_info.get('Password')  # Password field IS the rdkey
                        if uid and rdkey and len(rdkey) == 32:
                            print(f"[+] rdkey encontrado (LoginTypeItemData/{login_name})")
                            return {'success': True, 'uid': int(uid), 'rdkey': rdkey, 'source': 'plist_login_type'}
            except Exception as e:
                continue

    # Method 2 (FALLBACK): Group Container shared plist
    group_plist = os.path.expanduser(
        "~/Library/Group Containers/group.com.kiwigame.loginwithpppoker/"
        "Library/Preferences/group.com.kiwigame.loginwithpppoker.plist"
    )
    if os.path.exists(group_plist):
        try:
            with open(group_plist, 'rb') as f:
                plist = plistlib.load(f)
            login_data = plist.get('pplogindata')
            if isinstance(login_data, str):
                login_data = json.loads(login_data)
            uid = login_data.get('uid')
            rdkey = login_data.get('rdkey')
            if uid and rdkey:
                print(f"[!] rdkey do Group Container (pode não funcionar - use LoginTypeItemData)")
                return {'success': True, 'uid': int(uid), 'rdkey': rdkey, 'source': 'group_plist'}
        except Exception as e:
            print(f"[-] Erro lendo Group Container: {e}")

    return {'success': False, 'error': 'Nenhum rdkey local encontrado. PPPoker já fez login neste Mac?'}


def refresh_rdkey() -> dict:
    """
    Refresh rdkey by restarting PPPoker and capturing TCP login traffic.
    Requires sudo access for tcpdump.
    """
    import subprocess
    import time as _time
    import re as _re

    PCAP_FILE = '/tmp/pppoker_capture.pcap'
    IGNORE_HASHES = {'4181b6e840d2766873be4c015db0d67e', '00000000000000000000000000000000'}

    # Find active network interface
    try:
        result = subprocess.run(['route', 'get', 'default'], capture_output=True, text=True)
        iface = 'en1'  # default
        for line in result.stdout.splitlines():
            if 'interface' in line:
                iface = line.split(':')[1].strip()
                break
    except Exception:
        iface = 'en1'

    print(f'[1/5] Fechando PPPoker...')
    subprocess.run(['pkill', '-x', 'PPPoker'], capture_output=True)
    _time.sleep(2)

    # Kill any existing tcpdump
    subprocess.run(['sudo', 'pkill', '-f', 'tcpdump'], capture_output=True)
    _time.sleep(0.5)

    print(f'[2/5] Iniciando captura na interface {iface}...')
    tcpdump_proc = subprocess.Popen(
        ['sudo', 'tcpdump', '-i', iface, '-c', '500', '-w', PCAP_FILE,
         'host 47.254.71.136 or host 47.89.212.243 or host 47.254.69.45 or port 4000'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE
    )
    _time.sleep(1)

    print('[3/5] Abrindo PPPoker...')
    subprocess.run(['open', '-a', 'PPPoker'], capture_output=True)

    print('[4/5] Aguardando login (20s)...')
    _time.sleep(20)

    print('[5/5] Parando captura e extraindo rdkey...')
    subprocess.run(['sudo', 'pkill', '-f', 'tcpdump'], capture_output=True)
    _time.sleep(1)

    try:
        with open(PCAP_FILE, 'rb') as f:
            data = f.read()

        text = data.decode('latin-1', errors='ignore')

        if 'UserLoginREQ' in text:
            pos = text.find('UserLoginREQ')
            chunk = text[pos:pos+300]
            matches = _re.findall(r'[a-f0-9]{32}', chunk)
            for m in matches:
                if m not in IGNORE_HASHES:
                    print(f'[+] RDKEY capturado: {m[:8]}...{m[-8:]}')
                    return {'success': True, 'uid': 13352472, 'rdkey': m, 'source': 'tcpdump'}

        # Fallback: search all hashes in pcap
        all_hashes = set(_re.findall(r'[a-f0-9]{32}', text)) - IGNORE_HASHES
        if all_hashes:
            rdkey = list(all_hashes)[0]
            print(f'[+] RDKEY (fallback): {rdkey[:8]}...{rdkey[-8:]}')
            return {'success': True, 'uid': 13352472, 'rdkey': rdkey, 'source': 'tcpdump_fallback'}

    except FileNotFoundError:
        print('[-] Pcap file not found - tcpdump may have failed')
    except Exception as e:
        print(f'[-] Erro extraindo rdkey: {e}')

    return {'success': False, 'error': 'Falha ao capturar rdkey via tcpdump'}


def encode_varint(value):
    """Encode integer as protobuf varint (supports negative via 2's complement 64-bit)"""
    if value < 0:
        value = value + (1 << 64)  # Convert to unsigned 64-bit
    parts = []
    while value > 127:
        parts.append((value & 0x7F) | 0x80)
        value >>= 7
    parts.append(value)
    return bytes(parts)


def decode_varint(data, offset=0):
    """Decode protobuf varint from bytes"""
    result = 0
    shift = 0
    while True:
        byte = data[offset]
        result |= (byte & 0x7F) << shift
        offset += 1
        if (byte & 0x80) == 0:
            break
        shift += 7
    return result, offset


def build_message(msg_name: str, payload: bytes) -> bytes:
    """Build a PPPoker TCP message"""
    msg_name_bytes = msg_name.encode('utf-8')
    padding = b'\x00\x00\x00\x00'
    content = struct.pack('>H', len(msg_name_bytes)) + msg_name_bytes + padding + payload
    return struct.pack('>I', len(content)) + content


def parse_response(data: bytes) -> dict:
    """Parse PPPoker response message"""
    if len(data) < 6:
        return {'error': 'Data too short', 'raw': data.hex()}

    total_len = struct.unpack('>I', data[0:4])[0]
    name_len = struct.unpack('>H', data[4:6])[0]
    msg_name = data[6:6+name_len].decode('utf-8')
    payload_start = 6 + name_len + 4
    payload = data[payload_start:4+total_len]

    return {
        'message': msg_name,
        'payload': payload,
        'payload_hex': payload.hex() if payload else ''
    }


def build_user_login_req(uid: int, rdkey: str) -> bytes:
    """Build pb.UserLoginREQ message"""
    payload = b''
    payload += bytes([0x08]) + encode_varint(uid)
    rdkey_bytes = rdkey.encode('utf-8')
    payload += bytes([0x12]) + encode_varint(len(rdkey_bytes)) + rdkey_bytes
    payload += b'\x1a\x064.2.56'
    payload += b'\x22\x0e192.168.31.107'
    payload += b'\x30\x00'
    payload += b'\x3a\x03ios'
    payload += b'\x40\x00'
    server = 'usbr-allentry.cozypoker.net:4000'
    payload += bytes([0x4a]) + encode_varint(len(server)) + server.encode()
    payload += b'\x52\x06Brazil'
    return build_message('pb.UserLoginREQ', payload)


def build_heartbeat_req() -> bytes:
    """Build pb.HeartBeatREQ message"""
    return build_message('pb.HeartBeatREQ', b'')


def http_login(username: str, password: str, verify_code: str = None) -> dict:
    """
    Login via HTTP API to get fresh rdkey.
    Implements the full PPPoker login protocol:
      1. CryptoPassword(password) = MD5(MD5(password))
      2. XXTeaEncodeForHttp(cryptoPassword) = Base64(XXTEA(data, timeKey))
      3. POST to login.php with encrypted password + timestamp

    Args:
        username: Email or phone number
        password: Account password
        verify_code: Optional email verification code (for accounts requiring 2FA)
                     When code -15 is returned, check email and pass code here.

    Returns:
        dict with uid, rdkey, gserver_ip, gserver_port on success
        On code=-15: returns {'success': False, 'needs_verify': True, 'secret_mail': '...'}
    """
    # Step 1: Double MD5 (CryptoPassword)
    pwd_crypto = crypto_password(password)

    # Step 2: XXTEA encrypt with time-based key
    pwd_encrypted, utc_timestamp = xxtea_encode_for_http(pwd_crypto)

    print(f"[*] Password chain: raw -> MD5(MD5()) -> XXTEA+Base64")
    print(f"    Double MD5: {pwd_crypto}")
    print(f"    XXTEA key: {get_http_crypto_key(utc_timestamp)}")
    print(f"    Encrypted: {pwd_encrypted[:40]}...")
    print(f"    Timestamp: {utc_timestamp}")

    # Generate device UDID (persistent-looking random hex)
    import random
    udid = hashlib.md5(f"pppoker_device_{random.randint(0, 999999)}".encode()).hexdigest()

    # Try multiple endpoints
    urls = [
        "https://api.pppoker.club/poker/api/login.php",
        "https://www.cozypoker.net/poker/api/login.php",
    ]

    data = {
        'type': '4',                # 4 = email/password login
        'region': '2',              # 2 = Brazil region
        'username': username,
        'password': pwd_encrypted,  # XXTEA encrypted
        't': str(utc_timestamp),    # UTC timestamp for XXTEA key reconstruction
        'os': 'mac',
        'distributor': '0',
        'sub_distributor': '0',
        'country': 'BR',
        'appid': 'globle',
        'clientvar': '4.2.75',
        'imei': udid,
        'lang': 'pt',
        'languagecode': 'pt',
        'platform_type': '4',       # 4 = Mac
        'app_type': '1',
        'app_build_code': '221',    # from app logs: buildVer:221
    }

    # If a verification code was provided (after code=-15), add it to the request
    if verify_code:
        data['verifycode'] = str(verify_code)

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'UnityPlayer/2021.3.33f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)',
        'Accept': '*/*',
    }

    try:
        import urllib3
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

        last_error = None
        for url in urls:
            try:
                print(f"\n[*] Tentando {url}...")
                resp = requests.post(url, data=data, headers=headers, timeout=30, verify=False)
                print(f"    HTTP: {resp.status_code}")

                try:
                    result = resp.json()
                except:
                    print(f"    Raw response: {resp.text[:200]}")
                    last_error = resp.text[:200]
                    continue

                print(f"    Response: {result}")

                if result.get('code') == 0:
                    return {
                        'success': True,
                        'uid': int(result.get('uid')),
                        'rdkey': result.get('rdkey'),
                        'gserver_ip': result.get('gserver_ip'),
                        'gserver_port': result.get('gserver_port', 4000),
                    }
                elif result.get('code') == -15:
                    # Email verification required - server sent code to email
                    return {
                        'success': False,
                        'needs_verify': True,
                        'uid': result.get('uid'),
                        'secret_mail': result.get('secret_mail', ''),
                        'remaining_times': result.get('remaining_times', 0),
                        'error': f"Email verification required. Code sent to {result.get('secret_mail')}. Call http_login() again with verify_code='XXXXXX'",
                    }
                else:
                    last_error = result
            except Exception as e:
                print(f"    Error: {e}")
                last_error = str(e)
                continue

        return {
            'success': False,
            'error': f"Login failed: {last_error}",
            'response': last_error if isinstance(last_error, dict) else {}
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}


def build_club_info_req(clube_id: int) -> bytes:
    """
    Build pb.ClubInfoREQ message - enter/select club

    Args:
        clube_id: ID do clube para entrar (ex: 4210947)
    """
    payload = b''
    # Field 1: clube_id
    payload += bytes([0x08]) + encode_varint(clube_id)
    # Field 2: flag (1 = enter/select)
    payload += bytes([0x10, 0x01])
    return build_message('pb.ClubInfoREQ', payload)


def build_export_game_data_req(club_id: int, user_id: int, liga_id: int, email: str,
                                date_start: str, date_end: str,
                                transacoes: bool = True,
                                relatorio_diamante: bool = True) -> bytes:
    """
    Build pb.ExportGameDataREQ message for exporting club data to email

    Args:
        club_id: Club ID (Field 1)
        user_id: User ID (Field 4)
        liga_id: Liga/Federation ID (Field 8)
        email: Destination email
        date_start: Start date (YYYYMMDD)
        date_end: End date (YYYYMMDD)
        transacoes: Include transactions
        relatorio_diamante: Include diamond report
    """
    from datetime import datetime, timedelta

    # Parse dates
    start_dt = datetime.strptime(date_start, '%Y%m%d')
    end_dt = datetime.strptime(date_end, '%Y%m%d')

    # Generate day timestamps
    day_timestamps = []
    current = start_dt
    while current <= end_dt:
        ts = int(current.replace(hour=0, minute=0, second=0).timestamp())
        day_timestamps.append(ts)
        current += timedelta(days=1)

    # End timestamp (23:59:59)
    end_timestamp = int(end_dt.replace(hour=23, minute=59, second=59).timestamp())

    # Build payload
    payload = b''

    # Field 1: Club ID
    payload += b'\x08' + encode_varint(club_id)

    # Field 2: Day timestamps (repeated)
    for ts in day_timestamps:
        payload += b'\x10' + encode_varint(ts)

    # Field 3: End timestamp
    payload += b'\x18' + encode_varint(end_timestamp)

    # Field 4: User ID
    payload += b'\x20' + encode_varint(user_id)

    # Field 5: Email
    email_bytes = email.encode('utf-8')
    payload += b'\x2a' + encode_varint(len(email_bytes)) + email_bytes

    # Field 6: Unknown (-3 as unsigned 64-bit)
    payload += b'\x30' + encode_varint(0xFFFFFFFFFFFFFFFD)

    # Field 7: Language
    payload += b'\x3a\x02pt'

    # Field 8: Liga ID
    payload += b'\x40' + encode_varint(liga_id)

    # Field 9: Transações
    payload += b'\x48' + encode_varint(1 if transacoes else 0)

    # Field 10: Relatório diamante
    payload += b'\x50' + encode_varint(1 if relatorio_diamante else 0)

    # Field 11: Unknown (0)
    payload += b'\x58' + encode_varint(0)

    # Field 12: Date start
    payload += b'\x60' + encode_varint(int(date_start))

    # Field 13: Date end
    payload += b'\x68' + encode_varint(int(date_end))

    # Field 14: Unknown (0)
    payload += b'\x70' + encode_varint(0)

    # Field 15: Game type (609 = all)
    payload += b'\x78' + encode_varint(609)

    # Field 16: Must be 0 (value 1 causes -5 permission error)
    payload += b'\x80\x01' + encode_varint(0)

    # Field 17: Flag (0)
    payload += b'\x88\x01' + encode_varint(0)

    return build_message('pb.ExportGameDataREQ', payload)


def build_add_coin_req(clube_id: int, liga_id: int, target_player_id: int,
                       amount: int, sender_id: int) -> bytes:
    """
    Build pb.AddCoinREQ message for chip transfer

    Args:
        clube_id: ID do clube onde acontece a transferência (ex: 4210947)
        liga_id: ID da liga/federação (ex: 3357)
        target_player_id: ID do jogador que recebe as fichas (ex: 2647904)
        amount: Quantidade de fichas (positivo = enviar, negativo = resgatar)
        sender_id: ID do usuário autenticado que envia (ex: 8980655)
    """
    timestamp = int(time.time())
    txn_id = f"{clube_id}_{sender_id}_{timestamp}"

    payload = b''
    # Field 1: clube_id
    payload += bytes([0x08]) + encode_varint(clube_id)
    # Field 4: liga_id
    payload += bytes([0x20]) + encode_varint(liga_id)
    # Field 5: type (0 = standard)
    payload += bytes([0x28, 0x00])
    # Field 6: target_player_id (quem recebe)
    payload += bytes([0x30]) + encode_varint(target_player_id)
    # Field 7: amount (multiplicado por 100 - protocolo interno usa centavos)
    # Para withdraw: negativo via complemento de 2 em 64 bits (igual MCP)
    payload += bytes([0x38]) + encode_varint(amount * 100)
    # Field 8: transaction_id
    txn_bytes = txn_id.encode('utf-8')
    payload += bytes([0x42]) + encode_varint(len(txn_bytes)) + txn_bytes

    return build_message('pb.AddCoinREQ', payload)


PAPEL_NOME = {1: 'Dono', 2: 'Gestor', 4: 'Super Agente', 5: 'Agente', 10: 'Membro'}


def _parse_proto_fields(data):
    """
    Decodifica campos protobuf de forma flat.
    Retorna dict: {field_num: [valor, ...]}  (valores são int, str ou bytes)
    """
    fields = {}
    pos = 0
    while pos < len(data):
        if pos >= len(data):
            break
        tag_val, pos = decode_varint(data, pos)
        field_num = tag_val >> 3
        wire_type = tag_val & 0x7
        if wire_type == 0:
            val, pos = decode_varint(data, pos)
            signed = val - 2**64 if val >= 2**63 else val
            fields.setdefault(field_num, []).append(signed)
        elif wire_type == 2:
            length, pos = decode_varint(data, pos)
            raw = data[pos:pos + length]
            pos += length
            # Tentar UTF-8
            try:
                txt = raw.decode('utf-8')
                if all(32 <= ord(c) < 127 or ord(c) > 127 for c in txt):
                    fields.setdefault(field_num, []).append(txt)
                    continue
            except Exception:
                pass
            fields.setdefault(field_num, []).append(raw)
        elif wire_type == 1:
            import struct as _s
            val = _s.unpack_from('<Q', data, pos)[0]
            pos += 8
            fields.setdefault(field_num, []).append(val)
        elif wire_type == 5:
            import struct as _s
            val = _s.unpack_from('<I', data, pos)[0]
            pos += 4
            fields.setdefault(field_num, []).append(val)
        else:
            break
    return fields


def _first(fields, key, default=None):
    vals = fields.get(key, [])
    return vals[0] if vals else default


def _decode_member_sub(raw_bytes):
    """
    Decodifica um sub-message de membro (campo f3 repetido no ClubMemberRSP
    ou campo f3 dentro de ClubAgentMemberRSP).

    Estrutura conhecida (ClubAgentMemberRSP / ClubMemberRSP):
      f1  = papel (1=dono, 2=gestor, 4=super agente, 5=agente, 10=membro)
      f2  = uid
      f3  = nickname
      f4  = avatar_url
      f6  = join_timestamp
      f12 = sub-message: f2 repeated (downline UIDs), f3=credito, f5=credito2
      f13 = titulo_custom
      f15 = last_active_timestamp
      f19 = credito_linha (-1=sem crédito, 0=zero, positivo=valor, 1023=gestor)
      f20 = nome_agente_direto
      f22 = online (1=sim, 0=não)
      f23 = saldo_caixa (fichas, signed — apenas para agentes/super)
      f24 = agente_uid (UID do agente direto, ou próprio UID para agentes)
      f25 = super_agente_uid (apenas para super agentes)
      f26 = super_agente_nome
    """
    f = _parse_proto_fields(raw_bytes)

    uid_val = _first(f, 2)

    # Downlines (lista de UIDs no f12 — para agentes no ClubMemberREQ)
    downlines = []
    f12_raw = _first(f, 12)
    if isinstance(f12_raw, bytes):
        f12_fields = _parse_proto_fields(f12_raw)
        # Exclui o próprio UID (servidor inclui self na lista)
        downlines = [v for v in f12_fields.get(2, []) if isinstance(v, int) and v != uid_val]

    papel_num = _first(f, 1, 10)
    credito_linha = _first(f, 19, -1)

    return {
        'uid':              uid_val,
        'nome':             _first(f, 3, ''),
        'papel_num':        papel_num,
        'papel':            PAPEL_NOME.get(papel_num, f'Papel{papel_num}'),
        'avatar_url':       _first(f, 4, ''),
        'join_ts':          _first(f, 6),
        'last_active_ts':   _first(f, 15),
        'titulo':           _first(f, 13, ''),
        'online':           _first(f, 22, 0) == 1,
        'saldo_caixa':      _first(f, 23),     # fichas (signed), None se ausente
        'credito_linha':    credito_linha,      # -1=sem crédito, 0+=crédito concedido
        'agente_uid':       _first(f, 24),
        'agente_nome':      _first(f, 20, ''),
        'super_agente_uid': _first(f, 25),
        'super_agente_nome':_first(f, 26, ''),
        'downlines':        downlines,           # UIDs diretos (apenas agentes/super)
    }


def _decode_member_info_rsp(payload):
    """Decodifica ClubAgentMemberRSP."""
    f = _parse_proto_fields(payload)
    code = _first(f, 1, 0)
    if code != 0:
        return {'success': False, 'error': f'Código {code}'}

    f3_raw = _first(f, 3)
    if not isinstance(f3_raw, bytes):
        return {'success': False, 'error': 'Sem dados de membro'}

    member = _decode_member_sub(f3_raw)
    member['success'] = True
    member['clube_id'] = _first(f, 2)
    return member


def _decode_member_list_rsp(payload):
    """Decodifica ClubMemberRSP — lista completa de membros."""
    f = _parse_proto_fields(payload)
    clube_id = _first(f, 1)

    members = []
    for raw in f.get(3, []):
        if isinstance(raw, bytes):
            try:
                m = _decode_member_sub(raw)
                members.append(m)
            except Exception:
                pass

    return {
        'success': True,
        'clube_id': clube_id,
        'total': len(members),
        'members': members,
    }


GAME_TYPE_NOME = {
    1: 'NLH',        # No Limit Hold\'em (genérico)
    2: 'MTT',        # Multi-Table Tournament
    3: 'SNG',        # Sit & Go
    4: 'OFC',        # Open Face Chinese
    5: 'NLH Cash',   # No Limit Hold\'em Cash
    6: 'PLO4',       # Pot Limit Omaha 4
    7: 'PLO5',       # Pot Limit Omaha 5
    8: 'PLO6',       # Pot Limit Omaha 6
    9: 'ShortDeck',  # Short Deck / 6+
    10: 'SpinUp',    # Spin & Go style
}


def _decode_room_sub(raw_bytes):
    """
    Decodifica um sub-message de sala/mesa (campo f2 repetido no ClubRoomRSP).

    Estrutura:
      f1  = room_id
      f2  = nome da sala
      f5  = buy_in (em centavos se cash, chips se torneio)
      f6  = fee / addon
      f7  = min_buy (cash) ou 0 (torneio)
      f8  = time_bank / duração
      f9  = max_players (2=HU, 6=6max, 8=8max, 9=full ring)
      f10 = jogadores_registrados (torneio) ou 0
      f11 = running (1=sim)
      f13 = game_type (2=MTT, 3=SNG, 5=NLH Cash, 6=PLO4, 7=PLO5, etc.)
      f14 = blind_duration (torneio, segundos)
      f15 = starting_chips (torneio)
      f16 = total_entries / mesas ativas
      f17 = entries_pagas
      f18 = status (0=idle, 1=registrando, 2=em andamento, 3=finalizado)
      f19 = proximo_inicio_ts
      f20 = inicio_real_ts
      f21 = last_update_ts
      f22 = scheduled_ts
      f25 = is_running (1=sim para cash)
      f28 = creation_ts
      f29 = late_registration_level
      f34 = re_entry_time (minutos)
      f61 = garantido (prize pool garantido, torneio)
      f68 = sub: f1=prize_total, f2=prize_collected, f3=prize_remaining, f4=prize_guarantee
      f82 = creator_uid
      f89 = addon_usado (count)
      f91 = -1 se torneio, 0 se cash
      f95 = rake / taxa
    """
    f = _parse_proto_fields(raw_bytes)
    room_id = _first(f, 1)
    nome = _first(f, 2, '')
    if isinstance(nome, bytes):
        try:
            nome = nome.decode('utf-8', errors='replace')
        except:
            nome = ''

    game_type_num = _first(f, 13, 0)
    is_running = _first(f, 11, 0) == 1 or _first(f, 25, 0) == 1
    max_players = _first(f, 9, 0)
    current_players = _first(f, 16, 0)

    # Prize pool (f68 sub-message)
    prize = {}
    f68_raw = _first(f, 68)
    if isinstance(f68_raw, bytes):
        pf = _parse_proto_fields(f68_raw)
        prize = {
            'total': _first(pf, 1, 0),
            'collected': _first(pf, 2, 0),
            'remaining': _first(pf, 3, 0),
            'guarantee': _first(pf, 4, 0),
        }

    is_tournament = game_type_num in (2, 3, 10) or _first(f, 91, 0) == -1

    return {
        'room_id':          room_id,
        'nome':             nome,
        'game_type_num':    game_type_num,
        'game_type':        GAME_TYPE_NOME.get(game_type_num, f'Tipo{game_type_num}'),
        'is_tournament':    is_tournament,
        'is_running':       is_running,
        'max_players':      max_players,
        'current_players':  current_players,
        'registered':       _first(f, 10, 0),
        'buy_in':           _first(f, 5, 0),
        'fee':              _first(f, 6, 0),
        'starting_chips':   _first(f, 15, 0),
        'blind_duration':   _first(f, 14, 0),
        'status':           _first(f, 18, 0),
        'scheduled_ts':     _first(f, 22),
        'start_ts':         _first(f, 20),
        'next_start_ts':    _first(f, 19),
        'last_update_ts':   _first(f, 21),
        'creation_ts':      _first(f, 28),
        'late_reg_level':   _first(f, 29, 0),
        're_entry_min':     _first(f, 34, 0),
        'guaranteed':       _first(f, 61, 0),
        'prize':            prize,
        'rake':             _first(f, 95, 0),
        'creator_uid':      _first(f, 82),
    }


def _decode_room_list_rsp(payload):
    """Decodifica ClubRoomRSP — lista completa de salas/mesas."""
    f = _parse_proto_fields(payload)
    liga_id = _first(f, 1)

    rooms = []
    for raw in f.get(2, []):
        if isinstance(raw, bytes):
            try:
                r = _decode_room_sub(raw)
                rooms.append(r)
            except Exception:
                pass

    return {
        'success': True,
        'liga_id': liga_id,
        'total': len(rooms),
        'rooms': rooms,
    }


def _decode_league_clubs_rsp(payload):
    """
    Decodifica LeagueMemberRSP — lista de clubes na liga.

    Campos por clube (f3 repeated):
      f1  = club_id
      f2  = club_name
      f3  = avatar_url
      f4  = status (1=ativo, 2=normal?)
      f6  = max_members
      f9  = last_active_ts (se disponível)
      f10 = join_date_ts
      f18 = diamantes?
      f22 = saldo (signed, pode ser negativo)
      f23 = crédito?
    """
    f = _parse_proto_fields(payload)

    clubs = []
    for raw in f.get(3, []):
        if isinstance(raw, bytes):
            try:
                cf = _parse_proto_fields(raw)
                clubs.append({
                    'club_id':      _first(cf, 1),
                    'nome':         _first(cf, 2, ''),
                    'avatar_url':   _first(cf, 3, ''),
                    'status':       _first(cf, 4, 0),
                    'max_members':  _first(cf, 6, 0),
                    'join_ts':      _first(cf, 10),
                    'last_active_ts': _first(cf, 9),
                    'saldo':        _first(cf, 22, 0),
                    'credito':      _first(cf, 23, 0),
                    'diamantes':    _first(cf, 18, 0),
                })
            except Exception:
                pass

    return {
        'success': True,
        'total': len(clubs),
        'clubs': clubs,
    }


def _decode_join_list_rsp(payload):
    """
    Decodifica ClubJoinListRSP — lista de solicitações de entrada no clube.

    Estrutura (confirmada por captura real):
      f1 = repeated sub-messages (solicitações pendentes)
      f2 = clube_id
    Cada sub-message:
      f1 = request_id (usado em HandleJoinMsgREQ para aprovar/rejeitar)
      f2 = uid do solicitante
      f3 = nome
      f4 = avatar_url
      f5 = timestamp da solicitação (unix)
      f6 = mensagem do solicitante (ex: "Sou Fulano")
      f7 = ? (0)
      f8 = ? (empty)
      f9 = ? (0)
    """
    f = _parse_proto_fields(payload)
    clube_id = _first(f, 2)

    requests = []
    for raw in f.get(1, []):
        if isinstance(raw, bytes):
            try:
                rf = _parse_proto_fields(raw)
                nome = _first(rf, 3, '')
                if isinstance(nome, bytes):
                    nome = nome.decode('utf-8', errors='replace')
                msg = _first(rf, 6, '')
                if isinstance(msg, bytes):
                    msg = msg.decode('utf-8', errors='replace')
                avatar = _first(rf, 4, '')
                if isinstance(avatar, bytes):
                    avatar = avatar.decode('utf-8', errors='replace')
                requests.append({
                    'request_id': _first(rf, 1),
                    'uid': _first(rf, 2),
                    'nome': nome,
                    'avatar_url': avatar,
                    'timestamp': _first(rf, 5),
                    'mensagem': msg,
                })
            except Exception:
                pass

    return {
        'success': True,
        'clube_id': clube_id,
        'total': len(requests),
        'requests': requests,
    }


class PPPokerClient:
    """PPPoker TCP client"""

    SERVERS = [
        '47.254.71.136',  # Primary
        '47.89.212.243',  # Alt 1
        '47.254.69.45',   # Alt 2
    ]

    def __init__(self, uid: int, rdkey: str):
        self.uid = uid
        self.rdkey = rdkey
        self.sock = None
        self.connected = False
        self.authenticated = False

    def connect(self, server: str = None) -> bool:
        """Connect to game server"""
        servers = [server] if server else self.SERVERS

        for srv in servers:
            try:
                self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                self.sock.settimeout(10)
                self.sock.connect((srv, 4000))
                self.connected = True
                print(f"[+] Connected to {srv}:4000")
                return True
            except Exception as e:
                print(f"[-] Failed to connect to {srv}: {e}")
                continue

        return False

    def send(self, data: bytes) -> bool:
        """Send data"""
        if not self.connected:
            return False
        try:
            self.sock.sendall(data)
            return True
        except Exception as e:
            print(f"[-] Send error: {e}")
            return False

    def recv(self, size: int = 4096) -> bytes:
        """Receive data"""
        if not self.connected:
            return b''
        try:
            return self.sock.recv(size)
        except Exception as e:
            print(f"[-] Recv error: {e}")
            return b''

    def login(self) -> bool:
        """Authenticate to server"""
        if not self.connected:
            return False

        login_req = build_user_login_req(self.uid, self.rdkey)
        self.send(login_req)
        time.sleep(0.5)

        resp = self.recv()
        if not resp:
            print("[-] No login response")
            return False

        parsed = parse_response(resp)
        if parsed['message'] != 'pb.UserLoginRSP':
            print(f"[-] Unexpected response: {parsed['message']}")
            return False

        if b'error' in parsed['payload']:
            error_msg = parsed['payload'].decode('utf-8', errors='ignore')
            print(f"[-] Login error: {error_msg}")
            return False

        print(f"[+] Login successful!")
        self.authenticated = True

        # Send heartbeat to confirm
        self.send(build_heartbeat_req())
        time.sleep(0.3)
        hb_resp = self.recv()
        if hb_resp:
            hb_parsed = parse_response(hb_resp)
            if hb_parsed['message'] == 'pb.HeartBeatRSP':
                print(f"[+] Session verified with heartbeat")

        return True

    def enter_club(self, clube_id: int, silent: bool = True) -> bool:
        """
        Enter/select a club before doing operations

        Args:
            clube_id: ID do clube para entrar (ex: 4210947)
            silent: Se True, não mostra mensagens de erro (padrão)
        """
        if not self.authenticated:
            return False

        club_req = build_club_info_req(clube_id)
        self.send(club_req)
        time.sleep(0.3)

        # Read responses - may get ClubInfoRSP or other messages
        for _ in range(3):
            resp = self.recv()
            if not resp:
                continue

            parsed = parse_response(resp)

            if parsed['message'] == 'pb.ClubInfoRSP':
                return True
            elif parsed['message'] in ['pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC']:
                time.sleep(0.1)
                continue

        return True  # Continue anyway - transfer works without entering club

    def transfer_chips(self, target_player_id: int, amount: int,
                       clube_id: int, liga_id: int = 3357) -> dict:
        """
        Transfer chips to/from target player

        Args:
            target_player_id: ID do jogador que recebe (ex: 2647904)
            amount: Quantidade de fichas (positivo = enviar, negativo = resgatar)
            clube_id: ID do clube (ex: 4210947)
            liga_id: ID da liga (ex: 3357)
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        print(f"\n[*] Transferindo {amount} fichas para jogador {target_player_id}...")
        print(f"    Clube: {clube_id}, Liga: {liga_id}, Sender: {self.uid}")

        transfer_req = build_add_coin_req(
            clube_id=clube_id,
            liga_id=liga_id,
            target_player_id=target_player_id,
            amount=amount,
            sender_id=self.uid
        )

        print(f"    Request hex: {transfer_req.hex()}")
        self.send(transfer_req)
        time.sleep(0.5)

        # Read responses until we get AddCoinRSP or ClubAgentPPCoinRSP
        SUCCESS_MSGS = {'pb.AddCoinRSP', 'pb.ClubAgentPPCoinRSP'}
        SKIP_MSGS = {'pb.HeartBeatRSP', 'pb.CallGameBRC', 'pb.PushBRC', 'pb.ClubInfoRSP'}

        for _ in range(5):
            resp = self.recv()
            if not resp:
                return {'success': False, 'error': 'No response'}

            parsed = parse_response(resp)
            print(f"    Received: {parsed['message']}")

            if parsed['message'] in SUCCESS_MSGS:
                break
            elif parsed['message'] in SKIP_MSGS:
                time.sleep(0.3)
                continue
            else:
                print(f"    Payload hex: {parsed.get('payload_hex', 'N/A')}")
                time.sleep(0.3)
                continue
        else:
            return {'success': False, 'error': 'No transfer response received'}

        if parsed['message'] not in SUCCESS_MSGS:
            return {'success': False, 'error': f"Unexpected: {parsed['message']}"}

        # Parse response payload
        payload = parsed['payload']

        # Check for error strings in payload
        payload_text = payload.decode('utf-8', errors='ignore')
        if 'error' in payload_text.lower() or 'fail' in payload_text.lower():
            print(f"[-] Transfer error: {payload_text[:100]}")
            return {'success': False, 'error': payload_text[:100]}

        # For pb.AddCoinRSP: field 1 = result code (0 = success)
        if parsed['message'] == 'pb.AddCoinRSP' and len(payload) > 0:
            result_code, _ = decode_varint(payload, 1)  # Skip field tag
            if result_code != 0:
                print(f"[-] Transfer failed with code: {result_code}")
                return {'success': False, 'error': f"Code {result_code}"}

        # For pb.ClubAgentPPCoinRSP: receiving this response = success
        # The payload contains club_id and other info, not an error code
        print(f"[+] Transfer successful!")
        return {'success': True, 'response': parsed}

    def export_data(self, club_id: int, liga_id: int, email: str, date_start: str, date_end: str,
                    transacoes: bool = True, relatorio_diamante: bool = True) -> dict:
        """
        Export club data to email

        Args:
            club_id: Club ID
            liga_id: Liga/Federation ID
            email: Destination email
            date_start: Start date (YYYYMMDD)
            date_end: End date (YYYYMMDD)
            transacoes: Include transactions
            relatorio_diamante: Include diamond report

        Returns:
            dict with 'success' and 'message' keys
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        print(f"\n[*] Exportando dados do clube {club_id}...")
        print(f"    Liga: {liga_id}, User: {self.uid}")
        print(f"    Período: {date_start} - {date_end}")
        print(f"    Email: {email}")

        export_req = build_export_game_data_req(
            club_id=club_id,
            user_id=self.uid,
            liga_id=liga_id,
            email=email,
            date_start=date_start,
            date_end=date_end,
            transacoes=transacoes,
            relatorio_diamante=relatorio_diamante
        )

        self.send(export_req)

        # Drain all incoming data for up to 8 seconds, parse every message
        self.sock.settimeout(8)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        # Parse all framed messages in buffer
        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen

            msg = parsed['message']
            print(f"    Received: {msg}")

            if msg == 'pb.ExportGameDataRSP':
                payload = parsed.get('payload', b'')
                code = 0
                if payload and payload[0] == 0x08:
                    code, _ = decode_varint(payload, 1)
                    if code >= 2 ** 63:
                        code -= 2 ** 64
                if code == 0:
                    print(f"[+] Export enviado com sucesso!")
                    return {'success': True, 'message': f'Planilha enviada para {email}'}
                else:
                    error_map = {-2: 'Sem permissão (conta não é dono)', -3: 'Período muito longo',
                                 -4: 'Liga inválida', -5: 'Sem dados / permissão insuficiente'}
                    err = error_map.get(code, f'Erro código {code}')
                    print(f"[-] Export falhou: {err}")
                    return {'success': False, 'error': err, 'code': code}

        return {'success': False, 'error': 'No ExportGameDataRSP received'}

    def get_member_info(self, clube_id: int, uid: int) -> dict:
        """
        Busca informações de um membro específico do clube.
        Usa pb.ClubAgentMemberREQ → pb.ClubAgentMemberRSP

        Args:
            clube_id: ID do clube
            uid: ID do membro (jogador, agente ou super agente)

        Returns:
            dict com uid, nome, papel, titulo, avatar, join_ts, last_active_ts,
                  online, caixa_balance, downlines (lista de UIDs para agentes)
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = b'\x08' + encode_varint(clube_id) + b'\x10' + encode_varint(uid)
        self.send(build_message('pb.ClubAgentMemberREQ', payload))

        # Drain buffer
        self.sock.settimeout(5)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.ClubAgentMemberRSP':
                return _decode_member_info_rsp(parsed.get('payload', b''))

        return {'success': False, 'error': 'Sem resposta ClubAgentMemberRSP'}

    def list_club_members(self, clube_id: int) -> dict:
        """
        Lista todos os membros do clube com hierarquia completa.
        Usa pb.ClubMemberREQ → pb.ClubMemberRSP

        Args:
            clube_id: ID do clube

        Returns:
            dict com 'members' (lista de dicts), cada um com:
              uid, nome, papel, titulo, avatar, join_ts, last_active_ts,
              online, caixa_balance, credito, agente_uid, agente_nome,
              downlines (apenas para agentes/super agentes)
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = b'\x08' + encode_varint(clube_id)
        self.send(build_message('pb.ClubMemberREQ', payload))

        # Drain buffer — resposta pode ser grande (~16KB)
        self.sock.settimeout(8)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.ClubMemberRSP':
                return _decode_member_list_rsp(parsed.get('payload', b''))

        return {'success': False, 'error': 'Sem resposta ClubMemberRSP'}

    def list_club_rooms(self, clube_id: int) -> dict:
        """
        Lista todas as salas/mesas do clube (torneios + cash games).
        Usa pb.ClubRoomREQ → pb.ClubRoomRSP

        Args:
            clube_id: ID do clube

        Returns:
            dict com 'rooms' (lista de dicts), cada um com:
              room_id, nome, game_type, is_tournament, is_running,
              max_players, current_players, buy_in, prize, rake, etc.
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = b'\x08' + encode_varint(clube_id)
        self.send(build_message('pb.ClubRoomREQ', payload))

        # Drain buffer — resposta pode ser grande (~64KB)
        self.sock.settimeout(10)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.ClubRoomRSP':
                return _decode_room_list_rsp(parsed.get('payload', b''))

        return {'success': False, 'error': 'Sem resposta ClubRoomRSP'}

    def list_join_requests(self, clube_id: int) -> dict:
        """
        Lista solicitações de entrada pendentes no clube.
        Usa pb.ClubJoinListREQ → pb.ClubJoinListRSP

        Args:
            clube_id: ID do clube

        Returns:
            dict com 'requests' (lista de solicitações pendentes)
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = b'\x08' + encode_varint(clube_id)
        self.send(build_message('pb.ClubJoinListREQ', payload))

        self.sock.settimeout(5)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.ClubJoinListRSP':
                return _decode_join_list_rsp(parsed.get('payload', b''))

        return {'success': False, 'error': 'Sem resposta ClubJoinListRSP'}

    def handle_join_request(self, clube_id: int, request_id: int, accept: bool = True) -> dict:
        """
        Aprova ou rejeita uma solicitação de entrada no clube.
        Usa pb.HandleJoinMsgREQ → pb.HandleJoinMsgRSP

        Args:
            clube_id: ID do clube
            request_id: ID da solicitação (campo f1 do ClubJoinListRSP)
            accept: True para aceitar, False para rejeitar

        Returns:
            dict com 'success', 'uid_handled', etc.
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        action = 1 if accept else 2
        payload = (b'\x08' + encode_varint(clube_id) +
                   b'\x10' + encode_varint(request_id) +
                   b'\x18' + encode_varint(action))
        self.send(build_message('pb.HandleJoinMsgREQ', payload))

        self.sock.settimeout(5)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.HandleJoinMsgRSP':
                rsp_payload = parsed.get('payload', b'')
                fields = _parse_proto_fields(rsp_payload)
                code = _first(fields, 1, 0)
                if isinstance(code, int) and code >= 2**63:
                    code = code - 2**64
                uid_handled = _first(fields, 3, 0)
                return {
                    'success': code == 0,
                    'code': code,
                    'clube_id': _first(fields, 2, clube_id),
                    'uid_handled': uid_handled,
                    'action': 'accepted' if accept else 'rejected',
                }

        return {'success': False, 'error': 'Sem resposta HandleJoinMsgRSP'}

    ROLE_NAMES = {1: 'Dono', 2: 'Gestor', 4: 'Super Agente', 5: 'Agente', 10: 'Membro'}

    def set_member_role(self, clube_id: int, target_uid: int, role: int) -> dict:
        """
        Promove ou rebaixa um membro do clube.
        Usa pb.ClubSetRoleREQ → pb.ClubSetRoleRSP

        Args:
            clube_id: ID do clube
            target_uid: UID do membro a ser promovido/rebaixado
            role: Novo papel (1=Dono, 2=Gestor, 4=Super Agente, 5=Agente, 10=Membro)

        Returns:
            dict com 'success', 'uid', 'new_role', etc.
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        if role not in self.ROLE_NAMES:
            return {'success': False, 'error': f'Papel inválido: {role}. Válidos: {self.ROLE_NAMES}'}

        payload = (b'\x08' + encode_varint(clube_id) +
                   b'\x10' + encode_varint(target_uid) +
                   b'\x18' + encode_varint(role))
        self.send(build_message('pb.ClubSetRoleREQ', payload))

        self.sock.settimeout(5)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.ClubSetRoleRSP':
                rsp_payload = parsed.get('payload', b'')
                fields = _parse_proto_fields(rsp_payload)
                code = _first(fields, 1, 0)
                if isinstance(code, int) and code >= 2**63:
                    code = code - 2**64
                return {
                    'success': code == 0,
                    'code': code,
                    'clube_id': _first(fields, 2, clube_id),
                    'new_role': _first(fields, 3, role),
                    'new_role_name': self.ROLE_NAMES.get(_first(fields, 3, role), '?'),
                    'uid': _first(fields, 4, target_uid),
                }

        return {'success': False, 'error': 'Sem resposta ClubSetRoleRSP'}

    def kick_member(self, clube_id: int, target_uid: int) -> dict:
        """
        Remove (kick) um membro do clube.
        Usa pb.KickClubUserREQ → pb.KickClubUserRSP

        Args:
            clube_id: ID do clube
            target_uid: UID do membro a ser removido

        Returns:
            dict com 'success', 'code', 'clube_id', 'uid_kicked'
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = (b'\x08' + encode_varint(clube_id) +
                   b'\x10' + encode_varint(target_uid))
        self.send(build_message('pb.KickClubUserREQ', payload))

        self.sock.settimeout(5)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.KickClubUserRSP':
                rsp_payload = parsed.get('payload', b'')
                fields = _parse_proto_fields(rsp_payload)
                code = _first(fields, 1, 0)
                if isinstance(code, int) and code >= 2**63:
                    code = code - 2**64
                return {
                    'success': code == 0,
                    'code': code,
                    'clube_id': _first(fields, 2, clube_id),
                    'uid_kicked': _first(fields, 3, target_uid),
                }

        return {'success': False, 'error': 'Sem resposta KickClubUserRSP'}

    def list_league_clubs(self, liga_id: int) -> dict:
        """
        Lista todos os clubes de uma liga/federação.
        Usa pb.LeagueMemberREQ (f1=liga_id) → pb.LeagueMemberRSP

        Args:
            liga_id: ID da liga

        Returns:
            dict com 'clubs' (lista de dicts), cada um com:
              club_id, nome, avatar_url, max_members, saldo, join_ts, etc.
        """
        if not self.authenticated:
            return {'success': False, 'error': 'Not authenticated'}

        payload = b'\x08' + encode_varint(liga_id)
        self.send(build_message('pb.LeagueMemberREQ', payload))

        # Drain buffer
        self.sock.settimeout(6)
        buf = b''
        try:
            while True:
                chunk = self.sock.recv(65536)
                if not chunk:
                    break
                buf += chunk
        except Exception:
            pass

        import struct as _struct
        pos = 0
        while pos < len(buf):
            if pos + 4 > len(buf):
                break
            tlen = _struct.unpack('>I', buf[pos:pos + 4])[0]
            if pos + 4 + tlen > len(buf):
                break
            parsed = parse_response(buf[pos:pos + 4 + tlen])
            pos += 4 + tlen
            if parsed['message'] == 'pb.LeagueMemberRSP':
                return _decode_league_clubs_rsp(parsed.get('payload', b''))

        return {'success': False, 'error': 'Sem resposta LeagueMemberRSP'}

    def close(self):
        """Close connection"""
        if self.sock:
            self.sock.close()
        self.connected = False
        self.authenticated = False


def main():
    parser = argparse.ArgumentParser(description='PPPoker Direct API Client')
    subparsers = parser.add_subparsers(dest='command')

    # Transfer command
    transfer_parser = subparsers.add_parser('transfer', help='Transfer chips')
    transfer_parser.add_argument('--uid', type=int, required=True, help='Seu user ID (sender)')
    transfer_parser.add_argument('--rdkey', required=True, help='Session key (32 char hex)')
    transfer_parser.add_argument('--target', type=int, required=True, help='ID do jogador que recebe')
    transfer_parser.add_argument('--amount', type=int, required=True, help='Quantidade de fichas')
    transfer_parser.add_argument('--clube', type=int, required=True, help='ID do clube (ex: 4210947)')
    transfer_parser.add_argument('--liga', type=int, default=3357, help='ID da liga (default: 3357)')
    transfer_parser.add_argument('--server', help='Server IP (optional)')

    # Test command
    test_parser = subparsers.add_parser('test', help='Test connection and auth')
    test_parser.add_argument('--uid', type=int, required=True, help='Your user ID')
    test_parser.add_argument('--rdkey', required=True, help='Your session key')

    # Login command (HTTP login to get rdkey)
    login_parser = subparsers.add_parser('login', help='HTTP login to get rdkey')
    login_parser.add_argument('--username', required=True, help='Email or phone')
    login_parser.add_argument('--password', required=True, help='Account password')

    # Full transfer with auto-login
    auto_parser = subparsers.add_parser('auto', help='Transfer with auto HTTP login')
    auto_parser.add_argument('--username', required=True, help='Email or phone')
    auto_parser.add_argument('--password', required=True, help='Account password')
    auto_parser.add_argument('--target', type=int, required=True, help='ID do jogador que recebe')
    auto_parser.add_argument('--amount', type=int, required=True, help='Quantidade de fichas')
    auto_parser.add_argument('--clube', type=int, required=True, help='ID do clube')
    auto_parser.add_argument('--liga', type=int, default=3357, help='ID da liga')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    if args.command == 'test':
        client = PPPokerClient(args.uid, args.rdkey)
        if client.connect():
            if client.login():
                print("\n[SUCCESS] Authentication working!")
            else:
                print("\n[FAILED] Authentication failed")
            client.close()

    elif args.command == 'transfer':
        client = PPPokerClient(args.uid, args.rdkey)
        server = args.server if hasattr(args, 'server') else None

        if not client.connect(server):
            print("[-] Could not connect to any server")
            sys.exit(1)

        if not client.login():
            print("[-] Authentication failed")
            client.close()
            sys.exit(1)

        # Enter the club first
        client.enter_club(args.clube)

        result = client.transfer_chips(
            target_player_id=args.target,
            amount=args.amount,
            clube_id=args.clube,
            liga_id=args.liga
        )

        client.close()

        if result['success']:
            print(f"\n[SUCCESS] Transferido {args.amount} fichas para jogador {args.target}")
        else:
            print(f"\n[FAILED] {result.get('error', 'Unknown error')}")
            sys.exit(1)

    elif args.command == 'login':
        print(f"[*] Fazendo HTTP login com {args.username}...")
        result = http_login(args.username, args.password)

        if result['success']:
            print(f"\n[SUCCESS] Login HTTP OK!")
            print(f"  UID: {result['uid']}")
            print(f"  RDKEY: {result['rdkey']}")
            print(f"  Server: {result.get('gserver_ip')}:{result.get('gserver_port')}")
        else:
            print(f"\n[FAILED] {result.get('error', 'Unknown error')}")
            if 'response' in result:
                print(f"  Response: {result['response']}")
            sys.exit(1)

    elif args.command == 'auto':
        # Step 1: HTTP Login
        print(f"[1] Fazendo HTTP login com {args.username}...")
        login_result = http_login(args.username, args.password)

        if not login_result['success']:
            print(f"[-] HTTP Login failed: {login_result.get('error')}")
            sys.exit(1)

        uid = login_result['uid']
        rdkey = login_result['rdkey']
        server = login_result.get('gserver_ip')

        print(f"    UID: {uid}, RDKEY: {rdkey[:8]}...{rdkey[-8:]}")

        # Step 2: TCP Connect
        print(f"\n[2] Conectando ao servidor {server}:4000...")
        client = PPPokerClient(uid, rdkey)

        if not client.connect(server):
            print("[-] Could not connect to server")
            sys.exit(1)

        # Step 3: TCP Login
        print(f"\n[3] Autenticando via TCP...")
        if not client.login():
            print("[-] TCP Authentication failed")
            client.close()
            sys.exit(1)

        # Step 4: Enter Club
        print(f"\n[4] Entrando no clube {args.clube}...")
        client.enter_club(args.clube)

        # Step 5: Transfer
        print(f"\n[5] Transferindo {args.amount} fichas para {args.target}...")
        result = client.transfer_chips(
            target_player_id=args.target,
            amount=args.amount,
            clube_id=args.clube,
            liga_id=args.liga
        )

        client.close()

        if result['success']:
            print(f"\n{'='*50}")
            print(f"[SUCCESS] Transferido {args.amount} fichas para jogador {args.target}")
            print(f"{'='*50}")
        else:
            print(f"\n[FAILED] {result.get('error', 'Unknown error')}")
            sys.exit(1)


if __name__ == '__main__':
    main()
