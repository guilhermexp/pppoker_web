# Mapeamento de Navegação - Sidebar Atual → Nova Sidebar

## Estrutura Atual da Sidebar

### Layout Geral
- **Width**: 70px (collapsed) → 240px (expanded)
- **Comportamento**: Hover para expandir
- **Componentes**: Logo + MainMenu + TeamDropdown
- **Icons**: Custom icons do @midpoker/ui/icons

### Navegação Completa (14 seções principais)

#### 1. Overview (Home)
- **Path**: `/`
- **Icon**: Icons.Overview
- **Subseções**: Nenhuma

#### 2. Transactions
- **Path**: `/transactions`
- **Icon**: Icons.Transactions
- **Subseções**:
  - Categories: `/transactions/categories`
  - Connect Bank: `/transactions?step=connect`
  - Import: `/transactions?step=import&hide=true`
  - Create New: `/transactions?createTransaction=true`

#### 3. Inbox
- **Path**: `/inbox`
- **Icon**: Icons.Inbox2
- **Subseções**:
  - Settings: `/inbox/settings`

#### 4. Invoices
- **Path**: `/invoices`
- **Icon**: Icons.Invoice
- **Subseções**:
  - Products: `/invoices/products`
  - Create New: `/invoices?type=create`

#### 5. Tracker
- **Path**: `/tracker`
- **Icon**: Icons.Tracker
- **Subseções**:
  - Create New: `/tracker?create=true`

#### 6. Customers
- **Path**: `/customers`
- **Icon**: Icons.Customers
- **Subseções**:
  - Create New: `/customers?createCustomer=true`

#### 7. Vault
- **Path**: `/vault`
- **Icon**: Icons.Vault
- **Subseções**: Nenhuma

#### 8. Poker (CRÍTICO - 6 subseções)
- **Path**: `/poker`
- **Icon**: Icons.PieChart
- **Subseções**:
  - Players: `/poker/players`
  - Agents: `/poker/agents`
  - Sessions: `/poker/sessions`
  - Transactions: `/poker/transactions`
  - Settlements: `/poker/settlements`
  - Import: `/poker/import`

#### 9. Ligas (Poker Leagues)
- **Path**: `/poker/leagues`
- **Icon**: Icons.Link
- **Subseções**:
  - Import: `/poker/leagues/import`

#### 10. FastChips (CRÍTICO - 5 subseções)
- **Path**: `/fastchips`
- **Icon**: Icons.Accounts
- **Subseções**:
  - Transações: `/fastchips/transacoes`
  - Contas Vinculadas: `/fastchips/contas-vinculadas`
  - Jogadores: `/fastchips/jogadores`
  - Movimentação: `/fastchips/movimentacao`
  - Controle: `/fastchips/controle`

#### 11. SU (SuperUnion - CRÍTICO - 5 subseções)
- **Path**: `/su`
- **Icon**: Icons.GridView
- **Subseções**:
  - Ligas: `/su/ligas`
  - Jogos: `/su/jogos`
  - Acertos: `/su/acertos`
  - Import: `/su/import`
  - Grade: `/su/grade`

#### 12. Apps
- **Path**: `/apps`
- **Icon**: Icons.Apps
- **Subseções**:
  - All: `/apps`
  - Installed: `/apps?tab=installed`

#### 13. Settings (CRÍTICO - 5 subseções)
- **Path**: `/settings`
- **Icon**: Icons.Settings
- **Subseções**:
  - General: `/settings`
  - Bank Connections: `/settings/accounts`
  - Members: `/settings/members`
  - Notifications: `/settings/notifications`
  - Developer: `/settings/developer`

#### 14. Team Dropdown (Bottom)
- **Componente**: TeamDropdown
- **Funcionalidade**: Trocar entre times, criar novo time
- **Animação**: Stack de avatares com motion

---

## Mapeamento para Nova Sidebar (Carbon Icons)

### Estrutura da Nova Sidebar
- **IconNavigation** (Left Rail): Ícones principais de 20x20
- **DetailSidebar** (Right Panel): Subseções expandíveis
- **Icons Library**: @carbon/icons-react

### Mapeamento de Ícones: Custom → Carbon

| Seção | Icon Atual | Carbon Icon Sugerido | Importação |
|-------|-----------|---------------------|-----------|
| Overview | Icons.Overview | Dashboard | Dashboard20 |
| Transactions | Icons.Transactions | DataTable | DataTable20 |
| Inbox | Icons.Inbox2 | Email | Email20 |
| Invoices | Icons.Invoice | Receipt | Receipt20 |
| Tracker | Icons.Tracker | ChartLine | ChartLine20 |
| Customers | Icons.Customers | User | UserMultiple20 |
| Vault | Icons.Vault | Locked | Locked20 |
| Poker | Icons.PieChart | ChartPie | ChartPie20 |
| Ligas | Icons.Link | Link | Link20 |
| FastChips | Icons.Accounts | Wallet | Wallet20 |
| SU | Icons.GridView | Grid | Grid20 |
| Apps | Icons.Apps | Application | Application20 |
| Settings | Icons.Settings | Settings | Settings20 |

