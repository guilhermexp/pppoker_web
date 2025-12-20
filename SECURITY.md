# Segurança

Contato: [seguranca@mid.poker](mailto:seguranca@mid.poker)

No Mid Poker, consideramos a segurança dos nossos sistemas uma prioridade máxima. Porém, não importa quanto esforço dediquemos à segurança do sistema, ainda podem existir vulnerabilidades.

Se você descobrir uma vulnerabilidade, gostaríamos de saber para que possamos tomar medidas para corrigi-la o mais rápido possível. Pedimos sua ajuda para proteger melhor nossos usuários e sistemas.

## Vulnerabilidades Fora do Escopo

- Clickjacking em páginas sem ações sensíveis
- CSRF não autenticado/logout/login
- Ataques que requerem MITM ou acesso físico ao dispositivo do usuário
- Qualquer atividade que possa levar à interrupção do nosso serviço (DoS)
- Spoofing de conteúdo e problemas de injeção de texto sem demonstrar um vetor de ataque
- Email spoofing
- Headers DNSSEC, CAA, CSP ausentes
- Falta de flag Secure ou HTTP only em cookies não sensíveis
- Links quebrados

## Por favor, faça o seguinte

- Envie suas descobertas por e-mail para [seguranca@mid.poker](mailto:seguranca@mid.poker)
- Não execute scanners automatizados em nossa infraestrutura ou dashboard
- Não tire vantagem da vulnerabilidade ou problema que descobriu
- Não revele o problema para outros até que tenha sido resolvido
- Não use ataques de segurança física, engenharia social, negação de serviço distribuída, spam ou aplicações de terceiros
- Forneça informações suficientes para reproduzir o problema

## O que prometemos

- Responderemos ao seu relatório dentro de 3 dias úteis com nossa avaliação e data esperada de resolução
- Se você seguiu as instruções acima, não tomaremos nenhuma ação legal contra você
- Trataremos seu relatório com estrita confidencialidade
- Manteremos você informado sobre o progresso da resolução do problema
- Nas informações públicas sobre o problema reportado, daremos seu nome como descobridor (a menos que deseje o contrário)
- Nos esforçamos para resolver todos os problemas o mais rápido possível

## Práticas de Segurança

### Autenticação
- Autenticação gerenciada pelo Supabase Auth
- Suporte a MFA (Multi-Factor Authentication)
- Tokens JWT com expiração

### Banco de Dados
- Row Level Security (RLS) habilitado em todas as tabelas
- Conexões criptografadas (SSL)
- Backups automáticos

### API
- Validação de entrada com Zod
- Rate limiting
- CORS configurado

### Frontend
- Headers de segurança (X-Frame-Options, CSP, etc.)
- Sanitização de dados
- HTTPS obrigatório em produção
