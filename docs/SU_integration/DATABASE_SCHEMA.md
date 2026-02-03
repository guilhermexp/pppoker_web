# Database Schema - Modulo SU (Super Union)

**Data:** 2026-01-31
**Modulo:** Poker > Super Union
**Migracoes:** 0005, 0007, 0009

---

## Visao Geral

O modulo SU possui 11 tabelas dedicadas, organizadas em 3 grupos:
1. **Core** (7 tabelas): leagues, week_periods, imports, league_summary, games, game_players, settlements
2. **Metas** (4 tabelas): meta_groups, meta_group_members, meta_group_time_slots, club_metas
3. **Suporte**: poker_team_clubs (vinculo entre ligas e clubes)

Todas as tabelas usam `team_id` como chave de isolamento com Row Level Security (RLS).

---

## Enums

### poker_su_week_period_status

```sql
'open' | 'closed'
```

### poker_su_import_status

```sql
'pending' | 'validating' | 'validated' | 'processing' | 'completed' | 'failed' | 'cancelled'
```

### poker_su_settlement_status

```sql
'pending' | 'partial' | 'completed' | 'disputed' | 'cancelled'
```

### poker_su_game_type

```sql
'ppst' | 'ppsr'
```

### poker_su_game_variant

```sql
'nlh' | 'plo4' | 'plo5' | 'plo6' | 'ofc' | 'short' | '6plus' | 'spinup' | 'pko' | 'mko' | 'satellite' | 'other'
```

---

## Tabelas Core

### 1. poker_su_leagues

**Migracao:** `0005_poker_su_tables.sql` (Lines 46-68)
**Descricao:** Registro de ligas vinculadas ao SuperUnion

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| liga_id | INTEGER | ID numerico da liga no PPPoker |
| liga_nome | TEXT | Nome da liga |
| super_union_id | INTEGER | ID do SuperUnion (se aplicavel) |
| taxa_cambio | TEXT | Taxa de cambio (ex: "1:5") |
| is_active | BOOLEAN | Liga ativa |
| note | TEXT | Observacoes |
| metadata | JSONB | Dados extras |

**Unique:** `(team_id, liga_id)`

---

### 2. poker_su_week_periods

**Migracao:** `0005_poker_su_tables.sql` (Lines 70-107)
**Descricao:** Periodos semanais que agrupam importacoes e settlements

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| week_start | DATE | Inicio da semana |
| week_end | DATE | Fim da semana |
| timezone | TEXT | Fuso horario (default: 'UTC -0500') |
| status | poker_su_week_period_status | 'open' ou 'closed' |
| closed_at | TIMESTAMPTZ | Quando foi fechado |
| closed_by_id | UUID FK → users | Quem fechou |
| **Snapshot (calculado no fechamento):** | | |
| total_leagues | INTEGER | Total de ligas |
| total_games_ppst | INTEGER | Total jogos torneio |
| total_games_ppsr | INTEGER | Total jogos cash |
| total_players_ppst | INTEGER | Total jogadores torneio |
| total_players_ppsr | INTEGER | Total jogadores cash |
| total_league_earnings | NUMERIC(14,2) | Ganhos totais das ligas |
| total_gap_guaranteed | NUMERIC(14,2) | Gap garantido total |
| total_player_winnings | NUMERIC(14,2) | Ganhos totais jogadores |
| total_settlements | INTEGER | Total settlements criados |
| settlements_gross_amount | NUMERIC(14,2) | Valor bruto total |
| settlements_net_amount | NUMERIC(14,2) | Valor liquido total |
| note | TEXT | Nota de fechamento |

**Unique:** `(team_id, week_start)`

---

### 3. poker_su_imports

