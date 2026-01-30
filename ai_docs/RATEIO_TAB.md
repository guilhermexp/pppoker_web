# Aba Rateio - Sistema de Distribuicao de Meta por Grupo

**Data:** 2026-01-30
**Modulo:** SuperUnion (SU) - Modal de Validacao de Importacao
**Status:** Implementado

---

## Visao Geral

A aba **Rateio** faz parte do modal de validacao de importacao SU (SuperUnion). Ela resolve o problema de distribuicao de metas de GTD (garantido) entre diferentes grupos de ligas, substituindo o sistema anterior de valores hardcoded (BR=60% / SA=40%) por um sistema totalmente configuravel via banco de dados.

**Problema anterior:** A distribuicao de overlay era fixa em dois grupos (BR e SA) com percentuais fixos no codigo.

**Solucao:** Sistema de 3 camadas (Meta Groups + Time Slots + Club Metas) que permite criar grupos dinamicos, associar ligas, definir faixas de horario com percentuais diferentes e configurar metas granulares por clube/semana.

**Localizacao:** A aba aparece dentro do modal de validacao quando o usuario importa uma planilha de Liga (SU).

---

## Arquitetura

### 1. Database (4 tabelas)

**Migration:** `packages/db/migrations/0009_poker_su_meta_tables.sql`

| Tabela | Descricao |
|--------|-----------|
| `poker_su_meta_groups` | Grupos nomeados com percentual do GTD total (ex: "BR" = 60%) |
| `poker_su_meta_group_members` | Associacao de SuperUnions a grupos (constraint: 1 SU por grupo) |
| `poker_su_meta_group_time_slots` | Faixas horarias dentro de um grupo com percentuais diferenciados |
| `poker_su_club_metas` | Metas granulares por clube/semana/dia/horario (target de jogadores ou buyins) |

Todas as tabelas possuem:
- **RLS** (Row Level Security) via `private.get_teams_for_authenticated_user()`
- **Triggers** de `updated_at` automatico
- **Indices** otimizados para queries por `team_id`, `is_active`, `week_year/week_number`
- Isolamento por `team_id` (multi-tenant)

#### Constraints importantes

- `poker_su_meta_groups`: UNIQUE(team_id, name) — nao pode haver dois grupos com mesmo nome
- `poker_su_meta_group_members`: UNIQUE(team_id, super_union_id) — cada SuperUnion so pode pertencer a 1 grupo
- `poker_su_club_metas`: UNIQUE composta por (team_id, super_union_id, club_id, week_year, week_number, day_of_week, hour_start, hour_end, target_type)

### 2. Backend (Router tRPC)

**Arquivo:** `apps/api/src/trpc/routers/su/metas.ts`

Router `suMetasRouter` com 16 procedures organizadas em 4 namespaces:

**Meta Groups (5 procedures)**
| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `metaGroups.list` | query | Lista grupos (filtro opcional `activeOnly`) |
| `metaGroups.getById` | query | Detalhes do grupo com members + timeSlots |
| `metaGroups.create` | mutation | Cria grupo + membros opcionais (com rollback) |
| `metaGroups.update` | mutation | Atualiza nome/descricao/percentual/status |
| `metaGroups.delete` | mutation | Remove grupo (CASCADE nos members e slots) |

**Meta Group Members (3 procedures)**
| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `metaGroupMembers.add` | mutation | Adiciona 1 membro (valida duplicata) |
| `metaGroupMembers.remove` | mutation | Remove 1 membro por ID |
| `metaGroupMembers.bulk` | mutation | Substitui todos os membros de um grupo |

**Meta Group Time Slots (4 procedures)**
| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `metaGroupTimeSlots.list` | query | Lista slots de um grupo (ordenados por hour_start) |
| `metaGroupTimeSlots.create` | mutation | Cria slot (valida overlap com slots ativos) |
| `metaGroupTimeSlots.update` | mutation | Atualiza slot (re-valida overlap se horarios mudam) |
| `metaGroupTimeSlots.delete` | mutation | Remove slot |

