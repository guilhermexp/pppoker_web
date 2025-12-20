# Documentação Mid Poker

Documentação do Mid Poker usando Mintlify.

## Desenvolvimento

```bash
# Instalar Mintlify CLI
npm i -g mintlify

# Iniciar servidor local
mintlify dev
```

A documentação estará disponível em `http://localhost:3000`.

## Estrutura

```
├── mint.json              # Configuração do Mintlify
├── introduction.mdx       # Página inicial
├── local-development.mdx  # Guia de desenvolvimento
├── self-hosting.mdx       # Guia de self-hosting
├── integrations.mdx       # Integrações disponíveis
├── examples.mdx           # Exemplos de uso
├── api-reference/         # Referência da API
│   └── engine/           # Endpoints da API
├── images/               # Imagens
└── logos/                # Logos
```

## Deploy

A documentação é automaticamente deployada via Mintlify quando há push para a branch principal.

## Edição

Os arquivos `.mdx` suportam:
- Markdown padrão
- Componentes Mintlify (Cards, Steps, Tabs, etc.)
- Syntax highlighting para código
- Imagens e vídeos

Consulte a [documentação do Mintlify](https://mintlify.com/docs) para mais detalhes.
