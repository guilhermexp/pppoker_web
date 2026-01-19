# Mid Poker - Diagramas de Arquitetura
## Fluxo do Usuário: Sessão de Clube → Painel

---

## 1. Fluxo Completo: Da Importação ao Dashboard

```mermaid
graph TB
    subgraph "1. Importação de Dados"
        A[Operador de Clube] -->|Upload Excel PPPoker| B[/poker/import]
        B --> C{Tipo de Planilha}
        C -->|7 abas| D[Clube Individual]
        C -->|4 abas| E[Liga/SuperUnion]

        D --> F[Validação Frontend]
        E --> F

        F -->|12+ Regras| G{Válido?}
        G -->|Não| H[Mostrar Erros]
        H --> B
        G -->|Sim| I[Preview 10 Abas]
    end

    subgraph "2. Processamento Backend"
        I -->|Aprovar| J[tRPC: poker.imports.process]
        J --> K[Criar poker_imports]
        K --> L[Processar Jogadores]
        L --> M[Processar Sessões]
        M --> N[Processar Transações]
        N --> O[Commit Status]
        O --> P[(PostgreSQL via Supabase)]
    end

    subgraph "3. Visualização no Dashboard"
        P --> Q[/poker Dashboard]
        Q --> R[Widgets Grid 2x4]

        R --> S[Total Sessões]
        R --> T[Total Jogadores]
        R --> U[Rake Total]
        R --> V[Resultado Geral]

        S --> W[tRPC: poker.sessions.getStats]
        T --> X[tRPC: poker.players.getStats]
        U --> Y[tRPC: poker.analytics.getRakeTotals]
        V --> Z[tRPC: poker.analytics.getBankResult]

        W --> P
        X --> P
        Y --> P
        Z --> P
    end

    subgraph "4. Detalhamento de Sessões"
        Q -->|Navegar| AA[/poker/sessions]
        AA --> AB[Filtros: Data, Tipo, Variante]
        AB --> AC[tRPC: poker.sessions.get]
        AC --> AD[DataTable Paginada]
        AD -->|Click Linha| AE[Session Detail Sheet]
        AE --> AF[tRPC: poker.sessions.getById]
        AF --> AG[Mostrar: Jogadores, Rake, Buy-ins]
    end

    style A fill:#e1f5ff
    style Q fill:#c3f0ca
    style AA fill:#c3f0ca
    style P fill:#ffe4b5
```

---

## 2. Arquitetura de Dados: Schema Poker

```mermaid
erDiagram
    TEAM ||--o{ POKER_IMPORTS : has
    TEAM ||--o{ POKER_PLAYERS : has
    TEAM ||--o{ POKER_SESSIONS : has
    TEAM ||--o{ POKER_CHIP_TRANSACTIONS : has
    TEAM ||--o{ POKER_SETTLEMENTS : has

    POKER_IMPORTS ||--o{ POKER_SESSIONS : creates
    POKER_IMPORTS ||--o{ POKER_PLAYERS : creates
    POKER_IMPORTS ||--o{ POKER_CHIP_TRANSACTIONS : creates

    POKER_PLAYERS ||--o{ POKER_SESSION_PLAYERS : participates
    POKER_PLAYERS ||--o{ POKER_CHIP_TRANSACTIONS : sends
    POKER_PLAYERS ||--o{ POKER_CHIP_TRANSACTIONS : receives
    POKER_PLAYERS ||--o{ POKER_SETTLEMENTS : has

    POKER_SESSIONS ||--o{ POKER_SESSION_PLAYERS : has
    POKER_SESSIONS ||--o{ POKER_CHIP_TRANSACTIONS : generates

    POKER_PLAYERS {
        uuid id PK
        uuid team_id FK
        string pppoker_id "Unique"
        string nickname
        string memo_name
        string player_type "player|agent"
        uuid agent_id FK
        uuid super_agent_id FK
        decimal chip_balance
        decimal credit_limit
        string status "active|inactive|suspended"
    }

    POKER_SESSIONS {
        uuid id PK
        uuid team_id FK
        uuid import_id FK
        string external_id "PPPoker ID"
        string table_name
        string session_type "cash_game|mtt|sit_n_go|spin"
        string game_variant "nlh|plo4|plo5|plo6|6plus|aof"
        timestamp started_at
        timestamp ended_at
        decimal total_rake
        decimal total_buy_in
        decimal total_cash_out
        int player_count
        int hands_played
    }

    POKER_SESSION_PLAYERS {
        uuid id PK
        uuid session_id FK
        uuid player_id FK
        int ranking
        decimal buy_in_chips
        decimal cash_out
        decimal winnings
        decimal rake
    }

    POKER_CHIP_TRANSACTIONS {
        uuid id PK
        uuid team_id FK
        uuid import_id FK
        string transaction_type "buy_in|cash_out|credit|rake|commission|rakeback"
        uuid from_player_id FK
        uuid to_player_id FK
        decimal credit_amount
        decimal chip_amount
        decimal amount_usd
        timestamp occurred_at
    }

    POKER_IMPORTS {
        uuid id PK
        uuid team_id FK
        string import_type "club|league"
        string status "pending|validating|processing|completed|failed"
        boolean committed
        jsonb raw_data
        jsonb validation_result
        timestamp created_at
    }
```

