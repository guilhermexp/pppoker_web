# Plan

Criar um plano de evolucao do app Mid Poker para gestao de clubes online com foco em dados do PPPoker, mantendo a base atual e adicionando novas sessoes sem alterar paginas existentes agora. O plano prioriza consistencia visual com o design system atual (Shadcn/Tailwind), integracao de dados via CSV e recursos que transformem dados em decisoes (lucro, risco, fraude e performance).

## Requirements
- Manter padrao visual e componentes atuais (Shadcn/ui + Tailwind), com layouts e tokens existentes.
- Criar novas sessoes sem deletar nem misturar com paginas ja criadas por enquanto.
- Ingestao diaria/semana de dados via CSV do PPPoker com validacao e historico.
- UI voltada a decisao: dashboards, alertas e automacoes (fechamento semanal, risco, auditoria).
- Suportar i18n (pt/en) e autenticacao existente.
- Reaproveitar fluxo de pagamentos/recebimentos ja existente quando aplicavel.

## Scope
- In:
- Novas sessoes: Dashboard Financeiro, CRM & Carteira, Auditoria & Seguranca, Business Intelligence, Tesouraria, e modulo SaaS (Blacklist Compartilhada).
- Mapeamento de dados dos CSVs (Geral, Retorno de taxa, Detalhes do usuario, Partidas, Detalhado, Transacoes).
- Pipeline de importacao/validacao e storage historico.
- Mecanismos de alerta (liquidez, conluio, overlay, desvio) e calculos (rake, netting, ROI, mix de receita).
- Navegacao e informacao arquitetada para integrar as novas sessoes futuramente ao core.
- Out:
- Refatoracao de paginas existentes.
- Remocao de features atuais.
- Automacoes externas (WhatsApp real, integrações bancarias adicionais) alem do necessario para prototipo.

## Files and entry points
- `apps/dashboard/src/app/[locale]/(app)` para novas rotas e agrupamentos de paginas.
- `apps/dashboard/src/components` e `packages/ui` para reaproveitar layouts, cards, tabelas, badges e componentes de grafico.
- `apps/dashboard/src/components/widgets` para KPIs e cards.
- `apps/dashboard/src/locales` para textos e rotulos.
- `apps/api` + `packages/db` para ingestao, schema e endpoints.
- `docs/DATAMODEL.md` e possiveis docs internas para alinhar o modelo atual.

## Data model / API changes
- Entidades novas ou ajustadas: Club, Agent, Player, TableSession, CashGame, Tournament, Transaction, Alert, RiskFlag, AuditEvent, ImportBatch.
- Tabelas de staging para CSV e regras de validacao/dedupe.
- Endpoints para dashboards (KPIs, trendlines), auditoria (conluio, shark, overlay), tesouraria (extrato/conciliacao).
- Camada de regras para alertas (limiares configuraveis por clube).

## Action items
[ ] Auditar UI atual: layouts, tokens, componentes, charts (Shadcn/Tailwind/Recharts) e identificar padrao de navegacao e pagina.
[ ] Catalogar colunas dos CSVs do PPPoker e definir dicionario de dados com mapeamento para o modelo interno.
[ ] Definir arquitetura de ingestao: fluxo de upload, validacao, storage, versionamento e reprocessamento.
[ ] Desenhar IA de informacao e rotas para as 5 sessoes + modulo SaaS, mantendo isolamento das paginas atuais.
[ ] Especificar UI/UX por sessao com componentes reutilizaveis e estados vazios/erro (KPI cards, tabelas, timelines, extratos).
[ ] Detalhar calculos e alertas (liquidez, netting, conluio, ROI, overlay, desvio) com thresholds configuraveis.
[ ] Planejar integracao com pagamentos/recebimentos existentes, definindo o que sera reaproveitado agora.
[ ] Planejar permissao e multi-tenant (clubes/roles) visando venda SaaS.
[ ] Definir plano de rollout: MVP por sessoes, metricas de sucesso e compatibilidade com dados atuais.

## Testing and validation
- Testes unitarios para parser/validacao de CSV e calculos de KPIs.
- Testes de integracao para endpoints de dashboards e auditoria.
- Smoke tests de UI para cada nova sessao e navegacao.
- Validacao com amostras reais de CSV para garantir consistencia dos resultados.

## Risks and edge cases
- Mudancas de esquema nos CSVs (colunas dinamicas) e dados incompletos.
- Alertas falsos positivos (conluio/overlay) gerando ruido.
- Performance em tabelas grandes e calculos historicos.
- Multi-tenant e privacidade ao compartilhar blacklist anonima.
- Dependencia de dados externos e periodicidade irregular.

## Open questions
- Qual sera o canal de ingestao (upload manual, bucket, email) e frequencia oficial?
- Quais limites de acesso/roles precisam ser suportados no MVP?
- O modulo de WhatsApp e cobranca sera automatico desde o inicio ou apenas geracao de recibos?