**Migracao:** `0005_poker_su_tables.sql` (Lines 109-152) + `0007_add_committed_to_su_imports.sql`
**Descricao:** Registro de importacoes de planilhas de liga

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| file_name | TEXT | Nome do arquivo |
| file_size | INTEGER | Tamanho em bytes |
| status | poker_su_import_status | Status do processamento |
| period_start | DATE | Inicio do periodo |
| period_end | DATE | Fim do periodo |
| timezone | TEXT | Fuso horario |
| week_period_id | UUID FK → poker_su_week_periods | Periodo semanal |
| **Estatisticas:** | | |
| total_leagues | INTEGER | Ligas processadas |
| total_games_ppst | INTEGER | Jogos PPST |
| total_games_ppsr | INTEGER | Jogos PPSR |
| total_players_ppst | INTEGER | Jogadores PPST |
| total_players_ppsr | INTEGER | Jogadores PPSR |
| **Validacao:** | | |
| validation_passed | BOOLEAN | Validacao OK |
| validation_errors | JSONB | Erros de validacao |
| validation_warnings | JSONB | Avisos |
| quality_score | INTEGER | Score de qualidade |
| **Processamento:** | | |
| processed_at | TIMESTAMPTZ | Quando processou |
| processed_by_id | UUID FK → users | Quem processou |
| processing_errors | JSONB | Erros de processamento |
| **Commitment (Migracao 0007):** | | |
| committed | BOOLEAN | Dados finalizados (default: false) |
| committed_at | TIMESTAMPTZ | Quando foi commitado |
| committed_by_id | UUID FK → users | Quem commitou |
| raw_data | JSONB | Dados brutos da planilha |

**Logica do committed:**
- `false` = dados em rascunho (visivel apenas em "Semana Atual")
- `true` = dados finalizados (visivel em "Historico" e relatorios)
- Transicao: ocorre automaticamente ao fechar a semana

---

### 4. poker_su_league_summary

**Migracao:** `0005_poker_su_tables.sql` (Lines 154-200)
**Descricao:** Resumo agregado por liga/periodo (abas "Geral PPST" e "Geral PPSR")

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| team_id | UUID FK → teams | Time dono |
| period_start | DATE | Inicio do periodo |
| period_end | DATE | Fim do periodo |
| import_id | UUID FK → poker_su_imports | Importacao origem |
| week_period_id | UUID FK → poker_su_week_periods | Periodo semanal |
| su_league_id | UUID FK → poker_su_leagues | Liga |
| liga_id | INTEGER | ID PPPoker da liga |
| liga_nome | TEXT | Nome da liga |
| super_union_id | INTEGER | ID do SuperUnion |
| taxa_cambio | TEXT | Taxa de cambio |
| **Valores PPST (Geral do PPST):** | | |
| ppst_ganhos_jogador | NUMERIC(14,2) | Ganhos do jogador |
| ppst_valor_ticket_ganho | NUMERIC(14,2) | Valor ticket ganho |
| ppst_buyin_ticket | NUMERIC(14,2) | Buy-in ticket |
| ppst_valor_premio_personalizado | NUMERIC(14,2) | Premio personalizado |
| ppst_ganhos_liga_geral | NUMERIC(14,2) | Ganhos liga geral |
| ppst_ganhos_liga_taxa | NUMERIC(14,2) | Ganhos liga taxa (fee) |
| ppst_buyin_spinup | NUMERIC(14,2) | Buy-in spinup |
| ppst_premiacao_spinup | NUMERIC(14,2) | Premiacao spinup |
| ppst_valor_ticket_entregue | NUMERIC(14,2) | Ticket entregue |
| ppst_buyin_ticket_liga | NUMERIC(14,2) | Buy-in ticket liga |
| ppst_gap_garantido | NUMERIC(14,2) | Gap garantido (overlay) |
| **Valores PPSR (Geral do PPSR):** | | |
| ppsr_ganhos_jogador | NUMERIC(14,2) | Ganhos jogador cash |
| ppsr_ganhos_liga_geral | NUMERIC(14,2) | Ganhos liga geral cash |
| ppsr_ganhos_liga_taxa | NUMERIC(14,2) | Ganhos liga taxa cash |
| ppsr_rake_total | NUMERIC(14,2) | Rake total cash |
| **Colunas Computadas (GENERATED ALWAYS STORED):** | | |
| total_ganhos_jogador | NUMERIC(14,2) | ppst_ganhos_jogador + ppsr_ganhos_jogador |
| total_ganhos_liga_taxa | NUMERIC(14,2) | ppst_ganhos_liga_taxa + ppsr_ganhos_liga_taxa |

