# Skill: PPPoker Envio de Fichas

## Objetivo
Executar envio de fichas com confirmacao explicita e rastreabilidade.

## Fluxo
1. Validar alvo e valor (`target_id`, `amount`).
2. Confirmar com o usuario a operacao final.
3. Executar login_status.
4. Executar enviar_fichas.
5. Retornar resultado final com status e identificadores.

## Entradas minimas
- target_id (UID)
- amount (inteiro positivo)

## Regras
1. Nao executar sem confirmacao explicita.
2. Nunca expor credenciais.
3. Registrar output de sucesso/erro para historico operacional.
