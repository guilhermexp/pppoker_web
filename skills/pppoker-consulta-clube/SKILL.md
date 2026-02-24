# Skill: PPPoker Consulta Clube

## Objetivo
Consultar informacoes operacionais do clube sem executar acoes de escrita.

## Quando usar
- Verificar status de login
- Consultar membro por UID
- Listar membros
- Listar mesas
- Ver clubes da liga
- Ver downlines
- Listar solicitacoes

## Ferramentas permitidas
- mcp_pppoker_login_status
- mcp_pppoker_info_membro
- mcp_pppoker_listar_membros
- mcp_pppoker_listar_mesas
- mcp_pppoker_clubes_da_liga
- mcp_pppoker_downlines_agente
- mcp_pppoker_listar_solicitacoes

## Regras
1. Sempre executar login_status antes das demais consultas.
2. Nao realizar envio/saque/aprovacao/remocao por esta skill.
3. Responder em formato objetivo com resumo + proximo passo.
