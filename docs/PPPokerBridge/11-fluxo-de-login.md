# Fluxo de Login PPPoker

## Visao geral

O login no Mid Poker usa credenciais do PPPoker em um fluxo de 2 etapas:

1. **Credenciais** — usuario envia login/senha do PPPoker
2. **Selecao de clube** — sistema retorna clubes disponiveis, usuario escolhe um

Cada clube selecionado cria uma **organizacao (team) isolada** no Supabase. Dados de um clube nunca se misturam com outro.

## Arquitetura

```
Browser (Next.js)          API (Hono/tRPC)          Bridge (FastAPI)         PPPoker
     |                          |                        |                      |
     |-- login(user, pass) ---->|                        |                      |
     |                          |-- POST /auth/login --->|                      |
     |                          |                        |-- HTTP login ------->|
     |                          |                        |<-- uid, rdkey -------|
     |                          |<-- { uid } ------------|                      |
     |                          |                        |                      |
     |                          |-- GET /clubs --------->|                      |
     |                          |                        |-- TCP list_clubs --->|
     |                          |                        |<-- clubs[] ----------|
     |                          |<-- { clubs[] } --------|                      |
     |<-- step: select_club ----|                        |                      |
     |    { clubs[], pppokerUid }                        |                      |
     |                          |                        |                      |
     |-- login(user,pass,club)->|                        |                      |
     |                          |-- [cria/busca team] -->| Supabase             |
     |                          |-- [cria/busca user] -->|                      |
     |                          |-- [link user<>team] -->|                      |
     |                          |-- [salva conexao] ---->|                      |
     |<-- step: done ---------- |                        |                      |
     |    { accessToken,        |                        |                      |
     |      refreshToken,       |                        |                      |
     |      clubId }            |                        |                      |
     |                          |                        |                      |
     |-- setSession(tokens) --->| Supabase Auth          |                      |
     |-- redirect "/" --------->|                        |                      |
```

## Componentes

### Frontend

**`apps/dashboard/src/components/pppoker-sign-in.tsx`**

Componente React com 2 telas:

- **Tela 1 (credentials)**: campos usuario + senha + codigo de verificacao (opcional)
- **Tela 2 (select-club)**: lista de clubes com avatar, nome, papel, contagem de membros

Regras da selecao de clubes:
- Apenas `dono` e `gestor` podem entrar (outros papeis ficam desabilitados com label "Em breve")
- Clube usado por ultimo aparece primeiro (salvo em `localStorage` como `pppoker_last_club_id`)
- Ordenacao: ultimo usado > gerenciaveis (dono/gestor) > demais

### Backend (tRPC)

**`apps/api/src/trpc/routers/pppoker-auth.ts`**

Mutation `pppokerAuth.login` com 2 comportamentos:

#### Sem `clubId` (etapa 1)

1. Envia credenciais ao bridge (`POST /auth/login`)
2. Se `needs_verify: true`, retorna erro `PRECONDITION_FAILED` com mensagem sobre codigo de email
3. Se sucesso, busca clubes via `GET /clubs` no bridge
4. Retorna `{ step: "select_club", pppokerUid, clubs[] }`

#### Com `clubId` (etapa 2)

1. Repete validacao de credenciais no bridge
2. Busca clubes via `GET /clubs`
3. Cria ou busca usuario Supabase mapeado:
   - Email: `pppoker_{uid}@midpoker.internal`
   - Senha: `ppk_{uid}_{password_prefix}`
4. Busca ou cria **team dedicado** para o clube (ver isolamento abaixo)
5. Salva conexao em `pppoker_club_connections`
6. Atualiza poker settings no team (`poker_platform`, `poker_club_id`, etc.)
7. Retorna `{ step: "done", accessToken, refreshToken, pppokerUid, clubId }`

### Bridge (FastAPI)

**`Ppfichas/pppoker_api_server.py`** (porta 3102)

Endpoints usados no login:

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `POST /auth/login` | POST | Valida credenciais via HTTP no PPPoker. Retorna `uid`, `rdkey`, `gserver_ip`. Suporta `verify_code` para 2FA. |
| `GET /clubs` | GET | Lista clubes do usuario. Requer headers `X-PPPoker-Username` e `X-PPPoker-Password`. Usa TCP session pool com heartbeat. |

## Isolamento: 1 Team por Clube

Cada clube que o usuario seleciona cria uma organizacao (team) separada no Supabase. Isso garante isolamento total de dados.

### Funcao `findOrCreateTeamForClub`

