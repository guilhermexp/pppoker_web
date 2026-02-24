# Skill: PPPoker Saque de Fichas

## Objetivo
Executar saque de fichas com dupla checagem e retorno deterministico.

## Fluxo
1. Confirmar alvo e valor com o usuario.
2. Executar login_status.
3. Executar sacar_fichas.
4. Informar resultado final (sucesso/erro) com detalhes operacionais.

## Entradas minimas
- target_id (UID)
- amount (inteiro positivo)

## Regras
1. Acao de escrita exige confirmacao explicita.
2. Nao prosseguir se login falhar.
3. Registrar resultado para auditoria operacional.
