# Sistema de Metas e Rateio - Modulo SU

**Data:** 2026-01-31
**Modulo:** SU > Metas + Rateio
**Backend:** `apps/api/src/trpc/routers/su/metas.ts` (880 linhas)
**Frontend:** `apps/dashboard/src/components/league/validation-tabs/rateio/` (10 componentes)

---

## Visao Geral

O sistema de metas e rateio gerencia como a distribuicao de GTD (Guaranteed Tournament Distribution) e dividida entre diferentes grupos de clubes/ligas. Substitui a distribuicao hardcoded (ex: BR=60%, SA=40%) por um sistema dinamico com:

1. **Meta Groups** - Grupos nomeados com percentual de distribuicao
2. **Group Members** - SuperUnions/Ligas vinculadas a cada grupo
3. **Time Slots** - Override de percentual por faixa horaria
4. **Club Metas** - Alvos granulares por clube/semana/dia/horario

---

## Hierarquia de 3 Niveis

```
Meta Group (ex: "Brasil" = 60%, "Exterior" = 40%)
  |
  +-- Members (ex: SU 1765 -> "Brasil", SU 2340 -> "Exterior")
  |
  +-- Time Slots (ex: 8h-12h = 55%, 22h-2h = 70%)
  |
  +-- Club Metas (ex: Clube 42, Semana 5, target: 15 players)
```

### Exemplo Pratico

```
Meta Group "Brasil" (60%)
  Membros: SU 1765, SU 3890
  Time Slots:
    - "Manha" (8h-12h): 55%
    - "Noite" (20h-24h): 70%
    - Demais horarios: 60% (padrao do grupo)

Meta Group "Exterior" (40%)
  Membros: SU 2340, SU 4510
  Time Slots:
    - "Peak" (22h-4h): 45%

Club Metas (Semana 5/2026):
  - SU 1765, Clube 42: target 15 players
  - SU 1765, Clube 87: target 50,000 buyins
```

---

## Backend: Router de Metas

### 1. Meta Groups

#### metaGroups.list (Query)

**Input:** `{ activeOnly?: boolean }`
**Output:** Array de grupos com contagem de membros

#### metaGroups.getById (Query)

**Input:** `{ id: string }`
**Output:**
```typescript
{
  ...group,
  metaPercent: number;
  members: MetaGroupMember[];
  timeSlots: TimeSlot[];
}
```

#### metaGroups.create (Mutation)

**Input:**
```typescript
{
  name: string;             // 1-100 chars, unico por team
  description?: string;
  metaPercent: number;      // 0-100
  memberIds?: [{
    superUnionId: number;
    suLeagueId?: string;    // UUID
    displayName?: string;
  }];
}
```

**Validacao:**
1. `validateGroupPercentSum()` - Soma dos % de grupos ativos + novo <= 100%
2. Nome unico por team (constraint DB, code 23505)
3. SuperUnion unico entre grupos (constraint DB, code 23505)

**Fluxo:**
1. Inserir grupo
2. Se memberIds fornecido: inserir membros
3. Se erro nos membros: rollback (deleta grupo)

#### metaGroups.update (Mutation)

**Input:**
```typescript
{
  id: string;
  name?: string;
  description?: string | null;
  metaPercent?: number;
  isActive?: boolean;
}
```

**Validacao:** Se metaPercent muda, revalida soma (excluindo este grupo)

#### metaGroups.delete (Mutation)

**Input:** `{ id: string }`
**Efeito:** Cascade via FK (membros e time slots removidos)

---

### 2. Meta Group Members

#### metaGroupMembers.add (Mutation)

**Input:**
```typescript
{
  metaGroupId: string;
  superUnionId: number;
  suLeagueId?: string;
  displayName?: string;
}
```

**Constraint:** `(team_id, super_union_id)` - Um SU so pode estar em 1 grupo

#### metaGroupMembers.remove (Mutation)

**Input:** `{ id: string }`

#### metaGroupMembers.bulk (Mutation)

**Input:**
```typescript
{
  metaGroupId: string;
  members: [{
    superUnionId: number;
    suLeagueId?: string;
    displayName?: string;
  }];
}
```

**Logica:**
1. Deleta todos os membros existentes do grupo
2. Insere novos membros
3. Trata duplicatas cross-grupo

---

### 3. Time Slots

#### metaGroupTimeSlots.list (Query)

**Input:** `{ metaGroupId: string }`
**Output:** Array ordenado por `hour_start`

#### metaGroupTimeSlots.create (Mutation)

**Input:**
```typescript
{
  metaGroupId: string;
  name: string;           // 1-100 chars
  hourStart: number;      // 0-23
  hourEnd: number;        // 0-23
  metaPercent: number;    // 0-100
  isActive?: boolean;
}
```

**Validacao de Overlap:**
- Busca slots ativos do mesmo grupo
- Verifica se novo range conflita com existentes
- Erro: "Horario 14h-18h conflita com 'Tarde' (14h-16h)"

#### metaGroupTimeSlots.update (Mutation)

**Input:** Mesmos campos, todos opcionais
**Validacao:** Mesma logica de overlap, excluindo o proprio slot

#### metaGroupTimeSlots.delete (Mutation)

**Input:** `{ id: string }`

---

### 4. Club Metas

#### clubMetas.getByWeek (Query)

**Input:**
```typescript
{
  weekYear: number;
  weekNumber: number;
  superUnionId?: number;    // Filtro opcional
  clubId?: number;          // Filtro opcional
}
```

**Output:** Array de metas para aquela semana

#### clubMetas.create (Mutation)