**Club Metas (4 procedures)**
| Procedure | Tipo | Descricao |
|-----------|------|-----------|
| `clubMetas.getByWeek` | query | Lista metas de uma semana (filtro opcional por SU/clube) |
| `clubMetas.create` | mutation | Cria meta (valida unicidade composta) |
| `clubMetas.delete` | mutation | Remove meta |
| `clubMetas.bulkCreate` | mutation | Upsert em massa |
| `clubMetas.inheritFromPrevious` | mutation | Copia metas da semana anterior (upsert) |

**Validacao de negocio no backend:**
- `validateGroupPercentSum()` — Impede que a soma dos percentuais dos grupos ativos exceda 100%
- Validacao de overlap de time slots (impede conflito de horarios no mesmo grupo)
- Rollback manual na criacao de grupo: se a insercao de membros falha, o grupo e deletado

### 3. Frontend (10 componentes React)

**Orquestrador:** `apps/dashboard/src/components/league/validation-tabs/rateio-tab.tsx`

**Pasta de componentes:** `apps/dashboard/src/components/league/validation-tabs/rateio/`

| Componente | Arquivo | Descricao |
|------------|---------|-----------|
| `LeagueRateioTab` | `rateio-tab.tsx` | Orquestrador com 3 sub-abas + queries de dados |
| `RateioAnalysis` | `rateio/rateio-analysis.tsx` | Calculo dinamico de overlay por grupo e time slot |
| `MetaGroupsSection` | `rateio/meta-groups-section.tsx` | CRUD de grupos com cards expandiveis |
| `MetaGroupForm` | `rateio/meta-group-form.tsx` | Dialog de criar/editar grupo |
| `MetaGroupMembers` | `rateio/meta-group-members.tsx` | Listagem e add/remove de membros (ligas) |
| `TimeSlotsSection` | `rateio/time-slots-section.tsx` | CRUD de faixas horarias dentro de um grupo |
| `TimeSlotForm` | `rateio/time-slot-form.tsx` | Dialog de criar/editar time slot |
| `ClubMetasSection` | `rateio/club-metas-section.tsx` | CRUD de metas por clube/semana |
| `ClubMetaForm` | `rateio/club-meta-form.tsx` | Dialog de criar meta de clube |
| *(utils)* | `rateio/rateio-utils.ts` | Types, formatadores e FALLBACK_GROUPS |

---

## Estrutura de Arquivos

```
apps/
  api/
    src/trpc/routers/su/
      metas.ts                          # Router tRPC com 16 procedures
  dashboard/
    src/components/league/validation-tabs/
      rateio-tab.tsx                    # Orquestrador (entry point)
      rateio/
        rateio-analysis.tsx             # Sub-aba Analise
        rateio-utils.ts                 # Types + utils + FALLBACK_GROUPS
        meta-groups-section.tsx         # Sub-aba Grupos Meta
        meta-group-form.tsx             # Form dialog (create/edit grupo)
        meta-group-members.tsx          # Gerenciamento de membros
        time-slots-section.tsx          # Gerenciamento de time slots
        time-slot-form.tsx              # Form dialog (create/edit slot)
        club-metas-section.tsx          # Sub-aba Metas Clube
        club-meta-form.tsx              # Form dialog (create meta)
packages/
  db/
    migrations/
      0009_poker_su_meta_tables.sql     # DDL das 4 tabelas + RLS + triggers
```

---

## Sub-abas

### 1. Analise (`RateioAnalysis`)

Calcula dinamicamente a distribuicao de overlay por grupo a partir dos dados da importacao.

**Dados de entrada:**
- `geralPPST` — Blocos gerais da planilha PPST (para gap planilha)
- `jogosPPST` — Lista de jogos/torneios PPST (para calculo de overlay)
- `metaGroups` — Grupos carregados do DB (ou FALLBACK se vazio)

**Logica de calculo:**
1. Itera todos os jogos PPST com GTD > 0
2. Calcula overlay por torneio: `buyinLiquido - GTD` (se negativo = overlay)
3. Para cada jogador com overlay, identifica a qual grupo pertence via `superUnionId`
4. Acumula buyin liquido por grupo e por time slot (matcheando hora do torneio)
5. Calcula `expected` (% do grupo * GTD total overlay) vs `reached` (buyin acumulado)
6. Classifica status: `success` (gap <= 0%), `warning` (gap <= 20%), `danger` (gap > 20%)

