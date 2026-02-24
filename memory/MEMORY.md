# MEMORY.md

## Operacao PPPoker (Xperience Poker)

- Conta operacional validada para automacoes locais no bridge PPPoker:
  - usuario: `FastchipsOnline`
  - clube principal operacional: `4366162`
  - liga operacional para este clube: `1765`
- Fluxo tecnico validado em `2026-02-24` para transferencia de fichas:
  - envio usa `AddCoinREQ` com `amount` positivo
  - saque usa `AddCoinREQ` com `amount` negativo
  - resposta de sucesso observada: `pb.AddCoinRSP`
- UID de teste operacional recorrente confirmado:
  - alvo: `13357479`
- Regra comercial fixa para compra de fichas:
  - `1 ficha = R$ 1` (ex.: `10 fichas = R$ 10`)
  - quando quantidade de fichas estiver definida, nao perguntar valor em reais novamente

## Runtime/Integração

- No adapter SSE do Nanobot para AI SDK UI stream:
  - `tool-call` deve usar campo `input` (nao `args`)
  - `tool-result` deve usar campo `output` (nao `result`)
- Para robustez do chat quando DB oscila:
  - auth com token Supabase agora reaproveita `userCache` antes de consultar DB
  - `getUserContext` possui fallback degradado sem quebrar o fluxo do chat/aprovacao
