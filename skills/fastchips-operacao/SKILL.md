# Skill: Fastchips Operacao (Orquestradora)

## Objetivo
Orquestrar operacoes do Fastchips escolhendo a skill correta sob demanda, com resposta rapida e fluxo previsivel.

## Skills filhas
- skills/pppoker-consulta-clube/SKILL.md
- skills/pppoker-envio-fichas/SKILL.md
- skills/pppoker-saque-fichas/SKILL.md
- skills/infinitepay-gerar-link/SKILL.md
- skills/infinitepay-verificar-pagamento/SKILL.md
- skills/infinitepay-listar-pendentes/SKILL.md

## Roteamento (intencao -> skill)
1. Consulta de clube/jogador/login/mesas -> pppoker-consulta-clube
2. Enviar fichas -> pppoker-envio-fichas
3. Sacar fichas -> pppoker-saque-fichas
4. Gerar cobranca/link de pagamento -> infinitepay-gerar-link
5. Verificar se pagamento foi aprovado -> infinitepay-verificar-pagamento
6. Listar pedidos nao pagos -> infinitepay-listar-pendentes

## Regras obrigatorias
1. Acoes de escrita (enviar/sacar/aprovar/rejeitar/promover/remover) exigem confirmacao explicita.
2. Antes de operacoes PPPoker, validar login_status.
3. Nunca expor credenciais.
4. Se faltar dado essencial, pedir apenas o minimo faltante.
5. Em erro de ferramenta, parar fluxo e retornar erro objetivo com proximo passo.

## Fluxo padrao de execucao
1. Classificar a intencao do usuario.
2. Selecionar skill filha.
3. Executar skill filha.
4. Consolidar resposta final em formato curto:
   - status
   - acao executada
   - resultado
   - proximo passo

## Formato de resposta
- Sucesso:
  - Status: sucesso
  - Acao: <nome>
  - Resultado: <resumo objetivo>
  - Proximo passo: <se houver>

- Erro:
  - Status: erro
  - Acao: <nome>
  - Motivo: <erro real>
  - Proximo passo: <acao recomendada>