### Exemplo de Importação Carbon
```typescript
import {
  Dashboard20,
  DataTable20,
  Email20,
  Receipt20,
  ChartLine20,
  UserMultiple20,
  Locked20,
  ChartPie20,
  Link20,
  Wallet20,
  Grid20,
  Application20,
  Settings20,
} from '@carbon/icons-react';
```

---

## Funcionalidades Críticas a Preservar

### 1. Estado de Expansão
- ✅ Hover para expandir sidebar
- ✅ Estado expandido mostra nomes + subseções
- ✅ Transição suave (cubic-bezier)

### 2. Navegação Ativa
- ✅ Highlight da rota ativa
- ✅ Suporte para sub-rotas (ex: `/poker/players` ativa `/poker`)
- ✅ Background ativo com border

### 3. Subseções
- ✅ Chevron para toggle de subseções
- ✅ Animação de altura + opacidade
- ✅ Staggered animation (delay progressivo)
- ✅ Border-left nos itens filhos

### 4. Team Dropdown
- ✅ Avatar fixo no bottom
- ✅ Stack animation com framer-motion
- ✅ Trocar de time (mutação tRPC)
- ✅ Criar novo time (/teams/create)
- ✅ Nome do time ao expandir

### 5. Internacionalização (i18n)
- ✅ Todos os nomes vêm do hook useI18n()
- ✅ Formato: t("sidebar.overview"), t("sidebar.poker_players")
- ✅ Arquivo de tradução: locales/

### 6. Roteamento
- ✅ Next.js Link com prefetch
- ✅ Query params preservados (ex: ?createTransaction=true)
- ✅ Active state considera pathname + queries

---

## Gaps e Desafios

### 1. Two-Level Navigation Pattern
- **Atual**: Sidebar única com subseções inline
- **Nova**: IconNavigation (left) + DetailSidebar (right)
- **Decisão**: Manter comportamento inline ou adotar two-level?

### 2. Icon Library Switch
- **Atual**: @midpoker/ui/icons (custom)
- **Nova**: @carbon/icons-react
- **Decisão**: Mapear 1:1 ou criar abstração?

### 3. Team Dropdown Position
- **Atual**: Bottom da sidebar, fixed position
- **Nova**: Como integrar no novo layout?

### 4. Collapse Button
- **Atual**: Hover automático
- **Nova**: Botão manual de collapse (ChevronLeft/Right)
- **Decisão**: Manter hover ou adicionar botão?

---

## Estratégia de Implementação

### Fase 1: Dependências e Setup
1. Instalar @carbon/icons-react
2. Criar utils para mapeamento de ícones
3. Setup de tipos TypeScript

### Fase 2: Componentes Base
1. IconNavigation component (left rail)
2. DetailSidebar component (expandable)
3. SidebarItem component (com subseções)

### Fase 3: Integração
1. Substituir Sidebar.tsx por nova estrutura
2. Migrar MainMenu para nova navegação
3. Integrar TeamDropdown

### Fase 4: Ajustes Finais
1. Estilos e animações
2. Dark mode
3. Responsividade mobile

---

## Notas Técnicas

### Estado Atual (sidebar.tsx)
- **Width**: w-[70px] collapsed, w-[240px] expanded
- **Height**: h-screen fixed
- **Position**: fixed top-0, z-50
- **Border**: border-r border-border
- **Background**: bg-background

### Layout Atual (layout.tsx)
- **Sidebar**: ClientOnly wrapper
- **Content**: md:ml-[70px] offset

### MainMenu Atual
- **Icons Mapping**: Object com paths → Icon components
- **Items Generation**: Função getItems(t) com i18n
- **Active Detection**: Best match path algorithm
- **Expand State**: Local state por item

### TeamDropdown Atual
- **Position**: Fixed left-[19px] bottom-4
- **Animation**: Framer Motion stack
- **Mutation**: tRPC user.update com teamId

---

## Checklist de Validação

Após implementação, verificar:

- [ ] Todas as 14 seções principais estão visíveis
- [ ] Todas as subseções (31 total) estão funcionando
- [ ] Navegação ativa funciona corretamente
- [ ] Team dropdown mantém funcionalidade
- [ ] Hover/collapse funciona suavemente
- [ ] Dark mode funciona
- [ ] Mobile layout funciona (sidebar esconde)
- [ ] i18n strings carregam corretamente
- [ ] Animações são suaves (60fps)
- [ ] TypeScript compila sem erros
- [ ] Nenhum link quebrado ou 404
