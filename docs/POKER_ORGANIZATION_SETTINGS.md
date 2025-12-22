# Poker Organization Settings

Configuração da identidade da organização no ecossistema de poker online.

## Hierarquia do Mercado de Poker

```
Plataforma (PPPoker, Suprema, Poker Bros, etc.)
└── Super Liga (SU) - união de ligas
    └── Liga - união de clubes, gerencia lobby compartilhado
        └── Clube - pode ser privado ou vinculado a liga
```

## Tipos de Entidade

| Tipo | Descrição |
|------|-----------|
| `clube_privado` | Clube independente com lobby próprio |
| `clube_liga` | Clube filiado a uma liga |
| `liga` | Gerencia vários clubes |
| `ambos` | Opera como liga E como clube simultaneamente |

## Plataformas Suportadas

- PPPoker
- Suprema Poker
- Poker Bros
- Fish Poker
- X Poker
- Outro

---

## Database Schema

### Campos na tabela `teams`

```sql
poker_platform       -- Plataforma utilizada (enum)
poker_entity_type    -- Tipo de entidade (enum)
poker_club_id        -- ID do clube na plataforma
poker_club_name      -- Nome do clube
poker_liga_id        -- ID da liga na plataforma
poker_liga_name      -- Nome da liga
poker_su_id          -- ID da Super Liga
poker_su_name        -- Nome da Super Liga
poker_parent_liga_team_id -- Referência ao team da Liga (se clube em liga)
```

### Tabela `poker_team_clubs`

Armazena os clubes vinculados a uma Liga.

```sql
CREATE TABLE poker_team_clubs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  liga_team_id UUID REFERENCES teams(id),  -- Liga dona
  club_id TEXT NOT NULL,                    -- ID do clube na plataforma
  club_name TEXT,                           -- Nome do clube
  linked_team_id UUID REFERENCES teams(id), -- Conta do clube no sistema (opcional)
  UNIQUE(liga_team_id, club_id)
);
```

---

## API Endpoints (tRPC)

### `team.getPokerSettings`

Retorna as configurações de poker do team atual.

**Response:**
```typescript
{
  pokerPlatform: "pppoker" | "suprema" | "pokerbros" | "fishpoker" | "xpoker" | "other" | null,
  pokerEntityType: "clube_privado" | "clube_liga" | "liga" | "ambos" | null,
  pokerClubId: string | null,
  pokerClubName: string | null,
  pokerLigaId: string | null,
  pokerLigaName: string | null,
  pokerSuId: string | null,
  pokerSuName: string | null,
  pokerParentLigaTeamId: string | null,
}
```

### `team.updatePokerSettings`

Atualiza as configurações de poker.

**Input:**
```typescript
{
  pokerPlatform?: string | null,
  pokerEntityType?: string | null,
  pokerClubId?: string | null,
  pokerClubName?: string | null,
  pokerLigaId?: string | null,
  pokerLigaName?: string | null,
  pokerSuId?: string | null,
  pokerSuName?: string | null,
  pokerParentLigaTeamId?: string | null,
}
```

### `team.getLinkedClubs`

Lista os clubes vinculados à liga.

**Response:**
```typescript
{
  clubs: Array<{
    id: string,
    clubId: string,
    clubName: string | null,
    linkedTeamId: string | null,
    linkedTeamName: string | null,
    createdAt: string,
  }>,
  total: number,
}
```

### `team.addLinkedClub`

Adiciona um clube à liga.

**Input:**
```typescript
{
  clubId: string,        // Obrigatório
  clubName?: string,     // Opcional
  linkedTeamId?: string, // UUID do team no sistema (opcional)
}
```

### `team.removeLinkedClub`

Remove um clube da liga.

**Input:**
```typescript
{
  clubId: string,
}
```

### `team.searchLigas`

Busca ligas disponíveis para vinculação.

**Response:**
```typescript
Array<{
  id: string,
  name: string,
  pokerLigaId: string | null,
  pokerLigaName: string | null,
  pokerPlatform: string | null,
}>
```

---

## UI Components

### `PokerSettings`

Componente principal de configuração. Localizado em:
```
apps/dashboard/src/components/poker-settings.tsx
```

Campos condicionais baseados no tipo de entidade:
- **Clube** (clube_privado, clube_liga, ambos): Mostra ID/Nome do clube
- **Liga** (liga, ambos): Mostra ID/Nome da liga + Super Liga
- **Clube em Liga** (clube_liga): Mostra seção de liga vinculada

### `PokerLinkedClubs`

Gerenciamento de clubes para Ligas. Localizado em:
```
apps/dashboard/src/components/poker-linked-clubs.tsx
```

Funcionalidades:
- Tabela de clubes vinculados
- Adicionar clube (ID + Nome)
- Remover clube
- Indicador de conta vinculada no sistema

---

## Hooks

```typescript
// apps/dashboard/src/hooks/use-team.ts

usePokerSettingsQuery()        // Query das configurações
usePokerSettingsMutation()     // Mutation para atualizar
useLinkedClubsQuery()          // Query dos clubes vinculados
useAddLinkedClubMutation()     // Mutation para adicionar clube
useRemoveLinkedClubMutation()  // Mutation para remover clube
useSearchLigasQuery()          // Query para buscar ligas
```

---

## Migration

Arquivo: `packages/db/migrations/0002_poker_team_settings.sql`

Para aplicar:
```bash
# Via Supabase CLI
supabase db push

# Ou diretamente no banco
psql $DATABASE_URL -f packages/db/migrations/0002_poker_team_settings.sql
```

---

## Fluxo de Uso

### Clube Privado
1. Seleciona plataforma
2. Seleciona "Clube Privado"
3. Informa ID e Nome do clube
4. Salva

### Clube em Liga
1. Seleciona plataforma
2. Seleciona "Clube em Liga"
3. Informa ID e Nome do clube
4. Informa ID e Nome da liga vinculada
5. Salva

### Liga
1. Seleciona plataforma
2. Seleciona "Liga"
3. Informa ID e Nome da liga
4. (Opcional) Informa Super Liga
5. Salva
6. Adiciona clubes vinculados na seção abaixo

### Liga + Clube (Ambos)
1. Seleciona plataforma
2. Seleciona "Liga + Clube"
3. Informa dados do clube
4. Informa dados da liga
5. Salva
6. Gerencia clubes vinculados

---

## Arquivos Relacionados

```
packages/db/
├── src/schema.ts                           # Schema Drizzle
└── migrations/0002_poker_team_settings.sql # Migration SQL

apps/api/src/
├── schemas/poker/
│   ├── index.ts
│   └── team-settings.ts                    # Zod schemas
└── trpc/routers/team.ts                    # Endpoints tRPC

apps/dashboard/src/
├── components/
│   ├── poker-settings.tsx                  # UI principal
│   └── poker-linked-clubs.tsx              # Gerenciamento de clubes
├── hooks/use-team.ts                       # React Query hooks
└── app/[locale]/(app)/(sidebar)/settings/page.tsx  # Página de settings
```
