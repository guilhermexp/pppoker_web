# Verificacao por Email no Login (code -15)

## Contexto

Quando uma conta PPPoker tem email vinculado, o login HTTP retorna `code: -15` em vez de autenticar diretamente. Isso exige que o usuario confirme o email recebendo um codigo de verificacao.

**Importante**: O `code -15` **nao envia o codigo automaticamente**. O envio precisa ser disparado por uma chamada separada ao endpoint `send_valid_code.php`.

## Resposta code -15

```json
{
  "code": -15,
  "uid": "7478138",
  "num": 0,
  "login_time": 1772143009,
  "time_left": 0,
  "secret_mail": "v***r@g***.com",
  "remaining_times": 5
}
```

| Campo | Descricao |
|-------|-----------|
| `code` | `-15` = verificacao por email necessaria |
| `uid` | ID do usuario no PPPoker |
| `secret_mail` | Email mascarado (dica para o usuario) |
| `remaining_times` | Tentativas restantes para envio de codigo |
| `num` | Codigos ja enviados nesta sessao |
| `login_time` | Timestamp do servidor |

## Endpoints PPPoker

### 1. Enviar codigo de verificacao

```
GET http://www.pppoker.club/poker/api/mail/send_valid_code.php
```

| Parametro | Tipo | Obrigatorio | Descricao |
|-----------|------|-------------|-----------|
| `mail` | string | Sim | Email **completo** vinculado a conta (nao o mascarado) |
| `valid_type` | int | Sim | `1` = verificacao de email (usado para login). `2` = troca de senha (NAO usar para login) |
| `lang` | string | Nao | Idioma (`pt`, `en`, `ru`, etc.) |

**Respostas:**

```json
// Sucesso - codigo enviado por email
{"code": 0, "msg": "succ"}

// Email nao encontrado no sistema PPPoker
{"code": 268439554, "msg": "mail not found"}

// Parametros faltando ou formato errado
{"code": -1, "msg": "params incorrect"}
```

### 2. Login com codigo de verificacao

```
POST https://api.pppoker.club/poker/api/login.php
```

Mesmos parametros do login normal, acrescentando:

| Parametro | Tipo | Descricao |
|-----------|------|-----------|
| `verifycode` | string | Codigo de 6 digitos recebido por email |

Se o codigo estiver correto, retorna `code: 0` com `uid`, `rdkey`, etc. (login bem-sucedido).

### Outros endpoints de email encontrados

| Endpoint | Descricao |
|----------|-----------|
| `/poker/api/mail/valid_code.php` | Validar codigo (retorna `valid_key`) |
| `/poker/api/mail/valid_mail.php` | Vincular email apos verificacao |
| `/poker/api/mail/change_pw.php` | Alterar senha via email |
| `/poker/api/mail/unlink_mail.php` | Desvincular email da conta |

## Fluxo Completo

```
Browser (Next.js)          API (tRPC)            Bridge (FastAPI)        PPPoker
     |                        |                       |                     |
     |-- login(user, pass) -->|                       |                     |
     |                        |-- POST /auth/login -->|                     |
     |                        |                       |-- login.php ------->|
     |                        |                       |<-- code: -15 -------|
     |                        |                       |    secret_mail,uid  |
     |                        |<-- needs_verify ------|                     |
     |<-- PRECONDITION_FAILED |                       |                     |
     |    { secret_mail, uid }|                       |                     |
     |                        |                       |                     |
     | [Tela: "Verificacao por email"]                                      |
     | [Usuario digita email completo]                                      |
     |                        |                       |                     |
     |-- sendVerificationCode |                       |                     |
     |   (email) ------------>|                       |                     |
     |                        |-- POST /auth/send- -->|                     |
     |                        |   verification-code   |                     |
     |                        |                       |-- GET send_valid -->|
     |                        |                       |    code.php         |
     |                        |                       |<-- code: 0 ---------|
     |                        |<-- success -----------|                     |
     |<-- codigo enviado -----|                       |                     |
     |                        |                       |                     |
     | [Usuario digita codigo recebido por email]                           |
     |                        |                       |                     |
     |-- login(user, pass, -->|                       |                     |
     |   verifyCode)          |                       |                     |
     |                        |-- POST /auth/login -->|                     |
     |                        |   { verify_code }     |                     |
     |                        |                       |-- login.php ------->|
     |                        |                       |   + verifycode      |
     |                        |                       |<-- code: 0 ---------|
     |                        |                       |    uid, rdkey       |
     |                        |<-- success -----------|                     |
     |<-- step: select_club --|                       |                     |
     |    { clubs[] }         |                       |                     |
```

