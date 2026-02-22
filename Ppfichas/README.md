# PPPoker Direct API

Cliente Python para transferência de fichas no PPPoker via API direta — **sem depender do app desktop**.

---

## Como funciona (resumo técnico)

O PPPoker usa dois protocolos:
- **HTTP** (`login.php`) — para autenticação e obtenção do `rdkey`
- **TCP protobuf** (porta 4000) — para operações in-game (transferências, etc.)

O `rdkey` é um token de sessão de 32 chars hex gerado pelo servidor a cada login. Antes precisávamos capturar ele do app rodando. Agora geramos diretamente via HTTP.

---

## Protocolo de login HTTP (engenharia reversa)

### Cadeia de criptografia da senha

```
1. double_md5 = MD5(MD5(senha))           ← hex minúsculo
2. chave_xxtea = MMDDHHMMSS + "d5659066d5"  ← horário de Pequim (UTC+8)
3. pwd_enc = Base64(XXTEA(double_md5, chave_xxtea))
```

**Exemplo de chave XXTEA:** `"0221184530d5659066d5"` (21 de Fev, 18:45:30 horário de Pequim)

A chave tem 20 chars mas o XXTEA usa apenas os primeiros 16 bytes (zero-padded).

### Parâmetros do POST (`/poker/api/login.php`)

| Campo | Valor | Descrição |
|---|---|---|
| `type` | `4` | Email/password login |
| `region` | `2` | Brasil |
| `username` | seu_usuario | Email ou username |
| `password` | `<pwd_enc>` | Senha XXTEA encriptada |
| `t` | `<unix_timestamp>` | **CRÍTICO** — timestamp UTC usado para gerar a chave XXTEA |
| `os` | `mac` | Sistema operacional |
| `distributor` | `0` | — |
| `sub_distributor` | `0` | — |
| `country` | `BR` | — |
| `appid` | `globle` | — |
| `clientvar` | `4.2.75` | Versão do cliente |
| `imei` | `<udid>` | Device ID (qualquer MD5) |
| `lang` | `pt` | — |
| `languagecode` | `pt` | — |
| `platform_type` | `4` | 4 = Mac |
| `app_type` | `1` | — |
| `app_build_code` | `221` | Build number |

> **O campo `t` é a peça crítica.** O servidor usa esse timestamp para reconstruir a chave XXTEA e descriptografar a senha. Sem ele → `code=-3`.

### Endpoint que funciona (sem WAF)

```
https://api.pppoker.club/poker/api/login.php
```

> `cozypoker.net` retorna 405 por WAF da Alibaba Cloud. `api.pppoker.club` serve o mesmo banco (inclui contas Brazil/cozypoker).

### Resposta de sucesso

```json
{
  "code": 0,
  "uid": "13352472",
  "rdkey": "1dca12f864546c6df96f9397d882bdb0",
  "gserver_ip": "usbr-allentry.pppoker.club",
  "gserver_port": "4000",
  "platform": "Brazil"
}
```

---

## Protocolo TCP (porta 4000)

Protocolo binário com framing próprio + Google Protobuf nos payloads.

### Formato de frame

```
[4 bytes big-endian: tamanho total do conteúdo]
[2 bytes big-endian: tamanho do nome da mensagem]
[N bytes: nome da mensagem (ex: "pb.UserLoginREQ")]
[4 bytes: padding \x00\x00\x00\x00]
[protobuf payload]
```

### Mensagens principais

| Mensagem | Descrição |
|---|---|
| `pb.UserLoginREQ` | Autenticação com uid + rdkey |
| `pb.UserLoginRSP` | Resposta do login |
| `pb.HeartBeatREQ` | Keepalive |
| `pb.ClubInfoREQ` | Entrar num clube |
| `pb.AddCoinREQ` | Transferir fichas |
| `pb.ClubAgentPPCoinRSP` | Resposta de transferência |
| `pb.ExportGameDataREQ` | Exportar dados do clube por email |

### Servidores TCP (Brasil)

- `usbr-allentry.pppoker.club:4000` (retornado pelo login HTTP)
- `usbr-allentry.cozypoker.net:4000`
- `47.254.71.136:4000`
- `47.89.212.243:4000`

---

## Uso do script

### Transferência completa (sem o app)

```bash
python3 pppoker_direct_api.py auto \
  --username SEU_USERNAME \
  --password SUA_SENHA \
  --target ID_DO_JOGADOR \
  --amount QUANTIDADE \
  --clube ID_DO_CLUBE \
  --liga ID_DA_LIGA
```