**Visualizacao:**
- Cards por grupo com cor baseada no status (verde/amarelo/vermelho)
- Breakdown por liga dentro de cada grupo
- Breakdown por time slot quando configurados
- Comparativo entre gap da planilha e overlay calculado
- Tabela de torneios com overlay (ordenados por valor)
- Opcao de expandir todos os torneios GTD

### 2. Grupos Meta (`MetaGroupsSection`)

CRUD completo de grupos de meta com interface de cards expandiveis. Quando nao ha grupos no DB, exibe cards read-only dos grupos fallback.

**Funcionalidades:**
- Criar grupo com nome, descricao e percentual
- Editar grupo (nome, percentual, ativar/desativar)
- Remover grupo
- Badge mostrando total de percentuais (aviso se > 100%)
- Expandir card para ver membros e time slots

**Modo fallback (DB vazio):**
- Recebe prop `fallbackGroups` do orquestrador
- Renderiza cards com borda tracejada (`border-dashed`) e badge "Fallback" em amber
- Membros sempre visiveis (expandidos) como badges secundarias
- Sem botoes de edit/delete (read-only)
- `totalPercent` calculado a partir dos fallback groups
- Botao "+ Novo Grupo" continua visivel para criar o primeiro grupo real

**Membros (`MetaGroupMembers`):**
- Lista membros atuais do grupo
- Adiciona novas ligas ao grupo (dropdown filtra ligas visiveis do import)
- Remove membros individualmente
- Constraint: cada SuperUnion so pode pertencer a 1 grupo

**Time Slots (`TimeSlotsSection`):**
- Define faixas de horario com meta % especifica dentro do grupo
- Ex: "Manha 10h-14h = 15%", "Tarde 14h-20h = 25%"
- Valida que nao haja overlap de horarios no mesmo grupo

### 3. Metas Clube (`ClubMetasSection`)

Metas granulares por clube especifico, por semana. Quando nao ha metas no DB e o sistema esta em modo fallback, exibe os clubes da importacao organizados por grupo.

**Funcionalidades:**
- Navegacao por semana (setas prev/next com formato S{num}/{ano})
- Criar meta individual para um clube (tipo: jogadores ou buyins)
- Filtro por dia da semana e faixa horaria
- Herdar metas da semana anterior (copia todas as metas da semana N-1 para a semana N via upsert)
- Remover metas individuais
- Agrupamento visual por SuperUnion + Clube

**Modo fallback (DB vazio):**
- Recebe props `metaGroups` e `usingFallback` do orquestrador
- Memo `clubsByGroup` organiza `availableClubs` por grupo via matching de `superUnionId` com `group.members`
- Renderiza cards tracejados por grupo (BR, SA) com lista de clubes pertencentes
- Secao "Sem Grupo" para clubes cujo `superUnionId` nao pertence a nenhum grupo
- Cada clube exibe: nome, liga e IDs (superUnionId/clubeId)
- Toolbar de navegacao semanal e botoes funcionais continuam visiveis

**Dados contextuais:**
- `availableClubs` extraidos dos dados de importacao (`jogosPPST`)
- `metaGroups` (analysisGroups) para organizar clubes por grupo
- Lookup map para exibir nomes amigaveis dos clubes

---

## Fluxo de Dados

```
Planilha Excel (import)
    |
    v
ParsedLeagueGeralPPSTBloco[]   ParsedLeagueJogoPPST[]
    |                                |
    |     +--------------------------+
    |     |
    v     v
LeagueRateioTab (orquestrador)
    |
    +--- extrai availableLeagues (de geralPPST: ligaId, ligaNome, superUnionId)
    +--- extrai availableClubs (de jogosPPST: clubeId, clubeNome, ligaId)
    +--- fetch dbGroups via tRPC (metaGroups.list)
    +--- fetch detalhes de cada grupo via tRPC (metaGroups.getById) em paralelo
    +--- monta analysisGroups (MetaGroupData[]) com members + timeSlots
    |    (se DB vazio, usa FALLBACK_GROUPS)
    |
    +---> RateioAnalysis
    |     recebe: geralPPST, jogosPPST, analysisGroups
    |     calcula: overlay por grupo, por liga, por time slot
    |
    +---> MetaGroupsSection
    |     recebe: availableLeagues, fallbackGroups (se DB vazio)
    |     CRUD: grupos, membros, time slots
    |     fallback: cards read-only com membros expandidos
    |
    +---> ClubMetasSection
          recebe: availableClubs, metaGroups, usingFallback
          CRUD: metas por clube/semana
          fallback: clubes organizados por grupo (via superUnionId)
```

