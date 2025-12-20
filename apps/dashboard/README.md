# Dashboard Mid Poker

Aplicação principal do Mid Poker construída com Next.js 16.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: Bun + Turbopack
- **UI**: Shadcn/ui + TailwindCSS
- **State**: Zustand + TanStack Query
- **Auth**: Supabase Auth
- **Charts**: Recharts

## Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
bun dev

# O dashboard estará disponível em http://localhost:9000
```

## Estrutura

```
src/
├── app/                    # App Router (Next.js)
│   ├── [locale]/          # Rotas com i18n
│   │   ├── (app)/         # Rotas autenticadas
│   │   └── (public)/      # Rotas públicas
│   └── api/               # API routes
├── actions/               # Server Actions
├── components/            # Componentes React
│   ├── ui/               # Componentes base
│   └── widgets/          # Widgets do dashboard
├── hooks/                # Custom hooks
├── locales/              # Traduções (EN/PT)
├── trpc/                 # Cliente tRPC
└── utils/                # Utilitários
```

## Variáveis de Ambiente

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# API
NEXT_PUBLIC_API_URL=http://localhost:8080

# Opcional
NEXT_PUBLIC_APP_URL=http://localhost:9000
```

## Build

```bash
# Build de produção
bun run build

# Iniciar em produção
bun start
```

## Recursos

### Internacionalização (i18n)

O dashboard suporta múltiplos idiomas:
- Inglês (en) - Padrão
- Português (pt)

Arquivos de tradução em `src/locales/`.

### Next.js 16

Utilizando as novas funcionalidades:
- `proxy.ts` (substituindo middleware.ts)
- Turbopack para desenvolvimento
- React 19 com Server Components

### Autenticação

- Login via email (magic link)
- MFA (Multi-Factor Authentication)
- Sessões gerenciadas pelo Supabase

## Comandos

```bash
# Desenvolvimento
bun dev

# Build
bun run build

# Typecheck
bun run typecheck

# Lint
bun run lint

# Testes
bun test
```