---

## 3. Fluxo tRPC: Request → Response

```mermaid
sequenceDiagram
    participant U as Usuário (Browser)
    participant C as Dashboard Client
    participant TC as tRPC Client
    participant API as API Server (Hono)
    participant M as Middleware Chain
    participant R as Router Procedure
    participant Q as DB Query Layer
    participant DB as PostgreSQL

    U->>C: Click "Sessions" tab
    C->>TC: trpc.poker.sessions.get()

    TC->>API: POST /trpc/poker.sessions.get
    Note over TC,API: Authorization: Bearer {JWT}

    API->>M: Create Context
    M->>M: Extract JWT from header
    M->>M: Validate session (Supabase)
    M->>M: Extract team_id from session
    M->>M: Rate limit check (1000/10min)

    M->>R: Execute procedure
    Note over R: Input validation (Zod schema)

    R->>Q: getCommittedImportIds(teamId)
    Q->>DB: SELECT id FROM poker_imports<br/>WHERE team_id = ? AND committed = true
    DB-->>Q: [import_id_1, import_id_2, ...]
    Q-->>R: committedImportIds[]

    R->>Q: Build sessions query
    Q->>DB: SELECT * FROM poker_sessions<br/>WHERE team_id = ?<br/>AND import_id IN (?)<br/>ORDER BY started_at DESC<br/>LIMIT 50 OFFSET 0
    DB-->>Q: sessions[]
    Q-->>R: Raw session data

    R->>R: Transform snake_case → camelCase
    R->>R: Calculate pagination meta

    R-->>API: { data: sessions[], meta: {...} }
    API-->>TC: JSON Response (SuperJSON)
    TC-->>C: Typed TypeScript object
    C-->>U: Render SessionsDataTable

    Note over U,DB: Total Time: ~100-300ms
```

---

## 4. Componentes do Dashboard: Hierarquia

```mermaid
graph TB
    subgraph "Page: /poker"
        A[page.tsx]
        A --> B[PokerWidgetProvider]
        B --> C[PokerDashboardHeader]
        B --> D[PokerWidgetsGrid]

        D --> E1[TotalSessionsWidget]
        D --> E2[TotalPlayersWidget]
        D --> E3[RakeTotalWidget]
        D --> E4[GeneralResultWidget]
        D --> E5[RakeBreakdownWidget]
        D --> E6[TotalRakebackWidget]
        D --> E7[PlayerResultsWidget]
        D --> E8[GameTypesWidget]

        E1 --> F1[useTRPC: poker.sessions.getStats]
        E2 --> F2[useTRPC: poker.players.getStats]
        E3 --> F3[useTRPC: poker.analytics.getRakeTotals]
        E4 --> F4[useTRPC: poker.analytics.getBankResult]
    end

    subgraph "Page: /poker/sessions"
        G[page.tsx]
        G --> H[PokerSessionsHeader]
        G --> I[PokerSessionsStats]
        G --> J[SessionsDataTable]

        H --> K[Filters Dropdown]
        H --> L[Date Range Picker]

        I --> M[useTRPC: poker.sessions.getStats]

        J --> N[useTRPC: poker.sessions.get]
        J --> O[DataTable Row]
        O -->|Click| P[SessionDetailSheet]

        P --> Q[useTRPC: poker.sessions.getById]
        P --> R[Session Players Table]
        P --> S[Rake Breakdown]
    end

    subgraph "Page: /poker/import"
        T[page.tsx]
        T --> U[PokerImportHeader]
        T --> V[ImportUploader]
        T --> W[ImportsList]

        V --> X[File Drop Zone]
        X -->|Upload| Y[useTRPC: poker.imports.upload]
        Y --> Z[Validation Result]
        Z -->|Valid| AA[ImportPreview 10 Tabs]
        AA -->|Approve| AB[useTRPC: poker.imports.process]

        W --> AC[useTRPC: poker.imports.get]
        AC --> AD[Import Card]
        AD -->|Click| AE[Import Detail Modal]
    end

    style A fill:#e3f2fd
    style G fill:#e3f2fd
    style T fill:#e3f2fd
    style F1 fill:#fff3e0
    style F2 fill:#fff3e0
    style F3 fill:#fff3e0
    style F4 fill:#fff3e0
```

