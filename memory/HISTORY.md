# HISTORY.md

## 2026-02-24

- Diagnostico e correcao do fluxo de tool parts no adapter do Nanobot:
  - corrigido `tool-call.args -> tool-call.input`
  - corrigido `tool-result.result -> tool-result.output`
- Mitigacao aplicada no backend API para reduzir falhas no `/chat` sob instabilidade de banco:
  - cache de usuario no fluxo de auth por token Supabase
  - fallback de contexto em `getUserContext` quando consultas ao DB falham
- Testes operacionais reais executados contra PPPoker:
  - envio de `5` fichas para `UID 13357479` no clube `4366162`/liga `1765` -> sucesso (`pb.AddCoinRSP`)
  - saque de `5` fichas de `UID 13357479` no clube `4366162`/liga `1765` -> sucesso (`pb.AddCoinRSP`)
