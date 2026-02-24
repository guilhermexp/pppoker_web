# Referencia Operacional

## IDs de referencia

- Conta operadora UID: `13352472`
- Alvo recorrente de validacao: `13357479`
- Clube principal operacional: `4366162`
- Liga do clube principal: `1765`

## Códigos de erro comuns

### Transferencia (`AddCoinRSP`)

- `code=0`: sucesso
- outros codigos: tratar como falha operacional

### Exportacao (`ExportGameDataRSP`)

- `0`: sucesso
- `-2`: sem permissao
- `-3`: periodo muito longo
- `-4`: liga invalida
- `-5`: sem dados, liga incorreta ou payload invalido

## Armadilhas frequentes

- Nao confiar em default de clube/liga para envio/saque; informar sempre `clube_id` e `liga_id`.
- `sacar_fichas` usa `amount` positivo na entrada e converte para negativo no protocolo.
- Para exportacao, `date_start/date_end` devem estar no formato `YYYYMMDD`.
- Em ambientes de rede restrita, login PPPoker falha por DNS antes mesmo de chegar no protocolo.
