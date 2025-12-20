# Relatório de Limpeza - Mid Poker

Este documento detalha a análise de código morto, duplicações e oportunidades de limpeza.

---

## ARQUIVOS REMOVIDOS (Limpeza Segura)

### 1. Workflows para Apps Inexistentes

Os seguintes workflows referenciavam apps que não existem mais no projeto:

| Arquivo | App Referenciado | Status |
|---------|------------------|--------|
| `.github/workflows/preview-engine.yml` | `apps/engine` | REMOVIDO |
| `.github/workflows/production-engine.yml` | `apps/engine` | REMOVIDO |
| `.github/workflows/production-desktop.yaml` | `apps/desktop` | REMOVIDO |
| `.github/workflows/production-website.yml` | `apps/website` | REMOVIDO |
| `.github/workflows/preview-website.yml` | `apps/website` | REMOVIDO |
| `.github/workflows/production-email.yml` | `apps/email` (inexistente) | REMOVIDO |

### 2. Componentes Stub Não Utilizados

| Arquivo | Motivo | Status |
|---------|--------|--------|
| `desktop-traffic-light.tsx` | Retorna `null`, nunca importado | REMOVIDO |
| `orders.tsx` | Billing desabilitado, nunca importado | REMOVIDO |

### 3. Documentação Obsoleta

| Arquivo | Motivo | Status |
|---------|--------|--------|
| `AI_CHANGELOG.md` | Changelog do Midday original, não relevante | REMOVIDO |
| `ai_quickstart.md` | Guia de setup do Midday, desatualizado | REMOVIDO |

---

## ARQUIVOS ATUALIZADOS

### 1. Remoção de Imports de Componentes Stub

**`apps/dashboard/src/app/[locale]/layout.tsx`**
- Removido import e uso de `<DesktopHeader />`

**`apps/dashboard/src/app/[locale]/providers.tsx`**
- Removido import e uso de `<DesktopProvider />`

### 2. Arquivos Stub Restantes (Removidos após atualização)

| Arquivo | Status |
|---------|--------|
| `desktop-header.tsx` | REMOVIDO (após limpar imports) |
| `desktop-provider.tsx` | REMOVIDO (após limpar imports) |

---

## ITENS NÃO REMOVIDOS (Requerem Análise Adicional)

### 1. Referências @engine no tsconfig

Os seguintes arquivos têm path alias `@engine` que não existe:
- `/apps/api/tsconfig.json` (linha 24)
- `/apps/dashboard/tsconfig.json` (linha 8)

**Recomendação:** Remover manualmente após verificar se causa quebra de build.

### 2. Scripts com Padrão CommonJS

Os scripts em `/packages/jobs/scripts/` usam `require.main === module` que não funciona com ES modules:
- `delete-bank-schedulers.ts`
- `register-bank-schedulers.ts`
- `get-eligible-teams.ts`
- `list-bank-schedulers.ts`

**Recomendação:** Atualizar para usar `import.meta.main` se executados diretamente.

### 3. Package Categories com Scripts Inexistentes

`/packages/categories/package.json` referencia:
- `"migrate": "tsx scripts/migrate.ts"` - diretório scripts não existe

**Recomendação:** Remover script ou criar o arquivo.

---

## DUPLICAÇÕES IDENTIFICADAS (Para Refatoração Futura)

### 1. Cache Implementations
10+ arquivos com padrão idêntico de cache wrapper. Poderia ser abstraído em factory function.

### 2. Select/Inline Components
3 pares de componentes (category, tags, user) que duplicam lógica entre versão Select e Popover.

### 3. Open Sheet Buttons
3 botões (customer, invoice, tracker) com implementação idêntica. Poderia ser componente genérico.

### 4. Transaction Filter Hooks
3 hooks relacionados que poderiam ser consolidados:
- `use-transaction-filter-params`
- `use-transaction-filter-params-with-persistence`
- `use-transaction-params`

---

## ESTATÍSTICAS DA LIMPEZA

| Categoria | Quantidade |
|-----------|------------|
| Workflows removidos | 6 |
| Componentes removidos | 4 |
| Documentação removida | 2 |
| **Total de arquivos removidos** | **12** |

---

*Gerado em: Dezembro 2024*