---

## 5. Fluxo de Importação: Validação Detalhada

```mermaid
graph TB
    A[Upload Excel File] --> B{Detectar Tipo}

    B -->|7 abas| C[Club Spreadsheet]
    B -->|4 abas| D[League Spreadsheet]

    C --> E[Frontend Validation]
    D --> E

    E --> F1{Rule 1: Tab Structure}
    F1 -->|Fail| ERR[Show Error + Row/Col]
    F1 -->|Pass| F2{Rule 2: Column Count}
    F2 -->|Fail| ERR
    F2 -->|Pass| F3{Rule 3: Player IDs Valid}
    F3 -->|Fail| ERR
    F3 -->|Pass| F4{Rule 4: No Duplicate Players}
    F4 -->|Fail| ERR
    F4 -->|Pass| F5{Rule 5: Transaction Balance}
    F5 -->|Fail| ERR
    F5 -->|Pass| F6{Rule 6: Rake Consistency}
    F6 -->|Fail| ERR
    F6 -->|Pass| F7{Rule 7-12: Other Rules}
    F7 -->|Fail| ERR
    F7 -->|Pass| G[All Valid ✓]

    G --> H[Show Preview]
    H --> I[Tab 1: Geral]
    H --> J[Tab 2: Detalhado]
    H --> K[Tab 3: Partidas]
    H --> L[Tab 4: Transações]
    H --> M[Tab 5: Usuários]
    H --> N[Tab 6: Rakeback]
    H --> O[Tab 7: Jogadores por Sessão]
    H --> P[Tab 8: Resumo Rake]
    H --> Q[Tab 9: Saldos]
    H --> R[Tab 10: Raw Data]

    R --> S{User Approves?}
    S -->|No| ERR
    S -->|Yes| T[Backend Processing]

    T --> U[Create Import Record]
    U --> V[Insert Players]
    V --> W[Insert Sessions]
    W --> X[Insert Session Players]
    X --> Y[Insert Transactions]
    Y --> Z[Update Balances]
    Z --> AA[Mark Committed]
    AA --> AB[Import Complete ✓]

    AB --> AC[Redirect to Dashboard]
    AC --> AD[Show New Data]

    style ERR fill:#ffebee
    style G fill:#e8f5e9
    style AB fill:#e8f5e9
```

---

## 6. Middleware Chain: Segurança e Performance