---

## Backward Compatibility (FALLBACK_GROUPS)

Definido em `rateio/rateio-utils.ts`:

Quando nao ha grupos configurados no banco (`dbGroups` vazio), o sistema usa `FALLBACK_GROUPS` automaticamente:

| Grupo | Percentual | SuperUnions (IDs) |
|-------|-----------|-------------------|
| BR | 60% | 1675, 1765, 2101, 2448 (Evolution 1-4) |
| SA | 40% | 1534, 1578, 2006, 2126, 2343 (Colombiana, Latinos, Evolution., Nuts, Golden) |

**Estrategia de migracao:**
1. Sistema funciona normalmente com fallback enquanto nenhum grupo e criado
2. Ao criar o primeiro grupo no DB, o fallback deixa de ser usado
3. As sub-abas "Grupos Meta" e "Metas Clube" exibem cards visuais read-only (borda tracejada, badge "Fallback") quando DB esta vazio, mostrando os grupos e clubes da importacao
4. Nao ha migracao de dados: o fallback e apenas em memoria no frontend

**Comportamento por cenario:**

| Cenario | Grupos Meta | Metas Clube |
|---------|-------------|-------------|
| DB vazio, com import | Cards fallback BR/SA com ligas | Clubes do import agrupados por BR/SA |
| DB vazio, sem import | Cards fallback BR/SA vazios | Mensagem "sem metas" |
| DB com grupos | Cards editaveis do DB | Metas do DB |
| DB com grupos, sem metas | Cards editaveis do DB | Clubes agrupados por grupo do DB |

---

## Validacoes

### Backend (metas.ts)

| Regra | Descricao | Erro |
|-------|-----------|------|
| Soma % <= 100 | Soma dos percentuais de todos os grupos ativos nao pode exceder 100% | `BAD_REQUEST` |
| Nome unico | Nao pode haver dois grupos com mesmo nome no mesmo team | `CONFLICT` (23505) |
| SU unica por grupo | Cada SuperUnion so pode pertencer a 1 grupo | `CONFLICT` (23505) |
| Overlap de time slots | Horarios de slots ativos no mesmo grupo nao podem se sobrepor | `CONFLICT` |
| Meta unica composta | Club meta tem constraint unica por (team, SU, club, week, day, hour, type) | `CONFLICT` (23505) |

### Frontend (rateio-analysis.tsx)

| Regra | Descricao | Indicador Visual |
|-------|-----------|------------------|
| Gap <= 0% | Meta atingida | Verde (`success`) |
| Gap 1-20% | Proximo da meta | Amarelo (`warning`) |
| Gap > 20% | Meta distante | Vermelho (`danger`) |

---

## Types Principais

```typescript
// rateio-utils.ts

type MetaGroupData = {
  id: string;
  name: string;
  metaPercent: number;
  isActive: boolean;
  members: { superUnionId: number; displayName?: string | null }[];
  timeSlots: {
    id: string;
    name: string;
    hourStart: number;
    hourEnd: number;
    metaPercent: number;
    isActive: boolean;
  }[];
};

type AvailableLeague = {
  ligaId: number;
  ligaNome: string;
  superUnionId: number | null;
};

type AvailableClub = {
  clubeId: number;
  clubeNome: string;
  ligaId: number;
  ligaNome: string;
  superUnionId: number | null;
};
```

---

## Historico

| Versao | Data | Mudancas |
|--------|------|----------|
| v1.0 | 2026-01-30 | Documentacao inicial completa |
| v1.1 | 2026-01-30 | Fallback visual: cards read-only em Grupos Meta e clubes por grupo em Metas Clube quando DB vazio |
