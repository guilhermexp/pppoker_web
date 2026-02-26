"""
TCP proxy to intercept PPPoker traffic and decode protobuf messages.

Usage:
  1. Run this script: python3 tcp_intercept.py
  2. It listens on localhost:4001 and forwards to 47.254.71.136:4000
  3. Configure PPPoker to connect to localhost:4001 (via /etc/hosts or similar)

Alternative approach (no app config needed):
  Use nftables/pf to redirect traffic, OR just use the existing bridge connection
  and send the same requests the app would send.

This script captures and decodes all protobuf messages in both directions.
"""

import socket
import struct
import threading
import json
import time
import os
import sys

REMOTE_HOST = "47.254.71.136"
REMOTE_PORT = 4000
LOCAL_PORT = 4001
LOG_DIR = "/tmp/pppoker_intercept_logs"

os.makedirs(LOG_DIR, exist_ok=True)

KNOWN_BROADCASTS = {
    "pb.HeartBeatRSP", "pb.NoticeBRC", "pb.CallGameBRC", "pb.PushBRC",
    "pb.HeartBeatREQ",
}


def decode_varint(data, pos):
    result = 0
    shift = 0
    while pos < len(data):
        b = data[pos]
        result |= (b & 0x7F) << shift
        pos += 1
        if (b & 0x80) == 0:
            break
        shift += 7
    return result, pos


def decode_protobuf(data, depth=0):
    """Decode raw protobuf bytes into field dict."""
    fields = {}
    pos = 0
    while pos < len(data):
        try:
            tag, pos = decode_varint(data, pos)
        except Exception:
            break
        field_num = tag >> 3
        wire_type = tag & 0x07

        if wire_type == 0:  # varint
            val, pos = decode_varint(data, pos)
            # Check signed
            if val >= 2**63:
                val -= 2**64
            fields[f"f{field_num}"] = val
        elif wire_type == 2:  # length-delimited
            length, pos = decode_varint(data, pos)
            if pos + length > len(data):
                break
            raw = data[pos:pos + length]
            pos += length
            # Try decode as string
            try:
                text = raw.decode("utf-8")
                if all(c.isprintable() or c in '\n\r\t' for c in text):
                    fields[f"f{field_num}"] = text
                else:
                    raise ValueError
            except (UnicodeDecodeError, ValueError):
                # Try as sub-message
                if len(raw) > 0 and depth < 3:
                    try:
                        sub = decode_protobuf(raw, depth + 1)
                        if sub:
                            key = f"f{field_num}"
                            if key in fields:
                                if not isinstance(fields[key], list):
                                    fields[key] = [fields[key]]
                                fields[key].append(sub)
                            else:
                                fields[key] = sub
                        else:
                            fields[f"f{field_num}"] = raw.hex()
                    except Exception:
                        fields[f"f{field_num}"] = raw.hex()
                else:
                    fields[f"f{field_num}"] = raw.hex()
        elif wire_type == 1:  # 64-bit
            if pos + 8 > len(data):
                break
            val = struct.unpack('<q', data[pos:pos + 8])[0]
            pos += 8
            fields[f"f{field_num}"] = val
        elif wire_type == 5:  # 32-bit
            if pos + 4 > len(data):
                break
            val = struct.unpack('<i', data[pos:pos + 4])[0]
            pos += 4
            fields[f"f{field_num}"] = val
        else:
            break

    return fields


def parse_frame(data):
    """Parse a PPPoker TCP frame: [4B len][2B name_len][name][4B pad][protobuf]"""
    if len(data) < 6:
        return None, None, None

    total_len = struct.unpack('>I', data[0:4])[0]
    name_len = struct.unpack('>H', data[4:6])[0]

    if len(data) < 6 + name_len + 4:
        return None, None, None

    name = data[6:6 + name_len].decode('utf-8', errors='replace')
    payload_start = 6 + name_len + 4
    payload = data[payload_start:4 + total_len] if payload_start < 4 + total_len else b''

    return name, payload, 4 + total_len


def parse_all_frames(data):
    """Parse all frames from a buffer."""
    frames = []
    pos = 0
    while pos < len(data):
        if pos + 4 > len(data):
            break
        total_len = struct.unpack('>I', data[pos:pos + 4])[0]
        frame_end = pos + 4 + total_len
        if frame_end > len(data):
            break

        name, payload, consumed = parse_frame(data[pos:])
        if name:
            decoded = decode_protobuf(payload) if payload else {}
            frames.append({
                "name": name,
                "payload_hex": payload.hex() if payload else "",
                "payload_len": len(payload),
                "decoded": decoded,
            })
        pos = frame_end

    return frames


def log_message(direction, frames, log_file):
    """Log intercepted frames."""
    ts = time.strftime("%H:%M:%S")
    for frame in frames:
        if frame["name"] in KNOWN_BROADCASTS:
            continue  # Skip noise

        entry = {
            "time": ts,
            "direction": direction,
            "name": frame["name"],
            "payload_len": frame["payload_len"],
            "decoded": frame["decoded"],
            "raw_hex": frame["payload_hex"][:200],  # truncate for readability
        }

        line = json.dumps(entry, ensure_ascii=False, default=str)
        print(f"[{ts}] {direction:10s} {frame['name']:40s} len={frame['payload_len']:5d}  {json.dumps(frame['decoded'], default=str)[:200]}")
        log_file.write(line + "\n")
        log_file.flush()


def forward(src, dst, direction, log_file):
    """Forward data between sockets, logging all frames."""
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            # Parse and log frames
            frames = parse_all_frames(data)
            if frames:
                log_message(direction, frames, log_file)
            # Forward to destination
            dst.sendall(data)
    except Exception as e:
        print(f"[{direction}] Connection closed: {e}")
    finally:
        try:
            src.close()
        except:
            pass
        try:
            dst.close()
        except:
            pass


def handle_client(client_sock, log_file):
    """Handle a proxied connection."""
    remote_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    remote_sock.connect((REMOTE_HOST, REMOTE_PORT))

    # Two threads: client->server and server->client
    t1 = threading.Thread(target=forward, args=(client_sock, remote_sock, "C->S", log_file), daemon=True)
    t2 = threading.Thread(target=forward, args=(remote_sock, client_sock, "S->C", log_file), daemon=True)
    t1.start()
    t2.start()
    t1.join()
    t2.join()


def main():
    log_path = os.path.join(LOG_DIR, f"intercept_{int(time.time())}.jsonl")
    log_file = open(log_path, "w")
    print(f"Logging to: {log_path}")
    print(f"Listening on localhost:{LOCAL_PORT}, forwarding to {REMOTE_HOST}:{REMOTE_PORT}")
    print("=" * 80)

    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(("0.0.0.0", LOCAL_PORT))
    server.listen(5)

    try:
        while True:
            client, addr = server.accept()
            print(f"New connection from {addr}")
            threading.Thread(target=handle_client, args=(client, log_file), daemon=True).start()
    except KeyboardInterrupt:
        print("\nShutting down...")
    finally:
        server.close()
        log_file.close()


if __name__ == "__main__":
    main()
