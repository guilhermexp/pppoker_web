#!/usr/bin/env python3
"""
Teste do fluxo completo via REST:
  Login → Lista clubes → Info de cada clube (membros, mesas)

Simula o que o dashboard faria: o usuário faz login e imediatamente
vê todos os clubes + dados, sem precisar informar club_id manualmente.

Uso:
  python3 test_full_flow.py
  python3 test_full_flow.py --username X --password Y
"""

import argparse
import json
import subprocess
import sys
import time

import requests

BRIDGE_URL = "http://localhost:8000"
ROLE_LABELS = {
    "dono": "👑 Dono",
    "gestor": "⚙️ Gestor",
    "super_agente": "🦸 Super Agente",
    "agente": "🤝 Agente",
    "membro": "👤 Membro",
}


def wait_for_bridge(timeout=15):
    """Espera o bridge subir."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            r = requests.get(f"{BRIDGE_URL}/health", timeout=2)
            if r.status_code == 200:
                return True
        except requests.ConnectionError:
            pass
        time.sleep(0.5)
    return False


def start_bridge():
    """Sobe o bridge em background se não estiver rodando."""
    try:
        r = requests.get(f"{BRIDGE_URL}/health", timeout=2)
        if r.status_code == 200:
            print("✓ Bridge já está rodando\n")
            return None
    except requests.ConnectionError:
        pass

    print("Subindo bridge server...")
    proc = subprocess.Popen(
        [sys.executable, "pppoker_api_server.py"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    if wait_for_bridge():
        print("✓ Bridge pronto\n")
        return proc
    else:
        proc.kill()
        print("✗ Bridge não subiu a tempo")
        sys.exit(1)


def header(text, char="="):
    width = 64
    print(f"\n{char * width}")
    print(f"  {text}")
    print(f"{char * width}")


def step_login(username, password):
    header("PASSO 1 — Login")
    print(f"  Usuário: {username}")

    r = requests.post(
        f"{BRIDGE_URL}/auth/login",
        json={"username": username, "password": password},
    )
    data = r.json()

    if not data.get("success"):
        print(f"  ✗ Login falhou: {data.get('error', data)}")
        sys.exit(1)

    print(f"  ✓ Login OK  —  UID: {data['uid']}")
    print(f"    Server: {data.get('gserver_ip')}:{data.get('gserver_port')}")
    return data


def fetch_club_balance(club_id, auth_headers):
    """Busca saldo (caixa) do clube via /clubs/{id}/members → club_info."""
    try:
        r = requests.get(
            f"{BRIDGE_URL}/clubs/{club_id}/members",
            headers=auth_headers,
            timeout=30,
        )
        if r.status_code == 200:
            data = r.json()
            info = data.get("club_info", {})
            return {
                "fichas": info.get("fichas_disponiveis"),
                "owner": info.get("owner_name"),
                "total_members": info.get("total_members"),
                "members": data.get("members", []),
            }
    except Exception:
        pass
    return None


def step_list_clubs(auth_headers, logged_uid):
    header("PASSO 2 — Descobrir clubes + saldos")

    r = requests.get(f"{BRIDGE_URL}/clubs", headers=auth_headers)
    data = r.json()
    clubs = data.get("clubs", [])

    print(f"  Encontrados: {len(clubs)} clubes")
    print(f"  Buscando saldo de cada um...\n")

    for c in clubs:
        role_label = ROLE_LABELS.get(c["user_role"], c["user_role"])
        liga = f"  Liga #{c['liga_id']}" if c.get("liga_id") else ""

        print(f"  [{c['club_id']}] {c['club_name']}")
        print(f"    Papel: {role_label}   Membros: {c['member_count']}{liga}")

        # Buscar saldo do clube (só se tem permissão)
        if c["user_role"] != "membro":
            info = fetch_club_balance(c["club_id"], auth_headers)
            if info:
                fichas = info.get("fichas")
                if fichas is not None:
                    print(f"    💰 Caixa do clube: {fichas:,.0f} fichas")
                members = info.get("members", [])
                # Achar o saldo do próprio usuário logado nesse clube
                me = next(
                    (m for m in members if m.get("uid") == logged_uid),
                    None,
                )
                if me:
                    meu_saldo = me.get("saldo_caixa") or 0
                    if meu_saldo != 0:
                        print(f"    🧾 Meu saldo (caixa): {meu_saldo:,.0f}")
                    credito = me.get("credito_linha")
                    if credito is not None and credito >= 0:
                        print(f"    📋 Minha linha de crédito: {credito:,.0f}")
                c["_info"] = info  # cache para passo 3
        else:
            print(f"    (sem acesso — papel de membro)")
        print()

    return clubs


def step_club_details(club, auth_headers):
    club_id = club["club_id"]
    role = club["user_role"]
    header(
        f"CLUBE {club_id} — {club['club_name']}  ({ROLE_LABELS.get(role, role)})",
        char="-",
    )

    if role == "membro":
        print("  (Papel = Membro — sem acesso a lista de membros)")
        return

    # --- Membros (reutiliza cache do passo 2 se disponível) ---
    members = []
    club_info = {}
    cached = club.get("_info")

    if cached:
        members = cached.get("members", [])
        club_info = {
            "fichas_disponiveis": cached.get("fichas"),
            "owner_name": cached.get("owner"),
            "total_members": cached.get("total_members"),
        }
        print("  (dados já carregados no passo 2)")
    else:
        print("  Buscando membros...")
        try:
            r = requests.get(
                f"{BRIDGE_URL}/clubs/{club_id}/members",
                headers=auth_headers,
                timeout=30,
            )
            if r.status_code == 200:
                data = r.json()
                members = data.get("members", [])
                club_info = data.get("club_info", {})
            else:
                print(f"  ✗ Erro {r.status_code}: {r.text[:200]}")
        except Exception as e:
            print(f"  ✗ Erro: {e}")

    if club_info:
        fichas = club_info.get("fichas_disponiveis")
        if fichas is not None:
            print(f"  💰 Caixa do clube: {fichas:,.0f} fichas")
        owner = club_info.get("owner_name")
        if owner:
            print(f"  👑 Dono: {owner} (UID {club_info.get('owner_uid', '?')})")
        total = club_info.get("total_members") or len(members)
        print(f"  👥 Total de membros: {total}")

    online = sum(1 for m in members if m.get("online"))
    donos = [m for m in members if m.get("papel_num") == 1]
    gestores = [m for m in members if m.get("papel_num") == 2]
    super_ags = [m for m in members if m.get("papel_num") == 4]
    agentes = [m for m in members if m.get("papel_num") == 5]
    jogadores = [m for m in members if m.get("papel_num") == 10]

    print(f"  🟢 Online agora: {online}")
    print(
        f"  Hierarquia: {len(donos)} dono, {len(gestores)} gestores, "
        f"{len(super_ags)} super agentes, {len(agentes)} agentes, "
        f"{len(jogadores)} jogadores"
    )

    if members:
        print(f"\n  {'UID':>10}  {'Nome':25s}  {'Papel':15s}  {'Online':>6}  {'Saldo Caixa':>12}")
        print(f"  {'─'*10}  {'─'*25}  {'─'*15}  {'─'*6}  {'─'*12}")

        for m in members[:15]:
            papel_map = {1: "👑 Dono", 2: "⚙️ Gestor", 4: "🦸 SuperAg", 5: "🤝 Agente", 10: "👤 Membro"}
            papel = papel_map.get(m.get("papel_num", 0), f"?({m.get('papel_num')})")
            on = "🟢" if m.get("online") else "⚫"
            saldo = m.get("saldo_caixa") or 0
            saldo_str = f"{saldo:>10,.0f}" if saldo != 0 else "         -"
            nome = (m.get("nome") or "?")[:25]
            uid_val = m.get("uid") or 0
            print(f"  {uid_val:>10}  {nome:25s}  {papel:15s}  {on:>6}  {saldo_str}")

        if len(members) > 15:
            print(f"  ... e mais {len(members) - 15} membros")

    # --- Mesas ---
    print("\n  Buscando mesas...")
    try:
        r = requests.get(
            f"{BRIDGE_URL}/clubs/{club_id}/rooms",
            headers=auth_headers,
            timeout=30,
        )
        if r.status_code != 200:
            print(f"  ✗ Erro {r.status_code}: {r.text[:200]}")
            return

        data = r.json()
        rooms = data.get("rooms", [])
        active = [rm for rm in rooms if rm.get("player_count", 0) > 0]

        print(f"  🎰 Total de mesas: {len(rooms)}  ({len(active)} ativas)")

        if active:
            print(f"\n  {'Mesa':30s}  {'Tipo':10s}  {'Jogadores':>9}  {'Blinds'}")
            print(f"  {'─'*30}  {'─'*10}  {'─'*9}  {'─'*15}")
            for rm in active[:10]:
                nome = (rm.get("name") or "?")[:30]
                tipo = rm.get("game_type", "?")[:10]
                players = rm.get("player_count", 0)
                blinds = rm.get("blinds", "?")
                print(f"  {nome:30s}  {tipo:10s}  {players:>9}  {blinds}")

    except requests.Timeout:
        print("  ✗ Timeout ao buscar mesas")
    except Exception as e:
        print(f"  ✗ Erro: {e}")


def main():
    parser = argparse.ArgumentParser(description="Teste fluxo completo via REST")
    parser.add_argument("--username", default="FastchipsOnline")
    parser.add_argument("--password", default="pppokerchips0000")
    args = parser.parse_args()

    print("╔════════════════════════════════════════════════════════════════╗")
    print("║       TESTE: Fluxo Completo — Login → Clubes → Dados        ║")
    print("╚════════════════════════════════════════════════════════════════╝")

    # 0. Bridge
    bridge_proc = start_bridge()

    try:
        # 1. Login
        login_data = step_login(args.username, args.password)
        auth_headers = {
            "X-PPPoker-Username": args.username,
            "X-PPPoker-Password": args.password,
        }

        # 2. Listar clubes (auto-discovery) + saldos
        logged_uid = int(login_data["uid"])
        clubs = step_list_clubs(auth_headers, logged_uid)

        if not clubs:
            print("\n  Nenhum clube encontrado. O usuário não pertence a nenhum clube?")
            return

        # 3. Para cada clube, buscar detalhes
        header("PASSO 3 — Dados de cada clube")
        for club in clubs:
            step_club_details(club, auth_headers)

        # Resumo final
        header("RESUMO FINAL", char="═")
        print(f"  Usuário: {args.username} (UID {login_data['uid']})")
        print(f"  Clubes: {len(clubs)}")
        for c in clubs:
            rl = ROLE_LABELS.get(c["user_role"], c["user_role"])
            print(f"    • {c['club_name']} — {rl}")
        print(f"\n  ✓ Tudo descoberto automaticamente, sem informar club_id!")

    finally:
        if bridge_proc:
            bridge_proc.kill()
            print("\n  Bridge encerrado.")


if __name__ == "__main__":
    main()