```
1. Busca teams que o usuario ja pertence (users_on_team)
2. Filtra por poker_club_id == clubId selecionado
3. Se encontrou → reutiliza o team existente
4. Se nao encontrou → cria novo team
   4a. Insere em `teams` com nome do clube
   4b. Insere link em `users_on_team` (role: owner)
   4c. Retorna o novo team_id
```

### Tabelas envolvidas

| Tabela | Papel |
|--------|-------|
| `auth.users` | Usuario Supabase (email mapeado `pppoker_{uid}@midpoker.internal`) |
| `public.users` | Perfil do usuario (full_name, avatar, team_id ativo) |
| `teams` | Organizacao. Cada clube tem 1 team. Colunas poker: `poker_platform`, `poker_club_id`, `poker_club_name`, `poker_entity_type`, `poker_liga_id` |
| `users_on_team` | Vinculo usuario <> team com `role` (owner/member) |
| `pppoker_club_connections` | Credenciais do bridge por team+club. Colunas: `team_id`, `club_id`, `club_name`, `pppoker_username`, `pppoker_password`, `sync_status` |

### Exemplo pratico

Usuario `FastchipsOnline` (uid 13352472) com 5 clubes:

```
Login com clube 4366162 (XperiencePoker):
  → Team 95899e74 (dedicado, poker_club_id=4366162)
  → users_on_team: role=owner
  → pppoker_club_connections: sync_status=active

Login com clube 4210947 (Xperience):
  → Team 647fd34b (NOVO, dedicado, poker_club_id=4210947)
  → users_on_team: role=owner
  → pppoker_club_connections: sync_status=active

Dados do clube 4366162 ficam isolados no team 95899e74.
Dados do clube 4210947 ficam isolados no team 647fd34b.
```

## Verificacao por Email (code -15)

Quando a conta PPPoker tem email vinculado, o login retorna `code: -15`. O codigo de verificacao **nao e enviado automaticamente** — o usuario precisa solicitar o envio separadamente.

Documentacao completa do fluxo: **[13-verificacao-email-login.md](./13-verificacao-email-login.md)**

Resumo:

1. Login retorna `code -15` com `secret_mail` (email mascarado, ex: `v***r@g***.com`)
2. Frontend mostra tela de verificacao por email
3. Usuario digita o email completo vinculado a conta
4. Sistema envia codigo via `GET send_valid_code.php?mail={email}&valid_type=2`
5. Usuario digita o codigo recebido
6. Sistema reenvia login com `verifyCode` → segue para selecao de clube

## Troca de Clube (Re-login)

Para trocar de clube, o usuario faz logout e login novamente selecionando outro clube. O sistema:

1. Encontra o team dedicado do novo clube (ou cria um novo)
2. Atualiza `users.team_id` para o novo team
3. Retorna novos tokens de sessao
4. Frontend salva `pppoker_last_club_id` no localStorage para acesso rapido

## Poker Settings Auto-preenchidos

Ao completar o login (etapa 2), o sistema atualiza automaticamente no team:

| Coluna | Valor |
|--------|-------|
| `poker_platform` | `"pppoker"` |
| `poker_club_id` | ID numerico do clube (string) |
| `poker_club_name` | Nome do clube retornado pelo bridge |
| `poker_entity_type` | `"clube_liga"` se tem liga_id, senao `"clube_privado"` |
| `poker_liga_id` | ID da liga (se aplicavel) |

Esses dados aparecem automaticamente na pagina Configuracoes > Poker do dashboard.

## Observacoes tecnicas

### users_on_team sem unique constraint

A tabela `users_on_team` tem PK composta `(user_id, team_id, id)` — nao tem constraint unique em `(user_id, team_id)` sozinho. Por isso o codigo usa **check-then-insert** em vez de upsert:

```typescript
const { data: existingLink } = await adminDb
  .from("users_on_team")
  .select("id")
  .eq("user_id", userId)
  .eq("team_id", newTeam.id)
  .maybeSingle();

if (!existingLink) {
  await adminDb.from("users_on_team").insert({
    user_id: userId,
    team_id: newTeam.id,
    role: "owner",
  });
}
```

### Cache de login no bridge

O bridge cacheia resultados de HTTP login por 10 minutos (`LOGIN_CACHE_TTL = 600`). Sessoes TCP sao mantidas com heartbeat a cada 25s e forcam reconexao apos 30 minutos.

### Senha mapeada

A senha do Supabase e derivada: `ppk_{uid}_{password_prefix}` (primeiros 8 chars da senha PPPoker). Isso permite que o mesmo usuario com senhas diferentes (ex: mudou a senha) ainda consiga criar sessao.