**Unique:** `(team_id, liga_id, period_start, period_end)`

---

### 5. poker_su_games

**Migracao:** `0005_poker_su_tables.sql` (Lines 202-251)
**Descricao:** Jogos individuais PPST (torneios) e PPSR (cash)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| team_id | UUID FK → teams | Time dono |
| import_id | UUID FK → poker_su_imports | Importacao origem |
| week_period_id | UUID FK → poker_su_week_periods | Periodo semanal |
| **Identidade do Jogo:** | | |
| game_type | poker_su_game_type | 'ppst' ou 'ppsr' |
| game_variant | poker_su_game_variant | NLH, PLO4, SPINUP, PKO, etc. |
| game_id | TEXT | ID do jogo no PPPoker |
| table_name | TEXT | Nome da mesa |
| **Timing:** | | |
| started_at | TIMESTAMPTZ | Inicio do jogo |
| ended_at | TIMESTAMPTZ | Fim do jogo |
| **Criador:** | | |
| creator_id | TEXT | ID do criador no PPPoker |
| creator_name | TEXT | Nome do criador |
| **Config PPST (Torneios):** | | |
| buyin_base | NUMERIC(14,2) | Buy-in base |
| buyin_bounty | NUMERIC(14,2) | Buy-in bounty (PKO/MKO) |
| buyin_taxa | NUMERIC(14,2) | Taxa do buy-in |
| premiacao_garantida | NUMERIC(14,2) | Premiacao garantida (GTD) |
| is_satellite | BOOLEAN | E satelite |
| **Config PPSR (Cash):** | | |
| blinds | TEXT | Nivel de blinds (ex: "2.5/5") |
| min_buyin | NUMERIC(14,2) | Buy-in minimo |
| max_buyin | NUMERIC(14,2) | Buy-in maximo |
| **Stats Agregadas:** | | |
| player_count | INTEGER | Numero de jogadores |
| total_buyin | NUMERIC(14,2) | Total buy-in |
| total_ganhos_jogador | NUMERIC(14,2) | Total ganhos jogadores |
| total_taxa | NUMERIC(14,2) | Total taxa |
| total_gap_garantido | NUMERIC(14,2) | Total gap garantido |
| total_recompensa | NUMERIC(14,2) | Total recompensa (PKO/MKO) |
| raw_data | JSONB | Dados brutos |

**Unique:** `(team_id, game_type, game_id)`

---

### 6. poker_su_game_players

**Migracao:** `0005_poker_su_tables.sql` (Lines 253-297)
**Descricao:** Jogadores por jogo com resultados detalhados

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| team_id | UUID FK → teams | Time dono |
| game_id | UUID FK → poker_su_games | Jogo |
| **Contexto Liga:** | | |
| super_union_id | INTEGER | ID do SuperUnion |
| liga_id | INTEGER | ID da liga |
| clube_id | INTEGER | ID do clube |
| clube_nome | TEXT | Nome do clube |
| **Identidade Jogador (PPPoker):** | | |
| jogador_id | INTEGER | ID do jogador |
| apelido | TEXT | Apelido |
| nome_memorado | TEXT | Nome memorado |
| **Resultados:** | | |
| ranking | INTEGER | Posicao final |
| buyin_fichas | NUMERIC(14,2) | Buy-in em fichas |
| buyin_ticket | NUMERIC(14,2) | Buy-in via ticket |
| ganhos | NUMERIC(14,2) | Ganhos |
| taxa | NUMERIC(14,2) | Taxa paga |
| gap_garantido | NUMERIC(14,2) | Gap garantido |
| **SPINUP Especifico:** | | |
| premio | NUMERIC(14,2) | Premio spinup |
| **PKO/MKO Especifico:** | | |
| recompensa | NUMERIC(14,2) | Recompensa bounty |
| **Satellite Especifico:** | | |
| nome_ticket | TEXT | Nome do ticket ganho |
| valor_ticket | NUMERIC(14,2) | Valor do ticket |
| **PPSR Especifico:** | | |
| hands_played | INTEGER | Maos jogadas |
| rake_paid | NUMERIC(14,2) | Rake pago |