**Exemplo testado:**
```bash
python3 pppoker_direct_api.py auto \
  --username FastchipsOnline \
  --password pppokerchips0000 \
  --target 11470719 \
  --amount 2 \
  --clube 4191918 \
  --liga 3357
```

### Só fazer login HTTP (obter rdkey)

```bash
python3 pppoker_direct_api.py login \
  --username SEU_USERNAME \
  --password SUA_SENHA
```

### Transferência com rdkey manual

```bash
python3 pppoker_direct_api.py transfer \
  --uid 13352472 \
  --rdkey SEU_RDKEY \
  --target 11470719 \
  --amount 100 \
  --clube 4191918 \
  --liga 3357
```

### Teste de conexão e auth

```bash
python3 pppoker_direct_api.py test \
  --uid 13352472 \
  --rdkey SEU_RDKEY
```

### Usar rdkey salvo pelo app local (fallback)

```bash
python3 -c "from pppoker_direct_api import get_local_rdkey; print(get_local_rdkey())"
```

---

## Dados da conta principal

| Campo | Valor |
|---|---|
| Username | `FastchipsOnline` |
| UID (Sender) | `13352472` |
| Clube | `4191918` |
| Liga | `3357` |
| Test UID | `11470719` |

---

## Como foi descoberto (engenharia reversa)

### Arquitetura do app

- Unity IL2CPP + **HybridCLR (huatuo)**: parte do código C# roda como DLL .NET interpretada
- `CryptoUtil`, `LoginManager`, `XXTEA`, `EncryptUtil` estão em DLLs hot-update, não no binário nativo
- O binário nativo ARM64 só tem um stub de dispatch para os métodos HybridCLR

### DLLs extraídas do cache Unity

```
~/Library/Containers/BE0947FF-314D-4128-8658-1C37B6FEF30B/Data/Library/UnityCache/
  Shared/041b479e.../2a975af2.../__data   → PP.Production.PPPoker.dll (offset 0x272734)
  Shared/74fe0d38.../97f72d14.../__data   → PP.Production.Basic.dll  (offset 0x91de0)
```

### Métodos decompilados (IL .NET)

**`CryptoUtil._CryptoPassword`** (PPPoker.dll):
```csharp
MD5(password, useLowerCase=true) → MD5(resultado, useLowerCase=true)
// = MD5(MD5(password)) em hex minúsculo
```

**`CryptoUtil.GetHttpCryptoKey`** (PPPoker.dll):
```csharp
beijingTime = TimeUtil.GetUtcBeijingTime(TimeUtil.GetUtcNow());
return String.Format("{0:D2}{1:D2}{2:D2}{3:D2}{4:D2}{5}",
    month, day, hour, minute, second, "d5659066d5");
```

**`CryptoUtil._XXTeaEncodeForHttp`** (PPPoker.dll):
```csharp
utcNow = TimeUtil.GetUtcNow();
key = GetHttpCryptoKey(utcNow);
encrypted = XXTEA.Encrypt(data, key);   // string, string -> byte[]
return (Convert.ToBase64String(encrypted), utcNow);  // Tuple<string, long>
```

**`XXTEA.Encrypt`** (Basic.dll):
```
ToUInt32Array(data_bytes, includeLength=true)  ← appenda o tamanho original
→ Encrypt(uint32[], key[4])                    ← XXTEA padrão, DELTA=0x9E3779B9
→ ToByteArray(resultado, includeLength=false)  ← bytes brutos sem length
FixKey: UTF-8(key) truncado/padded para 16 bytes exatos
```

**`LoginManager.Login`** (PPPoker.dll):
```csharp
// Para EmailLogin (type=4):
pwd = CryptoPassword(rawPwd);           // double MD5
(pwdEnc, timestamp) = XXTeaEncodeForHttp(pwd);
form.AddData("password", pwdEnc);
form.AddData("t", timestamp);           // ← campo crítico descoberto aqui
// ... outros campos ...
PostTo(fitDomain + "/poker/api/login.php");
```

---

## Dependências Python

```bash
pip install requests urllib3
```

---

## Notas

- O `rdkey` gerado tem validade de sessão — expire se ficar muito tempo sem usar
- O campo `t` deve ser o timestamp Unix **exato** usado para gerar a chave XXTEA
- A janela de tolerância do servidor parece ser de alguns segundos (teste em tempo real)
- `liga_id` padrão: `3357` — confirmar se mudar de liga/federação
- Fichas são em centavos internamente: `amount * 100` no protobuf (o script já faz isso)