```mermaid
graph LR
    A[HTTP Request] --> B[Hono Server]
    B --> C[tRPC Handler]

    C --> D{Context Creation}
    D --> E[Extract JWT from Header]
    E --> F[Validate with Supabase Auth]
    F --> G{Valid Session?}
    G -->|No| H[401 Unauthorized]
    G -->|Yes| I[Extract User + Team]

    I --> J{Middleware 1: Rate Limiting}
    J --> K[Redis: GET rate_limit:user_id]
    K --> L{< 1000 in 10min?}
    L -->|No| M[429 Too Many Requests]
    L -->|Yes| N[Redis: INCR counter]

    N --> O{Middleware 2: Team Permission}
    O --> P[Check team_id in user.teams]
    P --> Q{User in Team?}
    Q -->|No| R[403 Forbidden]
    Q -->|Yes| S[Add team_id to context]

    S --> T{Middleware 3: Primary Read-After-Write}
    T --> U{Is Write Operation?}
    U -->|Yes| V[Force Primary DB]
    U -->|No| W[Allow Replica DB]

    V --> X[Router Procedure]
    W --> X

    X --> Y[Business Logic]
    Y --> Z[Database Query]
    Z --> AA[Transform Response]
    AA --> AB[Return to Client]

    style H fill:#ffebee
    style M fill:#ffebee
    style R fill:#ffebee
    style AB fill:#e8f5e9
```

---

## 7. Estado do Cliente: React Query + Zustand

```mermaid
graph TB
    subgraph "React Query (Server State)"
        A[tRPC Hooks]
        A --> B[useQuery: poker.sessions.get]
        A --> C[useInfiniteQuery: poker.imports.get]
        A --> D[useMutation: poker.sessions.upsert]

        B --> E[Query Cache]
        C --> E
        D --> E

        E --> F[Automatic Refetch]
        E --> G[Stale-While-Revalidate]
        E --> H[Optimistic Updates]
    end

    subgraph "Zustand (Client State)"
        I[Store: usePokerFiltersStore]
        I --> J[dateRange: from, to]
        I --> K[sessionType: cash_game]
        I --> L[gameVariant: nlh]

        M[Store: usePokerUIStore]
        M --> N[sidebarOpen: boolean]
        M --> O[selectedSessionId: string]
        M --> P[activeTab: string]
    end

    subgraph "URL State (nuqs)"
        Q[usePokerSessionParams]
        Q --> R[?dateFrom=2024-01-01]
        Q --> S[?sessionType=mtt]
        Q --> T[?sort=started_at.desc]

        R --> U[Shareable URLs]
        S --> U
        T --> U
    end

    subgraph "Component Integration"
        V[SessionsDataTable]
        V --> B
        V --> Q

        W[SessionFilters]
        W --> I
        W --> Q

        X[SessionDetailSheet]
        X --> M
        X --> Y[useQuery: poker.sessions.getById]
    end

    style E fill:#fff3e0
    style I fill:#e1f5ff
    style Q fill:#f3e5f5
```

---

## 8. Performance: Caching Strategy

```mermaid
graph TB
    A[User Request] --> B{Cache Layer 1: React Query}

    B -->|Cache Hit <5min| C[Return Cached Data]
    B -->|Cache Miss| D[tRPC API Call]

    D --> E{Cache Layer 2: Redis}
    E -->|Cache Hit| F[Return from Redis]
    E -->|Cache Miss| G[PostgreSQL Query]

    G --> H[Query Result]
    H --> I[Store in Redis]
    I --> J[TTL: 60s for volatile]
    I --> K[TTL: 5min for stable]

    H --> L[Return to Client]
    L --> M[Update React Query Cache]
    M --> N[Render UI]

    subgraph "Cache Invalidation"
        O[Mutation: poker.sessions.upsert]
        O --> P[Invalidate Query Cache]
        P --> Q[trpc.poker.sessions.get.invalidate]
        P --> R[trpc.poker.sessions.getStats.invalidate]

        O --> S[Clear Redis Keys]
        S --> T[redis.del: sessions:team_id:*]
    end

    style C fill:#e8f5e9
    style F fill:#e8f5e9
    style N fill:#e8f5e9
```

---

## 9. Deploy Architecture: Railway + Supabase