**Unique:** `(game_id, jogador_id)`

---

### 7. poker_su_settlements

**Migracao:** `0005_poker_su_tables.sql` (Lines 299-340)
**Descricao:** Settlements (acertos) semanais por liga

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| **Periodo:** | | |
| period_start | DATE | Inicio do periodo |
| period_end | DATE | Fim do periodo |
| week_period_id | UUID FK → poker_su_week_periods | Periodo semanal |
| **Referencia Liga:** | | |
| su_league_id | UUID FK → poker_su_leagues | Liga |
| liga_id | INTEGER | ID numerico da liga |
| liga_nome | TEXT | Nome da liga |
| **Status:** | | |
| status | poker_su_settlement_status | pending/partial/completed/disputed/cancelled |
| **Valores PPST:** | | |
| ppst_league_fee | NUMERIC(14,2) | Taxa da liga PPST |
| ppst_gap_guaranteed | NUMERIC(14,2) | Gap garantido PPST |
| ppst_games_count | INTEGER | Jogos PPST |
| **Valores PPSR:** | | |
| ppsr_league_fee | NUMERIC(14,2) | Taxa da liga PPSR |
| ppsr_games_count | INTEGER | Jogos PPSR |
| **Calculo:** | | |
| gross_amount | NUMERIC(14,2) | ppst_league_fee + ppsr_league_fee |
| adjustment_amount | NUMERIC(14,2) | Ajustes manuais |
| net_amount | NUMERIC(14,2) | gross_amount + adjustment_amount |
| **Pagamento:** | | |
| paid_amount | NUMERIC(14,2) | Valor pago |
| paid_at | TIMESTAMPTZ | Data do pagamento |
| **Auditoria:** | | |
| created_by_id | UUID FK → users | Quem criou |
| note | TEXT | Observacoes |

**Unique:** `(team_id, liga_id, period_start, period_end)`

---

## Tabelas de Metas

### 8. poker_su_meta_groups

**Migracao:** `0009_poker_su_meta_tables.sql` (Lines 11-24)
**Descricao:** Grupos de distribuicao de GTD (substitui BR=60%/SA=40% hardcoded)

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| name | TEXT | Nome do grupo (ex: "Brasil", "Exterior") |
| description | TEXT | Descricao |
| meta_percent | NUMERIC(5,2) | % do total GTD (0-100) |
| is_active | BOOLEAN | Grupo ativo |
| created_by_id | UUID FK → auth.users | Criador |

**Unique:** `(team_id, name)`
**Regra:** Soma dos % de grupos ativos <= 100%

---

### 9. poker_su_meta_group_members

**Migracao:** `0009_poker_su_meta_tables.sql` (Lines 27-38)
**Descricao:** SuperUnions/Ligas que pertencem a cada grupo

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| team_id | UUID FK → teams | Time dono |
| meta_group_id | UUID FK → poker_su_meta_groups | Grupo |
| super_union_id | INTEGER | ID do SuperUnion |
| su_league_id | UUID FK → poker_su_leagues | Liga especifica (opcional) |
| display_name | TEXT | Nome de exibicao |

**Unique:** `(team_id, super_union_id)` - Um SU so pode estar em um grupo

---

### 10. poker_su_meta_group_time_slots

**Migracao:** `0009_poker_su_meta_tables.sql` (Lines 41-53)
**Descricao:** Override de percentual por faixa horaria dentro de um grupo

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| meta_group_id | UUID FK → poker_su_meta_groups | Grupo |
| name | TEXT | Nome do slot (ex: "Noturno") |
| hour_start | INTEGER | Hora inicio (0-23) |
| hour_end | INTEGER | Hora fim (0-23) |
| meta_percent | NUMERIC(5,2) | % override para este horario |
| is_active | BOOLEAN | Slot ativo |