## Implementacao

### Bridge (`Ppfichas/pppoker_direct_api.py`)

```python
def send_verification_code(email: str, lang: str = 'pt') -> dict:
    """Envia codigo de verificacao para login (code -15)."""
    url = "http://www.pppoker.club/poker/api/mail/send_valid_code.php"
    params = {'mail': email, 'valid_type': '1', 'lang': lang}
    resp = requests.get(url, params=params, timeout=30)
    result = resp.json()
    if result.get('code') == 0:
        return {'success': True, 'message': 'Verification code sent'}
    elif result.get('msg') == 'mail not found':
        return {'success': False, 'error': 'Email not found...'}
    ...
```

### Bridge REST (`Ppfichas/pppoker_api_server.py`)

```
POST /auth/send-verification-code
Body: { "email": "usuario@gmail.com", "lang": "pt" }
Resposta: { "success": true, "message": "Code sent" }
Erro: 400 { "detail": "Email not found..." }
```

### tRPC (`apps/api/src/trpc/routers/pppoker-auth.ts`)

Duas mutations relevantes:

| Mutation | Input | Descricao |
|----------|-------|-----------|
| `pppokerAuth.login` | `{ username, password, clubId?, verifyCode? }` | Login. Se code -15, lanca `PRECONDITION_FAILED` com JSON `{ type, secret_mail, uid }` |
| `pppokerAuth.sendVerificationCode` | `{ email }` | Dispara envio do codigo para o email |

### Frontend (`apps/dashboard/src/components/pppoker-sign-in.tsx`)

Fluxo de 3 telas:

| Tela | Estado | Descricao |
|------|--------|-----------|
| **Credenciais** | `credentials` | Campos usuario + senha |
| **Verificacao** | `email-verify` | Campo email + botao "Enviar codigo" + campo codigo |
| **Selecao de clube** | `select-club` | Lista de clubes disponiveis |

A tela de verificacao:
- Mostra o email mascarado como dica (ex: `v***r@g***.com`)
- Botao "Enviar codigo" com cooldown de 60 segundos
- Campo do codigo so aparece apos envio bem-sucedido
- Mensagem de confirmacao verde apos envio

## Engenharia Reversa

### Como o endpoint foi descoberto

1. **Analise de trafego (tcpdump)**: Capturamos DNS e TCP quando o usuario clicou "Receber codigo" no app PPPoker. Identificamos `www.pppoker.club` (IP `170.33.96.110`) como servidor de verificacao.

2. **Analise do binario (il2cpp)**: Extraimos strings do metadata do app Unity em `/Applications/PPPoker.app/.../global-metadata.dat`:
   - Endpoint: `/poker/api/mail/send_valid_code.php`
   - Funcoes: `AccountManager.GetVerificationCode(mail)`, `OnGetVerifyCodeCallback`
   - Parametros: `mail`, `code`, `type`, `email`, `lang`, `region`

3. **Projeto open source**: [vraestoren/pppoker.py](https://github.com/vraestoren/pppoker.py) confirmou os parametros exatos:
   ```python
   def get_verification_code(self, email, valid_type=1):
       return self.session.get(
           f"{self.public_api}/poker/api/mail/send_valid_code.php"
           f"?mail={email}&valid_type={valid_type}&lang={self.language}"
       ).json()
   ```

4. **Testes de parametro**: `valid_type=1` envia email de "Solicitar vinculo de e-mail" (verificacao correta para login). `valid_type=2` envia email de "Redefinir senha" (errado para login).

### Detalhes tecnicos do PPPoker

- **Servidores**: `api.pppoker.club` (login), `www.pppoker.club` (verificacao email)
- **Protecao**: Aliyun DDoS (`aliyunddos0030.com`) bloqueia proxies reversos
- **App desktop**: iOS app rodando em macOS via Apple Silicon (Unity il2cpp)
- **User-Agent**: `UnityPlayer/2021.3.33f1 (UnityWebRequest/1.0, libcurl/8.5.0-DEV)`
- **Protocolo**: HTTP GET para envio de codigo (nao HTTPS), HTTPS POST para login