```mermaid
graph TB
    subgraph "User Devices"
        A[Browser Desktop]
        B[Browser Mobile]
    end

    A --> C[CDN: Vercel Edge]
    B --> C

    C --> D{Railway Load Balancer}

    subgraph "Railway Services"
        D --> E[Dashboard Container]
        D --> F[API Container]

        E --> G[Next.js 16 Server]
        G --> H[Static Assets]
        G --> I[Server Components]
        G --> J[Server Actions]

        F --> K[Hono + tRPC Server]
        K --> L[REST Routes]
        K --> M[OpenAPI Docs]
    end

    subgraph "Supabase Platform"
        N[(PostgreSQL Primary)]
        O[(PostgreSQL Replica)]
        P[Supabase Auth]
        Q[Supabase Storage]
        R[Supabase Realtime]
    end

    G --> P
    J --> P
    K --> P

    K --> N
    K --> O

    J --> N

    G --> Q
    K --> Q

    subgraph "Background Jobs"
        S[Trigger.dev Runtime]
        S --> T[Email Jobs]
        S --> U[Import Processing]
        S --> V[Settlement Generation]

        T --> W[Resend API]
    end

    K --> S

    subgraph "External Services"
        X[Upstash Redis]
        Y[OpenAI API]
        Z[Google Maps API]
    end

    K --> X
    G --> Y
    K --> Z

    style E fill:#e3f2fd
    style F fill:#fff3e0
    style N fill:#ffebee
```

---

## 10. Segurança: Row Level Security (RLS)

```mermaid
graph TB
    A[User Request] --> B[JWT Token]
    B --> C{Supabase Auth}

    C -->|Valid| D[Extract Claims]
    D --> E[user_id: uuid]
    D --> F[email: string]
    D --> G[role: authenticated]

    E --> H[PostgreSQL Context]
    H --> I[set_config: app.user_id]

    I --> J{RLS Policy Check}

    subgraph "RLS Policies"
        J --> K[poker_sessions Policy]
        K --> L{team_id IN<br/>user_teams?}

        J --> M[poker_players Policy]
        M --> N{team_id =<br/>current_team?}

        J --> O[poker_transactions Policy]
        O --> P{team_id =<br/>current_team?}
    end

    L -->|No| Q[403 Forbidden]
    L -->|Yes| R[Return Rows]

    N -->|No| Q
    N -->|Yes| R

    P -->|No| Q
    P -->|Yes| R

    R --> S[Filter Results]
    S --> T[Only Team Data]
    T --> U[Return to API]

    style Q fill:#ffebee
    style T fill:#e8f5e9
```

---

## 11. Fluxo de Fechamento de Semana (Week Close Flow)

```mermaid
graph TB
    subgraph "1. Importação e Processamento"
        A[Operador Upload Excel] --> B[Validação + Preview]
        B -->|Aprovar| C[tRPC: poker.imports.process]
        C --> D[Processar: Jogadores, Sessões, Transações]
        D --> E[(poker_imports<br/>status: completed<br/>committed: FALSE)]
        E --> F[poker_week_periods<br/>status: OPEN]
    end

    subgraph "2. Estado Pendente (Uncommitted)"
        F --> G{Visualização do Dashboard}
        G -->|Modo: Semana Atual| H[📊 Dashboard Semana Aberta]
        G -->|Modo: Histórico| I[❌ Dados NÃO aparecem]

        H --> J[Mostra: Sessões desta semana]
        H --> K[Mostra: Jogadores desta semana]
        H --> L[Mostra: Transações desta semana]
        H --> M[chip_balance: ACUMULANDO]

        I --> N[Apenas semanas fechadas]
        I --> O[Apenas imports committed]
    end

    subgraph "3. Botão Fechar Semana"
        H --> P{Usuário clica<br/>FECHAR SEMANA}
        P --> Q[tRPC: poker.weekPeriods.close]

        Q --> R[Modal: CloseWeekPreviewModal]
        R --> S[Preview de Settlements]
        S --> T{Confirma?}
        T -->|Não| H
        T -->|Sim| U[Executar Fechamento]
    end

    subgraph "4. Processo de Fechamento"
        U --> V[STEP 1: Criar Settlements]
        V --> W[Para cada jogador com chip_balance ≠ 0]
        W --> X[Calcular: Bruto - Rakeback = Líquido]
        X --> Y[INSERT poker_settlements<br/>status: pending]

        Y --> Z[STEP 2: Zerar Saldos]
        Z --> AA[UPDATE poker_players<br/>SET chip_balance = 0]

        AA --> AB[STEP 3: Fechar Período]
        AB --> AC[UPDATE poker_week_periods<br/>status = CLOSED<br/>closed_at = NOW<br/>closed_by_id = user_id]

        AC --> AD[STEP 4: 🔥 COMMIT IMPORTS 🔥]
        AD --> AE[UPDATE poker_imports<br/>SET committed = TRUE<br/>committed_at = NOW<br/>WHERE period OVERLAPS week]
    end

    subgraph "5. Estado Final (Committed)"
        AE --> AF{Visualização Atualizada}
        AF -->|Modo: Semana Atual| AG[Nova semana aberta<br/>ou vazio]
        AF -->|Modo: Histórico| AH[✅ TODOS os dados aparecem]

        AH --> AI[Timeline completa]
        AH --> AJ[Relatórios históricos]
        AH --> AK[Analytics globais]
        AH --> AL[Settlements disponíveis]
        AH --> AM[chip_balance zerados]
    end

    subgraph "6. Avisos ao Usuário"
        F --> AN{Múltiplas semanas<br/>abertas?}
        AN -->|Sim| AO[⚠️ PendingWeeksWarning]
        AO --> AP[Você tem X semanas não fechadas]
        AP --> AQ[Botão para cada semana antiga]
        AQ --> P
    end

    style E fill:#fff3e0
    style F fill:#fff3e0
    style I fill:#ffebee
    style AD fill:#ff6b6b
    style AE fill:#ff6b6b
    style AH fill:#e8f5e9
    style AO fill:#fff9c4
```

