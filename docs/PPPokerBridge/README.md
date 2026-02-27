# PPPokerBridge

Documentacao operacional do bridge PPPoker com foco em uso rapido por qualquer pessoa do time.

## Estrutura

- `01-envio-de-fichas.md`
- `02-saque-de-fichas.md`
- `03-login-status.md`
- `04-exportar-planilha.md`
- `05-membros-e-hierarquia.md`
- `06-mesas-e-liga.md`
- `07-solicitacoes.md`
- `08-gestao-de-membros.md`
- `09-bridge-rest-api.md`
- `10-referencia-operacional.md`
- `11-fluxo-de-login.md` — Fluxo completo de autenticacao (2 etapas, isolamento por clube)
- `12-cobertura-mcp-rest-trpc.md` — Mapeamento de cobertura entre MCP tools, REST API e tRPC
- `13-verificacao-email-login.md` — Verificacao por email no login (code -15): endpoints, fluxo, engenharia reversa

## Contexto operacional atual

- Conta operacional: `FastchipsOnline`
- Clube principal usado em operacoes atuais: `4366162`
- Liga do clube principal: `1765`

## Observacao importante sobre defaults no MCP

No codigo atual do MCP (`Ppfichas/pppoker_mcp.py`):

- `enviar_fichas` e `sacar_fichas` ainda usam default `clube_id=4191918` e `liga_id=3357`.

Para evitar operacao no clube errado, sempre informe `clube_id` e `liga_id` explicitamente.