**Input:**
```typescript
{
  superUnionId: number;
  clubId: number;
  weekYear: number;
  weekNumber: number;
  dayOfWeek?: number;       // 0-6 (Seg-Dom)
  hourStart?: number;       // 0-23
  hourEnd?: number;         // 0-23
  targetType: 'players' | 'buyins';
  targetValue: number;
  referenceBuyin?: number;  // Para tipo 'buyins'
  note?: string;
}
```

**Constraint:** Combinacao completa unica (team + su + club + week + day + hour + type)

#### clubMetas.update (Mutation)

**Input:**
```typescript
{
  id: string;
  targetValue?: number;
  referenceBuyin?: number | null;
  note?: string | null;
  dayOfWeek?: number | null;
  hourStart?: number | null;
  hourEnd?: number | null;
}
```

#### clubMetas.delete (Mutation)

**Input:** `{ id: string }`

#### clubMetas.bulkCreate (Mutation)

**Input:** `{ metas: CreateClubMetaSchema[] }`
**Logica:** Upsert com ON CONFLICT na constraint unica

#### clubMetas.inheritFromPrevious (Mutation)

**Input:**
```typescript
{
  targetWeekYear: number;
  targetWeekNumber: number;
  sourceWeekYear: number;
  sourceWeekNumber: number;
}
```

**Logica:**
1. Buscar todas as metas da semana source
2. Transformar com novos week_year/week_number
3. Upsert na semana target
4. Retorna contagem de metas herdadas

---

## Frontend: Componentes de Rateio

**Diretorio:** `apps/dashboard/src/components/league/validation-tabs/rateio/`

### Componentes (10 arquivos)

| Componente | Tamanho | Descricao |
|-----------|---------|-----------|
| `rateio-tab.tsx` | - | Tab principal no modal de validacao |
| `rateio-analysis.tsx` | 17.9KB | Analise de overlay com meta groups |
| `club-metas-section.tsx` | 18.6KB | Gerenciamento de metas por clube |
| `club-meta-form.tsx` | 10.3KB | Formulario de meta individual |
| `interactive-metas-table.tsx` | 12.1KB | Tabela interativa de metas |
| `meta-groups-section.tsx` | 13.5KB | Gerenciamento de meta groups |
| `meta-group-form.tsx` | 8.3KB | Formulario de grupo |
| `meta-group-members.tsx` | 5.4KB | Lista de membros do grupo |
| `time-slots-section.tsx` | 5.6KB | Gerenciamento de time slots |
| `time-slot-form.tsx` | 4.2KB | Formulario de time slot |
| `rateio-utils.ts` | 3.9KB | Utilidades de calculo |

### RateioAnalysis

Exibe analise de overlay com:
- Resumo de overlay por grupo
- Comparacao GTD agendado vs realizado
- Distribuicao por faixa horaria
- Calculos de meta por grupo

### ClubMetasSection

Gerenciamento completo de metas por clube:
- Tabela de metas da semana atual
- Formulario de adicao/edicao
- Heranca de semana anterior
- Filtros por SU e clube

### MetaGroupsSection

Interface para meta groups:
- Lista de grupos com % e contagem de membros
- Criacao/edicao de grupos
- Vinculacao de SuperUnions
- Indicador de soma total (barra de progresso ate 100%)

### TimeSlotsSection

Gerenciamento de faixas horarias:
- Lista de slots por grupo
- Formulario com validacao de overlap
- Toggle ativo/inativo
- Visualizacao de cobertura horaria

---

## Persistencia de Dados

### LocalStorage (Frontend)

Na validacao da importacao, dados sao salvos no localStorage:

**SU_VALIDATION_STORAGE_KEY:**
- Stats da validacao para exibir no Painel SU
- Dados PPST/PPSR agregados

**REALIZED_TOURNAMENTS_KEY:**
- Detalhes de torneios realizados para cross-validation com grade
- Campos: name, date, day, time, GTD, game type, buy-in, entries, overlay

### Banco de Dados (Backend)

Todas as metas sao persistidas nas 4 tabelas de metas com:
- Isolamento por team_id (RLS)
- Constraints de unicidade
- Cascade delete via FK

---

## Fluxo de Uso

```
1. CONFIGURAR GRUPOS
   Admin cria meta groups (ex: "Brasil" 60%, "Exterior" 40%)
   Vincula SuperUnions a cada grupo
   Define time slots opcionais

2. DEFINIR METAS SEMANAIS
   Admin define club metas para a semana
   Ou herda da semana anterior (inheritFromPrevious)

3. IMPORTAR PLANILHA
   Upload da planilha PPST/PPSR
   Na validacao, aba "Rateio" mostra analise com metas

4. ANALISE DE OVERLAY
   Cross-validation com grade de torneios
   Calculo de GTD previsto vs realizado por grupo/horario

5. ACOMPANHAR
   Dashboard mostra overlay e gap por widget
   Metas ajustadas conforme performance
```

---

## Regras de Negocio

### Validacao de Percentual

- Soma dos `meta_percent` de grupos ativos <= 100%
- Cada grupo pode ter 0-100%
- Time slots fazem override pontual (nao afetam a soma)

### Unicidade de Membros

- Um SuperUnion so pode pertencer a **um** grupo
- Constraint: `(team_id, super_union_id)` em meta_group_members

### Overlap de Time Slots

- Slots nao podem ter horarios sobrepostos dentro do mesmo grupo
- Validacao ocorre no create e update
- Slots inativos sao ignorados na validacao

### Heranca Semanal

- `inheritFromPrevious` copia metas de uma semana para outra
- Usa upsert para nao duplicar metas existentes
- Retorna contagem de metas copiadas

---

**Ultima atualizacao:** 2026-01-31