---

## 12. Estados da Importação e Visualização

```mermaid
stateDiagram-v2
    [*] --> Uploading: Upload Excel

    Uploading --> Validating: Parse dados
    Validating --> Failed: Erro de validação
    Validating --> Previewing: Validação OK (12+ regras)

    Failed --> [*]: Usuário cancela

    Previewing --> Processing: Aprovar
    Previewing --> [*]: Rejeitar

    Processing --> Completed: Sucesso
    Processing --> Failed: Erro processamento

    state Completed {
        [*] --> Uncommitted: committed: false

        state Uncommitted {
            note right of Uncommitted
                Estado PENDENTE
                - Dados apenas em "Semana Atual"
                - NÃO aparecem no histórico
                - NÃO entram em analytics globais
                - NÃO somam em timeline
            end note
        }

        Uncommitted --> Committed: FECHAR SEMANA

        state Committed {
            note right of Committed
                Estado FINALIZADO
                - Dados em TODO o sistema
                - Aparecem no histórico
                - Entram em analytics globais
                - Somam na timeline
                - Settlements criados
                - chip_balance zerados
            end note
        }
    }

    Completed --> [*]

    note left of Completed
        CRÍTICO: O campo "committed"
        controla TUDO no sistema!

        committed = false:
        • Isolado na semana aberta
        • Editável/Deletável
        • Saldos acumulando

        committed = true:
        • Global e imutável
        • Settlements criados
        • Saldos zerados
    end note
```

```mermaid
graph LR
    subgraph "Query Filters no Sistema"
        A[tRPC: poker.sessions.get]
        B[tRPC: poker.players.get]
        C[tRPC: poker.analytics.*]

        A --> D{viewMode?}
        B --> D
        C --> D

        D -->|current| E[Filtro 1: Semana Atual]
        D -->|historical| F[Filtro 2: Histórico]

        E --> G[WHERE import_id IN<br/>SELECT id FROM poker_imports<br/>WHERE status = 'completed'<br/>AND period_start = current_week_start<br/>committed = ANY]

        F --> H[WHERE import_id IN<br/>SELECT id FROM poker_imports<br/>WHERE status = 'completed'<br/>AND committed = TRUE<br/>AND date BETWEEN from, to]

        G --> I[(Dados da semana aberta)]
        H --> J[(Dados históricos globais)]
    end

    subgraph "Tabela: poker_imports"
        K[id: uuid]
        L[status: completed]
        M[committed: boolean]
        N[period_start: date]
        O[period_end: date]
        P[committed_at: timestamp]
        Q[committed_by_id: uuid]
    end

    subgraph "Tabela: poker_week_periods"
        R[id: uuid]
        S[week_start: date]
        T[week_end: date]
        U[status: open/closed]
        V[closed_at: timestamp]
        W[closed_by_id: uuid]
    end

    M -->|FALSE| I
    M -->|TRUE| J
    U -->|open| I
    U -->|closed| J

    style M fill:#ff6b6b
    style U fill:#ff6b6b
    style I fill:#fff3e0
    style J fill:#e8f5e9
```