**Exemplo:** Grupo "Brasil" = 60% geral, mas 8h-12h = 55%, 22h-2h = 70%

---

### 11. poker_su_club_metas

**Migracao:** `0009_poker_su_meta_tables.sql` (Lines 56-76)
**Descricao:** Alvos granulares por clube/semana/dia/horario

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| updated_at | TIMESTAMPTZ | Data de atualizacao |
| team_id | UUID FK → teams | Time dono |
| super_union_id | INTEGER | SuperUnion |
| club_id | INTEGER | Clube |
| week_year | INTEGER | Ano da semana |
| week_number | INTEGER | Numero da semana |
| day_of_week | INTEGER | Dia (0-6, opcional) |
| hour_start | INTEGER | Hora inicio (0-23, opcional) |
| hour_end | INTEGER | Hora fim (0-23, opcional) |
| target_type | TEXT | 'players' ou 'buyins' |
| target_value | NUMERIC(14,2) | Valor alvo |
| reference_buyin | NUMERIC(14,2) | Buy-in de referencia |
| note | TEXT | Observacoes |
| created_by_id | UUID FK → auth.users | Criador |

**Unique:** `(team_id, super_union_id, club_id, week_year, week_number, day_of_week, hour_start, hour_end, target_type)`

---

## Tabela de Suporte

### poker_team_clubs

**Arquivo:** `packages/db/src/schema.ts` (Lines 4340-4390)
**Descricao:** Vinculo entre liga/SU e clubes individuais

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | UUID PK | Identificador |
| created_at | TIMESTAMPTZ | Data de criacao |
| liga_team_id | UUID FK → teams | Time da liga/SU |
| club_id | TEXT | ID do clube na plataforma |
| club_name | TEXT | Nome do clube |
| linked_team_id | UUID FK → teams | Time do clube (se tem conta propria) |

**Unique:** `(liga_team_id, club_id)`

---

## Campos do Teams (Extensoes SU)

**Migracao:** `0002_poker_team_settings.sql`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| poker_entity_type | ENUM | 'clube_privado', 'clube_liga', 'liga', 'ambos' |
| poker_su_id | TEXT | ID do SuperUnion na plataforma |
| poker_su_name | TEXT | Nome do SuperUnion |
| poker_liga_id | TEXT | ID da Liga |
| poker_liga_name | TEXT | Nome da Liga |
| poker_parent_liga_team_id | UUID FK → teams | Liga pai (se clube) |

---

## Row Level Security (RLS)

Todas as tabelas SU possuem RLS habilitado com a mesma politica:

```sql
CREATE POLICY "team_isolation" ON poker_su_*
  USING (team_id IN (SELECT private.get_teams_for_authenticated_user()));
```

Isso garante que cada time so acessa seus proprios dados.

---

## Relacionamentos

```
teams
  |
  +-- poker_su_week_periods (team_id)
  |     |
  |     +-- poker_su_imports (week_period_id)
  |     |     |
  |     |     +-- poker_su_league_summary (import_id)
  |     |     +-- poker_su_games (import_id)
  |     |           |
  |     |           +-- poker_su_game_players (game_id)
  |     |
  |     +-- poker_su_settlements (week_period_id)
  |
  +-- poker_su_leagues (team_id)
  |     |
  |     +-- poker_su_league_summary (su_league_id)
  |     +-- poker_su_settlements (su_league_id)
  |
  +-- poker_su_meta_groups (team_id)
  |     |
  |     +-- poker_su_meta_group_members (meta_group_id)
  |     +-- poker_su_meta_group_time_slots (meta_group_id)
  |
  +-- poker_su_club_metas (team_id)
  |
  +-- poker_team_clubs (liga_team_id)
```

---

## Nota Tecnica

As tabelas SU estao definidas em migracoes SQL puras. **Ainda nao foram convertidas para Drizzle pgTable** em `schema.ts`. Apenas `poker_team_clubs` possui definicao Drizzle. As queries utilizam Supabase client diretamente.

---

**Ultima atualizacao:** 2026-01-31