---

## Resumo dos Fluxos Principais

### 1. **Importação** (Diagrama 1, 5, 11)
Operador → Upload Excel → Validação → Preview → Aprovação → Processamento Backend → PostgreSQL (committed: false)

### 2. **Fechamento de Semana** ⭐ (Diagrama 11, 12)
Dados Pendentes → Usuário Clica "Fechar Semana" → Preview Settlements → Confirma → Criar Settlements → Zerar Saldos → Marcar Período Fechado → **COMMIT IMPORTS** → Dados Globais

### 3. **Dashboard** (Diagrama 1, 4, 12)
PostgreSQL → tRPC Widgets → React Query → 8 Widgets → Métricas Agregadas
- **Modo "Semana Atual"**: Apenas imports uncommitted da semana aberta
- **Modo "Histórico"**: Apenas imports committed (semanas fechadas)

### 4. **Sessões** (Diagrama 3, 4, 12)
User Click → tRPC Client → Middleware → Router → DB Query (filtrado por committed) → Transform → DataTable

### 5. **Segurança** (Diagrama 6, 10)
JWT → Middleware Chain → Rate Limit → Team Auth → RLS Policies → Filtered Data

### 6. **Performance** (Diagrama 8)
Request → React Query Cache → Redis Cache → PostgreSQL → Store in Caches → Render

---

**Tecnologias Chave:**
- Frontend: Next.js 16, React 19, tRPC Client, React Query, Zustand
- Backend: Hono, tRPC Server, Drizzle ORM
- Database: PostgreSQL (Supabase) com RLS
- Cache: Redis (Upstash), React Query
- Deploy: Railway (containers), Vercel (CDN)

---

## ⚠️ Conceito Crítico: Campo `committed`

O campo **`poker_imports.committed`** é o controle central do sistema:

### 🔴 `committed: false` (Estado Pendente)
- Importação processada e validada ✅
- Dados salvos no banco ✅
- **MAS**: Isolados na "Semana Atual"
- **NÃO** aparecem em:
  - Relatórios históricos
  - Timeline global
  - Analytics agregados
  - Páginas de sessões/transações (modo histórico)
- Saldos (`chip_balance`) **ACUMULANDO** durante a semana
- Importação **EDITÁVEL/DELETÁVEL**

### 🟢 `committed: true` (Estado Finalizado)
- Marcado ao **FECHAR SEMANA**
- Dados liberados para **TODO o sistema**
- **SIM** aparecem em:
  - Relatórios históricos ✅
  - Timeline global ✅
  - Analytics agregados ✅
  - Todas as páginas ✅
- Saldos (`chip_balance`) **ZERADOS**
- Settlements **CRIADOS**
- Importação **IMUTÁVEL**

### 📊 Queries no Sistema
Todos os routers tRPC filtram por `committed` baseado no contexto:

```typescript
// Modo "Semana Atual" (current)
WHERE import_id IN (
  SELECT id FROM poker_imports
  WHERE status = 'completed'
  AND period_start = current_week_start
  -- committed pode ser true ou false
)

// Modo "Histórico" (historical)
WHERE import_id IN (
  SELECT id FROM poker_imports
  WHERE status = 'completed'
  AND committed = TRUE  -- ⚠️ CRÍTICO
  AND date BETWEEN :from AND :to
)
```

### 🔄 Transição de Estado
A transição `committed: false → true` acontece **APENAS** ao fechar a semana via:
- `tRPC: poker.weekPeriods.close`
- Código: `apps/api/src/trpc/routers/poker/week-periods.ts:1141-1158`

```typescript
// Commit all imports for this week period
await supabase
  .from("poker_imports")
  .update({
    committed: true,
    committed_at: new Date().toISOString(),
    committed_by_id: userId,
  })
  .eq("team_id", teamId)
  .eq("status", "completed")
  .gte("period_start", weekPeriod.week_start)
  .lte("period_end", weekPeriod.week_end);
```

**Esta é a "trava" que separa dados temporários de dados permanentes no sistema!** 🔐
