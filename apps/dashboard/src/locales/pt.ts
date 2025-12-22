export default {
  transaction_methods: {
    card_purchase: "Compra no Cartao",
    payment: "Pagamento",
    card_atm: "Saque no Caixa",
    transfer: "Transferencia",
    other: "Outro",
    ach: "ACH",
    deposit: "Deposito",
    wire: "Transferencia Bancaria",
    fee: "Taxa",
    interest: "Juros",
  },
  language: {
    title: "Idiomas",
    description: "Altere o idioma usado na interface do usuario.",
    placeholder: "Selecionar idioma",
  },
  locale: {
    title: "Localidade",
    searchPlaceholder: "Buscar localidade",
    description:
      "Define as preferencias de regiao e idioma para moeda, datas e outros formatos especificos de localidade.",
    placeholder: "Selecionar localidade",
  },
  languages: {
    en: "Ingles",
    sv: "Sueco",
    pt: "Portugues",
  },
  timezone: {
    title: "Fuso Horario",
    searchPlaceholder: "Buscar fuso horario",
    description:
      "Define o fuso horario padrao usado para exibir horarios no aplicativo.",
    placeholder: "Selecionar fuso horario",
  },
  spending_period: {
    last_30d: "Ultimos 30 dias",
    this_month: "Este mes",
    last_month: "Mes passado",
    this_year: "Este ano",
    last_year: "Ano passado",
  },
  widget_period: {
    fiscal_ytd: "Ano Fiscal Acumulado",
    fiscal_year: "Ano Fiscal",
    current_quarter: "Trimestre Atual",
    trailing_12: "Ultimos 12 Meses",
    current_month: "Mes Atual",
  },
  transactions_period: {
    all: "Todos",
    income: "Receita",
    expense: "Despesa",
  },
  transaction_frequency: {
    weekly: "Recorrente semanal",
    monthly: "Recorrente mensal",
    annually: "Recorrente anual",
  },
  inbox_filter: {
    all: "Todos",
    todo: "A fazer",
    done: "Concluido",
  },
  chart_type: {
    profit: "Lucro",
    revenue: "Receita",
    expense: "Despesas",
    burn_rate: "Taxa de queima",
  },
  folders: {
    all: "Todos",
    exports: "Exportacoes",
    inbox: "Caixa de entrada",
    imports: "Importacoes",
    transactions: "Transacoes",
    invoices: "Faturas",
  },
  mfa_status: {
    verified: "Verificado",
    unverified: "Nao verificado",
  },
  roles: {
    owner: "Proprietario",
    member: "Membro",
  },
  tracker_status: {
    in_progress: "Em andamento",
    completed: "Concluido",
  },
  notifications: {
    categories: {
      transactions: "Transacoes",
      invoices: "Faturas",
      inbox: "Caixa de entrada",
    },
    transactions_created: {
      name: "Novas Transacoes",
      description:
        "Receba notificacoes quando novas transacoes forem importadas",
      "title#one": "Nova transacao de {name} {amount} em {date}",
      "title#other": "{count} novas transacoes adicionadas",
      "title_many#other": "{count} transacoes importadas",
      single_transaction: "Nova transacao de {name} {amount} em {date}",
    },
    invoice_paid: {
      name: "Pago",
      description: "Receba notificacoes quando faturas forem pagas",
      title: "Pagamento de fatura recebido",
      subtitle: "Sua fatura foi paga",
      manual_with_date:
        "Fatura {invoiceNumber} de {customerName} marcada como paga em {date}",
      manual_with_date_no_customer:
        "Fatura {invoiceNumber} marcada como paga em {date}",
      manual: "Fatura {invoiceNumber} de {customerName} marcada como paga",
      manual_no_customer: "Fatura {invoiceNumber} marcada como paga",
      automatic: "Pagamento recebido para fatura {invoiceNumber}",
    },
    invoice_overdue: {
      name: "Vencida",
      description: "Receba notificacoes quando faturas ficarem vencidas",
      title: "Fatura vencida",
      subtitle: "O pagamento esta atrasado",
      with_number: "Fatura {invoiceNumber} esta vencida",
    },
    invoice_scheduled: {
      name: "Agendada",
      description:
        "Receba notificacoes quando faturas forem agendadas para envio",
      title: "Fatura agendada",
      subtitle: "Fatura foi agendada para envio automatico",
      with_customer:
        "Fatura {invoiceNumber} agendada para ser enviada para {customerName} em {date} as {time}",
      without_customer: "Fatura {invoiceNumber} agendada para {date} as {time}",
      simple: "Fatura {invoiceNumber} foi agendada",
    },
    invoice_sent: {
      name: "Enviada",
      description:
        "Receba notificacoes quando faturas forem enviadas com sucesso",
      title: "Fatura enviada",
      subtitle: "Fatura foi entregue ao cliente",
      with_customer: "Fatura {invoiceNumber} enviada para {customerName}",
      without_customer: "Fatura {invoiceNumber} foi enviada",
    },
    invoice_reminder_sent: {
      name: "Lembrete Enviado",
      description:
        "Receba notificacoes quando lembretes de fatura forem enviados",
      title: "Lembrete de fatura enviado",
      subtitle: "Lembrete de pagamento foi enviado ao cliente",
      with_customer:
        "Lembrete de pagamento enviado para {customerName} referente a fatura {invoiceNumber}",
      without_customer:
        "Lembrete de pagamento enviado para fatura {invoiceNumber}",
    },

    invoice_cancelled: {
      name: "Cancelada",
      description: "Receba notificacoes quando faturas forem canceladas",
      title: "Fatura cancelada",
      subtitle: "Fatura foi cancelada",
      with_customer: "Fatura {invoiceNumber} para {customerName} foi cancelada",
      without_customer: "Fatura {invoiceNumber} foi cancelada",
    },
    invoice_created: {
      name: "Criada",
      description: "Receba notificacoes quando novas faturas forem criadas",
      title: "Fatura criada",
      subtitle: "Uma nova fatura foi criada",
      with_customer_and_amount:
        "Fatura {invoiceNumber} criada para {customerName} - {amount}",
      with_customer: "Fatura {invoiceNumber} criada para {customerName}",
      without_customer: "Fatura {invoiceNumber} foi criada",
    },
    inbox_new: {
      name: "Novos Itens na Caixa de Entrada",
      description:
        "Receba notificacoes quando novos itens chegarem na sua caixa de entrada",
      "type.email#one": "Novo documento recebido via email da equipe",
      "type.email#other":
        "{count} novos documentos recebidos via email da equipe",
      "type.sync#one": "Novo documento sincronizado da sua conta {provider}",
      "type.sync#other":
        "{count} novos documentos sincronizados da sua conta {provider}",
      "type.slack#one": "Novo documento compartilhado via Slack",
      "type.slack#other": "{count} novos documentos compartilhados via Slack",
      "type.upload#one": "Novo documento enviado para sua caixa de entrada",
      "type.upload#other":
        "{count} novos documentos enviados para sua caixa de entrada",
      // Fallback titles (shouldn't be used with new implementation)
      "title#one": "Encontramos um novo documento na sua caixa de entrada",
      "title#other":
        "Encontramos {count} novos documentos na sua caixa de entrada",
      "upload_title#one":
        "Um novo documento foi enviado para sua caixa de entrada",
      "upload_title#other":
        "{count} novos documentos foram enviados para sua caixa de entrada",
    },
    inbox_auto_matched: {
      name: "Correspondencia automatica",
      description:
        "Receba notificacoes quando documentos forem automaticamente associados a transacoes",
      title: "Documento associado automaticamente",
      with_details:
        '"{documentName}" ({amount}) foi associado a "{transactionName}"',
      with_names: '"{documentName}" foi associado a "{transactionName}"',
      cross_currency_details:
        '"{documentName}" ({documentAmount}) foi associado a "{transactionName}" ({transactionAmount}) entre moedas diferentes',
    },
    inbox_high_confidence: {
      name: "Correspondencia de Alta Confianca",
      description:
        "Receba notificacoes quando correspondencias de alta confianca forem encontradas e provavelmente precisem de confirmacao",
      title: "Provavel correspondencia encontrada",
      with_details:
        '"{documentName}" ({amount}) parece corresponder a "{transactionName}" - clique para revisar',
      with_names:
        '"{documentName}" parece corresponder a "{transactionName}" - clique para revisar',
      cross_currency_details:
        '"{documentName}" ({documentAmount}) pode corresponder a "{transactionName}" ({transactionAmount}) entre moedas diferentes - clique para revisar',
    },
    inbox_needs_review: {
      name: "Precisa de Revisao",
      description:
        "Receba notificacoes quando possiveis correspondencias forem encontradas e precisarem de sua revisao",
      title: "Possivel correspondencia encontrada",
      with_details:
        '"{documentName}" ({amount}) pode corresponder a "{transactionName}" - clique para revisar',
      with_names:
        '"{documentName}" pode corresponder a "{transactionName}" - clique para revisar',
      high_confidence_details:
        '"{documentName}" ({amount}) parece corresponder a "{transactionName}" - clique para revisar',
      high_confidence_names:
        '"{documentName}" parece corresponder a "{transactionName}" - clique para revisar',
      cross_currency_high_confidence:
        '"{documentName}" ({documentAmount}) parece corresponder a "{transactionName}" ({transactionAmount}) entre moedas diferentes - clique para revisar',
      cross_currency_suggested:
        '"{documentName}" ({documentAmount}) pode corresponder a "{transactionName}" ({transactionAmount}) entre moedas diferentes - clique para revisar',
    },
    inbox_cross_currency_matched: {
      name: "Correspondencia Entre Moedas",
      description:
        "Receba notificacoes quando documentos forem associados a transacoes em moedas diferentes",
      title: "Correspondencia entre moedas encontrada",
      with_details:
        '"{documentName}" ({documentAmount}) pode corresponder a "{transactionName}" ({transactionAmount}) entre moedas diferentes - clique para revisar',
      with_names:
        '"{documentName}" pode corresponder a "{transactionName}" entre moedas diferentes - clique para revisar',
      high_confidence_details:
        '"{documentName}" ({documentAmount}) parece corresponder a "{transactionName}" ({transactionAmount}) entre moedas diferentes - clique para revisar',
      high_confidence_names:
        '"{documentName}" parece corresponder a "{transactionName}" entre moedas diferentes - clique para revisar',
    },
    default: {
      title: "Nova atividade detectada",
    },
    archive_button: "Arquivar notificacao",
    time_ago: "{time} atras",
  },
  widgets: {
    insights: "Assistente",
    inbox: "Caixa de entrada",
    spending: "Gastos",
    transactions: "Transacoes",
    tracker: "Rastreador",
  },
  bottom_bar: {
    "transactions#one": "1 Transacao",
    "transactions#other": "{count} Transacoes",
    multi_currency: "Multiplas moedas",
    description: "Inclui transacoes de todas as paginas de resultados",
  },
  account_type: {
    depository: "Conta Corrente",
    credit: "Credito",
    other_asset: "Outro Ativo",
    loan: "Emprestimo",
    other_liability: "Outro Passivo",
  },
  tags: {
    bylaws: "Estatutos",
    shareholder_agreements: "Acordos de Acionistas",
    board_meeting: "Reuniao do Conselho",
    corporate_policies: "Politicas Corporativas",
    annual_reports: "Relatorios Anuais",
    budget_reports: "Relatorios Orcamentarios",
    audit_reports: "Relatorios de Auditoria",
    tax_returns: "Declaracoes de Impostos",
    invoices_and_receipts: "Faturas e Recibos",
    employee_handbook: "Manual do Funcionario",
    payroll_records: "Registros de Folha de Pagamento",
    performance_reviews: "Avaliacoes de Desempenho",
    employee_training_materials: "Materiais de Treinamento de Funcionarios",
    benefits_documentation: "Documentacao de Beneficios",
    termination_letters: "Cartas de Demissao",
    patents: "Patentes",
    trademarks: "Marcas Registradas",
    copyrights: "Direitos Autorais",
    client_contracts: "Contratos de Clientes",
    financial_records: "Registros Financeiros",
    compliance_reports: "Relatorios de Conformidade",
    regulatory_filings: "Arquivos Regulatorios",
    advertising_copy: "Texto Publicitario",
    press_releases: "Comunicados de Imprensa",
    branding_guidelines: "Diretrizes de Marca",
    market_research_reports: "Relatorios de Pesquisa de Mercado",
    campaign_performance_reports: "Relatorios de Desempenho de Campanhas",
    customer_surveys: "Pesquisas com Clientes",
    quality_control_reports: "Relatorios de Controle de Qualidade",
    inventory_reports: "Relatorios de Inventario",
    maintenance_logs: "Registros de Manutencao",
    production_schedules: "Cronogramas de Producao",
    vendor_agreements: "Acordos com Fornecedores",
    supplier_agreements: "Acordos com Fornecedores",
    sales_contracts: "Contratos de Vendas",
    sales_reports: "Relatorios de Vendas",
    client_proposals: "Propostas para Clientes",
    customer_order_forms: "Formularios de Pedidos de Clientes",
    sales_presentations: "Apresentacoes de Vendas",
    data_security_plans: "Planos de Seguranca de Dados",
    system_architecture_diagrams: "Diagramas de Arquitetura de Sistema",
    incident_response_plans: "Planos de Resposta a Incidentes",
    user_manuals: "Manuais do Usuario",
    software_licenses: "Licencas de Software",
    data_backup_logs: "Registros de Backup de Dados",
    project_plans: "Planos de Projeto",
    task_lists: "Listas de Tarefas",
    risk_management_plans: "Planos de Gerenciamento de Riscos",
    project_status_reports: "Relatorios de Status de Projeto",
    meeting_agendas: "Pautas de Reunioes",
    lab_notebooks: "Cadernos de Laboratorio",
    experiment_results: "Resultados de Experimentos",
    product_design_documents: "Documentos de Design de Produto",
    prototypes_and_models: "Prototipos e Modelos",
    testing_reports: "Relatorios de Testes",
    newsletters: "Boletins Informativos",
    email_correspondence: "Correspondencia por Email",
    support_tickets: "Chamados de Suporte",
    faqs_and_knowledge: "FAQs e Base de Conhecimento",
    user_guides: "Guias do Usuario",
    warranty_information: "Informacoes de Garantia",
    swot_analysis: "Analise SWOT",
    strategic_objectives: "Objetivos Estrategicos",
    roadmaps: "Roadmaps",
    competitive_analysis: "Analise Competitiva",
    safety_data_sheets: "Fichas de Seguranca",
    compliance_certificates: "Certificados de Conformidade",
    incident_reports: "Relatorios de Incidentes",
    emergency_response_plans: "Planos de Resposta a Emergencias",
    certification_records: "Registros de Certificacao",
    training_schedules: "Cronogramas de Treinamento",
    e_learning_materials: "Materiais de E-learning",
    competency_assessment_forms: "Formularios de Avaliacao de Competencias",
  },
  invoice_status: {
    draft: "Rascunho",
    overdue: "Vencida",
    paid: "Paga",
    unpaid: "Nao paga",
    canceled: "Cancelada",
    scheduled: "Agendada",
  },
  payment_status: {
    none: "Desconhecido",
    good: "Bom",
    average: "Regular",
    bad: "Ruim",
  },
  payment_status_description: {
    none: "Sem historico de pagamento ainda",
    good: "Paga consistentemente em dia",
    average: "Geralmente em dia",
    bad: "Pode melhorar",
  },
  "invoice_count#zero": "Nenhuma fatura",
  "invoice_count#one": "1 fatura",
  "invoice_count#other": "{count} faturas",
  account_balance: {
    total_balance: "Saldo total",
  },
  transaction_categories: {
    // Parent Categories
    revenue: "Receitas e dinheiro recebido das atividades comerciais",
    "cost-of-goods-sold":
      "Custos diretos associados a producao de bens ou servicos",
    "sales-marketing":
      "Despesas relacionadas a atividades de vendas e esforcos de marketing",
    operations: "Custos operacionais do dia a dia para administrar o negocio",
    "professional-services":
      "Honorarios pagos a profissionais externos e prestadores de servicos",
    "human-resources":
      "Custos relacionados a funcionarios incluindo salarios, beneficios e treinamento",
    "travel-entertainment":
      "Viagens de negocios, refeicoes e despesas de entretenimento",
    technology: "Despesas relacionadas a software, hardware e tecnologia",
    "banking-finance":
      "Taxas bancarias, pagamentos de emprestimos e transacoes financeiras",
    "assets-capex": "Despesas de capital e aquisicoes de ativos",
    "liabilities-debt": "Obrigacoes de divida e receita diferida",
    taxes: "Pagamentos de impostos e taxas governamentais",
    "owner-equity":
      "Investimentos do proprietario, retiradas e transacoes de patrimonio",
    system: "Categorias geradas pelo sistema para transacoes nao categorizadas",

    // Child Categories - Revenue
    income: "Receita geral de negocios de varias fontes",
    "product-sales": "Receita da venda de produtos fisicos ou digitais",
    "service-revenue": "Receita da prestacao de servicos aos clientes",
    "consulting-revenue": "Receita de servicos de consultoria e assessoria",
    "subscription-revenue":
      "Receita recorrente de servicos baseados em assinatura",
    "interest-income": "Ganhos de juros sobre investimentos ou emprestimos",
    "other-income": "Receitas diversas nao classificadas em outros lugares",
    "customer-refunds": "Dinheiro devolvido aos clientes para reembolsos",
    "chargebacks-disputes": "Ajustes de receita de disputas de pagamento",

    // Child Categories - Cost of Goods Sold
    inventory: "Custo de mercadorias mantidas para venda",
    manufacturing: "Custos de producao para fabricacao de bens",
    "shipping-inbound": "Custos para recebimento de mercadorias e materiais",
    "duties-customs": "Taxas de importacao e despesas alfandegarias",

    // Child Categories - Sales & Marketing
    marketing: "Campanhas de marketing e despesas promocionais",
    advertising: "Custos de publicidade paga e colocacao de midia",
    website: "Desenvolvimento, hospedagem e manutencao de sites",
    events: "Feiras, conferencias e despesas de eventos",
    "promotional-materials":
      "Folhetos, cartoes de visita e materiais de marketing",

    // Child Categories - Operations
    "office-supplies": "Materiais de escritorio e papelaria",
    rent: "Custos de aluguel de escritorio, armazem ou equipamentos",
    utilities: "Contas de eletricidade, agua, gas e outros servicos publicos",
    "facilities-expenses": "Manutencao de edificios e custos de instalacoes",
    equipment: "Compras e manutencao de equipamentos nao capitalizados",
    "internet-and-telephone": "Servicos de internet, telefone e comunicacao",
    shipping: "Custos de envio e entrega",

    // Child Categories - Professional Services
    "professional-services-fees":
      "Honorarios juridicos, contabeis e de consultoria",
    contractors: "Pagamentos a contratados independentes e freelancers",
    insurance: "Premios de seguro empresarial e cobertura",

    // Child Categories - Human Resources
    salary: "Salarios e ordenados dos funcionarios",
    training: "Custos de treinamento e desenvolvimento de funcionarios",
    "employer-taxes":
      "Impostos sobre folha de pagamento e contribuicoes do empregador",
    benefits: "Beneficios dos funcionarios e plano de saude",

    // Child Categories - Travel & Entertainment
    travel: "Despesas de viagens de negocios incluindo transporte",
    meals: "Despesas de refeicoes e jantares de negocios",
    activity: "Atividades de entretenimento e integracao de equipe",

    // Child Categories - Technology
    software: "Licencas de software e assinaturas",
    "non-software-subscriptions":
      "Servicos de assinatura nao relacionados a software",

    // Child Categories - Banking & Finance
    transfer: "Transferencias bancarias entre contas",
    "credit-card-payment": "Pagamentos e taxas de cartao de credito",
    "banking-fees": "Manutencao de conta bancaria e taxas de transacao",
    "loan-proceeds": "Dinheiro recebido de emprestimos e financiamentos",
    "loan-principal-repayment": "Pagamentos do principal de emprestimos",
    "interest-expense": "Juros pagos sobre emprestimos e credito",
    payouts: "Repasses de plataformas de pagamento para o negocio",
    "processor-fees": "Taxas de processamento de pagamento e transacao",
    fees: "Taxas bancarias e financeiras gerais",

    // Child Categories - Assets
    "fixed-assets": "Ativos de longo prazo como edificios e equipamentos",
    "prepaid-expenses": "Pagamentos antecipados para servicos futuros",

    // Child Categories - Liabilities & Debt
    leases: "Pagamentos de leasing de equipamentos e propriedades",
    "deferred-revenue":
      "Pagamentos antecipados recebidos para servicos futuros",

    // Child Categories - Taxes & Government
    "vat-gst-pst-qst-payments": "Pagamentos de IVA e impostos sobre vendas",
    "sales-use-tax-payments": "Obrigacoes de impostos sobre vendas e uso",
    "income-tax-payments": "Pagamentos de imposto de renda e parcelas",
    "payroll-tax-remittances":
      "Retencoes de impostos de funcionarios e recolhimentos",
    "government-fees": "Licenciamento governamental e taxas regulatorias",

    // Child Categories - Owner / Equity
    "owner-draws": "Dinheiro retirado pelos proprietarios do negocio",
    "capital-investment": "Investimentos do proprietario no negocio",
    "charitable-donations": "Contribuicoes e doacoes para caridade",

    // Child Categories - System
    uncategorized: "Transacoes que ainda nao foram classificadas",
    other: "Transacoes diversas que nao se encaixam em outras categorias",
  },
  tax_summary: {
    title: {
      vat: "Resumo de IVA",
      gst: "Resumo de GST",
      sales_tax: "Resumo de Imposto sobre Vendas",
      default: "Resumo de Impostos",
    },
    collected: {
      vat: "IVA coletado",
      gst: "GST coletado",
      sales_tax: "Imposto sobre vendas coletado",
      default: "Imposto coletado",
    },
    paid: {
      vat: "IVA pago",
      gst: "GST pago",
      sales_tax: "Imposto sobre compras",
      default: "Imposto pago",
    },
    to_remit: "A Recolher",
    credit: "Credito",
    no_activity: "Sem atividade fiscal",
    balanced: "Equilibrado",
    year_to_date: "Acumulado do ano ({year})",
    remit_amount: "{amount} a recolher",
    credit_amount: "{amount} de credito",
    open_assistant: "Abrir assistente de impostos",
  },
  overdue_invoices: {
    title: "Faturas Vencidas",
    all_paid: "Todas as faturas pagas em dia",
    "description#one": "{count} fatura - Mais antiga {days} {dayText} vencida",
    "description#other":
      "{count} faturas - Mais antiga {days} {dayText} vencida",
    "day#one": "dia",
    "day#other": "dias",
    view_overdue: "Ver faturas vencidas",
  },
  billable_hours: {
    title: "Horas Faturaveis",
    no_hours: "Nenhuma hora faturavel registrada",
    "description#one": "{hours} hora registrada",
    "description#other": "{hours} horas registradas",
    "hour#one": "hora",
    "hour#other": "horas",
    view_tracker: "Ver rastreador de tempo",
  },
  sidebar: {
    overview: "Visao Geral",
    transactions: "Transacoes",
    inbox: "Caixa de Entrada",
    invoices: "Faturas",
    tracker: "Rastreador",
    customers: "Clientes",
    vault: "Cofre",
    apps: "Aplicativos",
    settings: "Configuracoes",
    categories: "Categorias",
    connect_bank: "Conectar banco",
    import: "Importar",
    create_new: "Criar novo",
    products: "Produtos",
    all: "Todos",
    installed: "Instalados",
    general: "Geral",

    bank_connections: "Conexoes Bancarias",
    members: "Membros",
    notifications: "Notificacoes",
    developer: "Desenvolvedor",
    poker: "Clube de Poker",
    poker_players: "Jogadores",
    poker_agents: "Agentes",
    poker_sessions: "Sessoes",
    poker_settlements: "Acertos",
    poker_import: "Importar Dados",
    super_union: "SuperUnion",
    super_union_import: "Importar Dados",
  },
  dashboard: {
    greeting: {
      morning: "Bom dia",
      afternoon: "Boa tarde",
      evening: "Boa noite",
      night: "Boa noite",
    },
    quick_look: "aqui esta um resumo de como as coisas estao indo.",
    drag_drop: "arraste e solte para organizar seu painel perfeito.",
    customize: "Personalizar",
    save: "Salvar",
  },
  widget_titles: {
    cash_runway: "Fluxo de Caixa",
    cash_flow: "Fluxo de Caixa",
    account_balances: "Saldo das Contas",
    profit_loss: "Lucros e Perdas",
    forecast: "Previsao",
    revenue_summary: "Resumo de Receita",
    growth_rate: "Taxa de Crescimento",
    customer_lifetime_value: "Valor Vitalicio do Cliente",
  },
  widget_descriptions: {
    cash_runway_months: "Seu fluxo de caixa em meses",
    net_cash_position: "Posicao liquida de caixa",
    no_accounts: "Nenhuma conta conectada",
    combined_balance_one: "Saldo combinado de 1 conta",
    combined_balance_other: "Saldo combinado de {count} contas",
    average_profit: "Seu lucro {type} medio",
    revenue_projection: "Projecao de receita",
    next_month_projection: "Projecao do proximo mes",
    revenue_growth: "Crescimento de receita {type}",
    no_data: "Nenhum dado disponivel",
    no_customer_data: "Nenhum dado de cliente disponivel",
    avg_clv: "CLV medio",
    total_customers: "Total de clientes",
    active_30d: "Ativos (30d)",
    avg_lifespan: "Tempo medio",
    days: "dias",
    months: "meses",
  },
  widget_actions: {
    view_runway: "Ver fluxo",
    view_cash_flow: "Ver analise de fluxo de caixa",
    view_account_balances: "Ver saldo das contas",
    see_detailed_analysis: "Ver analise detalhada",
    view_forecast_details: "Ver detalhes da previsao",
    view_revenue_trends: "Ver tendencias de receita",
    view_growth_analysis: "Ver analise de crescimento",
    view_all_customers: "Ver todos os clientes",
  },
  revenue_type: {
    gross: "Bruto",
    net: "Liquido",
  },
  import_modal: {
    select_file: "Selecionar arquivo",
    confirm_import: "Confirmar importacao",
    upload_description: "Carregue um arquivo CSV com suas transacoes.",
    mapping_description:
      "Mapeamos cada coluna para o que acreditamos estar correto, mas revise os dados abaixo para confirmar a precisao.",
    csv_data_column: "Coluna do CSV",
    midday_data_column: "Coluna do Midday",
    settings: "Configuracoes",
    inverted_amount: "Valor invertido",
    inverted_description:
      "Se as transacoes forem de conta de credito, voce pode inverter o valor.",
    account: "Conta",
    select_account: "Selecionar conta",
    currency: "Moeda",
    confirm_button: "Confirmar importacao",
    choose_another: "Escolher outro arquivo",
    success: "Transacoes importadas com sucesso.",
    error: "Algo deu errado, tente novamente.",
    date: "Data",
    description: "Descricao",
    amount: "Valor",
    balance: "Saldo",
    select_balance: "Selecionar Saldo",
  },
  bank_account: {
    add_account: "Adicionar conta",
    create_title: "Criar Conta",
    name_label: "Nome",
    name_placeholder: "Conta Corrente",
    name_description: "Nome da conta bancaria",
    currency_label: "Moeda",
    currency_placeholder: "Selecionar moeda",
    currency_description: "Moeda da conta",
    create_button: "Criar",
  },
  chat: {
    create_account_title: "Criar conta bancaria",
    create_account_description:
      "Para responder perguntas financeiras, preciso de acesso as suas transacoes e saldos bancarios. Crie uma conta para continuar.",
    create_account_button: "Criar conta",
    maybe_later: "Talvez depois",
  },
  transactions: {
    no_results: "Sem resultados",
    no_results_description: "Tente outra busca ou ajuste os filtros",
    clear_filters: "Limpar filtros",
    no_transactions: "Sem transacoes",
    no_transactions_description:
      "Crie uma conta bancaria para comecar a registrar suas transacoes e obter insights financeiros para tomar decisoes mais inteligentes.",
    add_account: "Adicionar conta",
    import_backfill: "Importar/preencher",
    create_transaction: "Criar transacao",
  },
  vault: {
    empty_title: "Sempre encontre o que precisa",
    empty_description:
      "Arraste e solte ou envie seus documentos. Vamos organiza-los automaticamente com tags baseadas no conteudo, tornando-os faceis e seguros de encontrar.",
    upload: "Enviar",
    search_placeholder: "Buscar ou filtrar",
    no_results: "Sem resultados",
    no_results_description: "Tente outro termo de busca",
    clear_search: "Limpar busca",
    upload_title: "Enviando {count} arquivos",
    upload_description: "Por favor, nao feche o navegador ate concluir",
    upload_success: "Envio concluido com sucesso.",
    upload_error: "Algo deu errado, tente novamente.",
    drop_description: "Solte seus documentos e arquivos aqui.",
    drop_max_files: "Maximo de 25 arquivos por vez.",
    drop_max_size: "Tamanho maximo 5MB",
    file_too_large: "Arquivo muito grande.",
    file_invalid_type: "Tipo de arquivo nao suportado.",
    date_filter: "Data",
    tags_filter: "Tags",
    no_tags: "Nenhuma tag encontrada",
  },
  customers: {
    no_active_client: "Nenhum Cliente Ativo",
    most_active_client: "Cliente Mais Ativo",
    no_client_activity: "Nenhuma atividade nos ultimos 30 dias",
    inactive_clients: "Clientes Inativos",
    no_invoices_tracked: "Sem faturas ou tempo registrado nos ultimos 30 dias",
    no_revenue_client: "Nenhum Cliente com Receita",
    top_revenue_client: "Cliente com Maior Receita",
    no_revenue_generated: "Nenhuma receita gerada nos ultimos 30 dias",
    new_customers: "Novos Clientes",
    added_past_30_days: "Adicionados nos ultimos 30 dias",
    search_customers: "Buscar clientes",
    no_customers: "Nenhum cliente",
    no_customers_description: "Voce ainda nao criou nenhum cliente.",
    create_first: "Va em frente e crie o primeiro.",
    create_customer: "Criar cliente",
    tracked: "registrado",
    and: "e",
    "invoice#one": "fatura",
    "invoice#other": "faturas",
    past_30_days: "nos ultimos 30 dias",
    from: "de",
  },
  chat: {
    create_account_title: "Criar conta bancaria",
    create_account_description:
      "Para responder perguntas financeiras, preciso de acesso as suas transacoes e saldos bancarios. Crie uma conta para continuar.",
    create_account_button: "Criar conta",
    maybe_later: "Talvez depois",
    ask_anything: "Pergunte qualquer coisa",
    search_web: "Pesquisar na web",
    show_latest_transactions: "Mostrar ultimas transacoes",
    show_cash_burn: "Mostrar queima de caixa e top 3 aumentos de fornecedores",
    show_spending_month: "Mostrar onde estamos gastando mais este mes",
    show_weekly_trends: "Mostrar tendencias e insights semanais",
    show_revenue_performance: "Mostrar desempenho de receita",
    show_expense_breakdown: "Mostrar detalhamento de despesas por categoria",
    show_profit_margins: "Mostrar margens de lucro",
    show_cash_runway: "Mostrar fluxo de caixa",
    show_cash_flow_stress: "Mostrar teste de estresse do fluxo de caixa",
    find_untagged: "Encontrar transacoes sem tag do mes passado",
    find_recurring: "Encontrar pagamentos recorrentes",
    analyze_burn_rate: "Analisar tendencias de taxa de queima",
    analyze_spending: "Analisar padroes de gastos",
    analyze_resilience: "Analisar resiliencia financeira",
    show_balance_sheet: "Mostrar balanco patrimonial",
    show_growth_rate: "Mostrar analise de taxa de crescimento",
    analyze_growth: "Analisar tendencias de crescimento de receita",
    show_invoice_analysis: "Mostrar analise de pagamento de faturas",
    analyze_payment_patterns: "Analisar padroes de pagamento de clientes",
    show_tax_summary: "Mostrar resumo de impostos",
    show_tax_breakdown: "Mostrar detalhamento de impostos por categoria",
    show_health_score: "Mostrar pontuacao de saude do negocio",
    analyze_health: "Analisar metricas de saude do negocio",
    show_forecast: "Mostrar previsao de receita",
    analyze_projections: "Analisar projecoes de receita",
    show_expenses_breakdown: "Mostrar detalhamento de despesas",
    analyze_expense_categories: "Analisar categorias de despesas",
    show_revenue_summary: "Mostrar resumo de receita",
    show_revenue_trends: "Mostrar tendencias de receita deste ano",
    show_profit_loss: "Mostrar demonstrativo de lucros e perdas",
    analyze_profit_margins: "Analisar margens de lucro",
    show_account_balances: "Mostrar saldos das contas",
    show_latest_invoices: "Mostrar ultimas faturas",
    find_unpaid_invoices: "Encontrar faturas nao pagas",
    find_overdue_invoices: "Encontrar faturas vencidas",
    show_customers: "Mostrar clientes",
    find_top_customers: "Encontrar melhores clientes",
    show_cash_flow: "Mostrar fluxo de caixa",
    show_cash_flow_month: "Mostrar fluxo de caixa deste mes",
    analyze_cash_flow: "Analisar tendencias de fluxo de caixa",
    show_expenses: "Mostrar despesas",
    show_expenses_month: "Mostrar despesas deste mes",
    analyze_expense_trends: "Analisar tendencias de despesas",
  },
  search: {
    find_anything: "Buscar qualquer coisa...",
  },

  // Table column headers
  table: {
    columns: {
      name: "Nome",
      contact_person: "Pessoa de contato",
      email: "Email",
      invoices: "Faturas",
      projects: "Projetos",
      tags: "Tags",
      actions: "Acoes",
      date: "Data",
      description: "Descricao",
      amount: "Valor",
      category: "Categoria",
      account: "Conta",
      status: "Status",
    },
  },

  // Common actions
  actions: {
    edit: "Editar",
    delete: "Excluir",
    cancel: "Cancelar",
    confirm: "Confirmar",
    save: "Salvar",
    yes: "Sim",
    no: "Nao",
    submit: "Enviar",
    update: "Atualizar",
    add: "Adicionar",
    close: "Fechar",
    open: "Abrir",
    copy: "Copiar",
    export: "Exportar",
    deselect_all: "Desmarcar todos",
  },

  // Dialog and confirmation messages
  dialogs: {
    are_you_sure: "Tem certeza absoluta?",
    delete_confirmation:
      "Esta acao nao pode ser desfeita. Isso excluira permanentemente e removera os dados de nossos servidores.",
    delete_customer_confirmation:
      "Esta acao nao pode ser desfeita. Isso excluira permanentemente este cliente e removera seus dados de nossos servidores.",
    delete_project_confirmation:
      "Esta acao nao pode ser desfeita. Isso excluira permanentemente este projeto e removera seus dados de nossos servidores.",
    delete_product_confirmation:
      "Esta acao nao pode ser desfeita. Isso excluira permanentemente este produto e removera seus dados de nossos servidores.",
    delete_category_confirmation:
      "Esta acao nao pode ser desfeita. Isso excluira permanentemente esta categoria e removera seus dados de nossos servidores.",
    edit_customer: "Editar Cliente",
    edit_project: "Editar Projeto",
    edit_product: "Editar Produto",
    edit_category: "Editar Categoria",
    edit_oauth_application: "Editar Aplicativo OAuth",
    submitting: "Enviando...",
    submit_for_review: "Enviar para revisao",
    cancelling_review: "Cancelando revisao...",
    cancel_review: "Cancelar revisao",
  },

  // Navigation menu labels
  navigation: {
    settings: {
      general: "Geral",
      bank_connections: "Conexoes Bancarias",
      members: "Membros",
      notifications: "Notificacoes",
      developer: "Desenvolvedor",
    },
    account: {
      general: "Geral",
      date_locale: "Data e Localidade",
      security: "Seguranca",
      teams: "Equipes",
      support: "Suporte",
    },
  },

  // Toast and notification messages
  toast: {
    copied_clipboard: "Copiado para a area de transferencia.",
    link_copied: "Link copiado para a area de transferencia.",
    transaction_updated: "Transacao atualizada",
    transaction_url_copied: "URL da transacao copiada para a area de transferencia",
    transaction_url_copy_failed:
      "Falha ao copiar URL da transacao para a area de transferencia",
    sync_success: "Sincronizacao concluida com sucesso",
    sync_failed: "Sincronizacao falhou, tente novamente.",
    syncing: "Sincronizando...",
    upload_success: "Upload concluido com sucesso.",
    upload_failed: "Algo deu errado, tente novamente.",
    file_too_large: "Arquivo muito grande.",
    file_type_invalid: "Tipo de arquivo nao suportado.",
    something_wrong: "Algo deu errado, tente novamente.",
    do_not_close_browser: "Por favor, nao feche o navegador ate concluir",
    submitted_for_review: "Enviado para revisao",
    application_moved_draft: "Aplicativo movido para rascunho",
    client_id_copied: "ID do cliente copiado para a area de transferencia",
    error: "Erro",
  },

  // Form validation messages
  validation: {
    name_required: "Nome e obrigatorio",
    name_min_2: "O nome deve ter pelo menos 2 caracteres.",
    name_min_1: "O nome deve ter pelo menos 1 caractere.",
    email_invalid: "Email nao e valido.",
  },

  // OAuth error messages
  oauth: {
    invalid_request: "Requisicao OAuth invalida",
    inactive_app: "Aplicativo OAuth inativo",
    auth_required: "Autenticacao necessaria",
    code_expired: "Codigo de autorizacao expirado",
    code_used: "Codigo de autorizacao ja foi usado",
    refresh_expired: "Token de atualizacao expirado",
    refresh_revoked: "Token de atualizacao revogado",
    invalid_refresh: "Token de atualizacao invalido",
    unsupported_grant: "Tipo de concessao nao suportado",
    server_error: "Erro do servidor",
    invalid_code: "Codigo de autorizacao invalido",
    invalid_url: "Formato de URL invalido",
    invalid_redirect: "Formato de URL invalido",
    unauthorized: "Acesso nao autorizado",
    no_scopes:
      "Nenhum escopo fornecido. Por favor, especifique os escopos necessarios para que o usuario possa autorizar este aplicativo.",
    request_timed_out:
      "Esta solicitacao de autorizacao expirou. Por favor, retorne ao aplicativo e inicie um novo processo de autorizacao.",
    rate_limited:
      "Muitas tentativas de autorizacao. Por favor, aguarde alguns minutos antes de tentar novamente.",
  },

  // Empty states and error messages
  empty_states: {
    not_found: "Nao encontrado",
    invoice_not_found: "Fatura nao encontrada",
    no_chats: "Nenhum chat encontrado",
    no_chat_history: "Sem historico de chat",
    no_invites: "Nenhum convite enviado",
    no_tracked_time: "Sem tempo rastreado",
    no_tracked_hours:
      "Nenhuma hora faturavel encontrada para este projeto no intervalo de datas selecionado. Por favor, rastreie algum tempo primeiro.",
    no_notifications: "Sem notificacoes novas",
    nothing_archived: "Nada no arquivo",
    no_expenses: "Nenhuma despesa registrada este mes",
    no_documents: "Nenhum documento ainda",
    no_recurring: "Nenhuma despesa recorrente",
    no_results: "Nenhum resultado encontrado.",
    no_attachments: "Sem anexos",
    no_new_attachments: "Nenhum anexo novo encontrado.",
    none: "Nenhum",
  },

  // Invoice settings
  invoice: {
    add_sales_tax: "Adicionar imposto sobre vendas",
    add_vat: "Adicionar IVA",
    add_discount: "Adicionar desconto",
    add_units: "Adicionar unidades",
    add_qr_code: "Adicionar codigo QR",
    canceled: "Cancelada",
  },

  // Placeholders
  placeholders: {
    note: "Nota",
    email: "Email",
    name: "Nome",
    additional_info: "Informacoes adicionais...",
    search_or_filter: "Buscar ou filtrar",
  },

  // Artifact and chat UI
  artifact: {
    close: "Fechar artefato",
    open: "Abrir artefato",
  },

  // Chat history
  chat_history: {
    delete_chat: "Excluir chat",
    new_chat: "Novo chat",
  },

  // Inbox
  inbox: {
    upload_zone_description: "Carregando {count} arquivos",
    settings: "Configuracoes",
  },

  // Tracker
  tracker: {
    create_invoice: "Criar fatura",
  },

  // Selected items
  selected: {
    count: "{count} selecionado(s)",
  },

  transaction_create: {
    title: "Criar Transacao",
    expense: "Despesa",
    income: "Receita",
    type_description:
      "Selecione se e dinheiro entrando (receita) ou saindo (despesa)",
    description_label: "Descricao",
    description_placeholder: "Ex: Material de escritorio, Pagamento de fatura",
    description_helper: "Uma breve descricao do que e esta transacao",
    amount_label: "Valor",
    amount_placeholder: "0,00",
    amount_helper: "Digite o valor da transacao",
    currency_label: "Moeda",
    currency_helper: "A moeda desta transacao",
    account_label: "Conta",
    account_placeholder: "Selecionar conta",
    account_helper: "A conta a qual esta transacao pertence",
    date_label: "Data",
    date_placeholder: "Selecionar data",
    date_helper: "Quando esta transacao ocorreu",
    category_label: "Categoria",
    category_helper: "Ajuda a organizar e acompanhar suas transacoes",
    assign_label: "Atribuir",
    assign_helper: "Atribuir esta transacao a um membro da equipe",
    attachment: "Anexo",
    attachment_description:
      "Envie recibos, faturas ou outros documentos relacionados a esta transacao",
    exclude_analytics: "Excluir das analises",
    exclude_analytics_description:
      "Exclui esta transacao de analises como lucro, despesa e receita. Util para transferencias internas entre contas para evitar contagem dupla.",
    note: "Nota",
    note_description:
      "Adicione detalhes ou contexto adicional sobre esta transacao",
    note_placeholder: "Nota",
    create_button: "Criar",
  },

  // Form labels and common fields
  forms: {
    // Sections
    sections: {
      general: "Geral",
      details: "Detalhes",
    },

    // Common labels
    labels: {
      name: "Nome",
      email: "Email",
      billing_email: "Email de Cobranca",
      phone: "Telefone",
      website: "Site",
      contact_person: "Pessoa de contato",
      address_line_1: "Endereco Linha 1",
      address_line_2: "Endereco Linha 2",
      country: "Pais",
      city: "Cidade",
      state: "Estado / Provincia",
      zip: "CEP / Codigo Postal",
      expense_tags: "Tags de Despesa",
      vat_number: "CNPJ / CPF / VAT",
      note: "Nota",
      description: "Descricao",
      parent_category: "Categoria Pai (Opcional)",
      report_code: "Codigo de Relatorio",
      tax_type: "Tipo de Imposto",
      tax_rate: "Aliquota de Imposto",
      exclude_reports: "Excluir dos Relatorios",
      price: "Preco",
      unit: "Unidade",
      status: "Status",
      usage: "Uso",
      last_used: "Ultimo Uso",
    },

    // Placeholders
    placeholders: {
      name: "Acme Inc",
      email: "acme@example.com",
      billing_email: "financeiro@exemplo.com",
      phone: "+55 (11) 99999-9999",
      website: "acme.com",
      contact_person: "Joao Silva",
      address_line_1: "Rua Principal, 123",
      address_line_2: "Sala 100",
      city: "Sao Paulo",
      state: "SP",
      zip: "01310-100",
      note: "Informacoes adicionais...",
      search_address: "Buscar endereco",
      description: "Descricao",
      report_code: "Codigo de Relatorio",
    },

    // Descriptions
    descriptions: {
      billing_email:
        "Este e um email adicional que sera usado para enviar faturas.",
      expense_tags:
        "Tags ajudam a categorizar e rastrear despesas do cliente.",
      exclude_reports:
        "Transacoes nesta categoria nao aparecerao em relatorios financeiros",
      category_not_available: "Descricao da categoria nao disponivel",
    },

    // Buttons
    buttons: {
      cancel: "Cancelar",
      create: "Criar",
      update: "Atualizar",
      save: "Salvar",
    },

    // Status
    status: {
      active: "Ativo",
      inactive: "Inativo",
    },
  },

  // Table headers
  table: {
    columns: {
      name: "Nome",
      contact_person: "Pessoa de contato",
      email: "Email",
      invoices: "Faturas",
      projects: "Projetos",
      tags: "Tags",
      actions: "Acoes",
      price: "Preco",
      unit: "Unidade",
      usage: "Uso",
      last_used: "Ultimo Uso",
      status: "Status",
      tax_type: "Tipo de Imposto",
      tax_rate: "Aliquota de Imposto",
      report_code: "Codigo de Relatorio",
      system: "Sistema",
    },
    actions: {
      edit: "Editar",
      edit_customer: "Editar cliente",
      edit_product: "Editar produto",
      edit_category: "Editar categoria",
      delete: "Excluir",
      remove: "Remover",
    },
  },
  // Team Settings page
  settings: {
    company_logo: {
      title: "Logo da empresa",
      description:
        "Este e o logo da sua empresa. Clique no logo para carregar um personalizado dos seus arquivos.",
      avatar_optional: "Um avatar e opcional, mas fortemente recomendado.",
    },
    company_name: {
      title: "Nome da empresa",
      description:
        "Este e o nome visivel da sua empresa no Midday. Por exemplo, o nome da sua empresa ou departamento.",
      max_characters: "Por favor, use no maximo 32 caracteres.",
    },
    company_email: {
      title: "Email da empresa",
      description:
        "Este e o endereco de email que sera usado para receber emails do Midday.",
    },
    company_country: {
      title: "Pais da empresa",
      description: "Este e o pais de origem da sua empresa.",
      placeholder: "Selecionar pais",
    },
    base_currency: {
      title: "Moeda base",
      description:
        "Se voce tem multiplas moedas, pode definir uma moeda base para sua conta para visualizar seu saldo total na moeda de sua preferencia. As taxas de cambio sao atualizadas a cada 24 horas.",
      update_title: "Atualizar moeda base",
      update_description:
        "Isso atualizara a moeda base para todas as transacoes e saldos de contas.",
      update_button: "Atualizar",
      updating: "Atualizando...",
      updating_description:
        "Estamos atualizando sua moeda base, por favor aguarde.",
      success: "Transacoes e saldos de contas atualizados.",
      error: "Algo deu errado, por favor tente novamente.",
    },
    fiscal_year: {
      title: "Ano fiscal",
      description:
        "Defina quando seu ano fiscal comeca. Isso determina os intervalos de datas padrao para todos os relatorios e widgets em todo o aplicativo.",
    },
    delete_team: {
      title: "Excluir equipe",
      description:
        "Remova permanentemente sua Equipe e todo o seu conteudo da plataforma Midday. Esta acao nao e reversivel - por favor, proceda com cautela.",
      button: "Excluir",
    },
  },

  // Gestão de Clube de Poker
  poker: {
    players: {
      title: "Jogadores",
      description: "Gerencie os jogadores e agentes do seu clube de poker",
      no_players: "Nenhum jogador ainda",
      no_players_description:
        "Comece adicionando seu primeiro jogador ao clube.",
      create_player: "Adicionar Jogador",
      search_placeholder: "Buscar jogadores...",
      filter: {
        all_types: "Todos os Tipos",
        players_only: "Apenas Jogadores",
        agents_only: "Apenas Agentes",
        all_statuses: "Todos os Status",
        active: "Ativo",
        inactive: "Inativo",
        suspended: "Suspenso",
        blacklisted: "Bloqueado",
        all_agents: "Todos os Agentes",
      },
      table: {
        player: "Jogador",
        pppoker_id: "ID PPPoker",
        status: "Status",
        agent: "Agente",
        balance: "Saldo",
        chips: "Fichas",
        credit_limit: "Limite de Crédito",
        contact: "Contato",
      },
      status: {
        active: "Ativo",
        inactive: "Inativo",
        suspended: "Suspenso",
        blacklisted: "Bloqueado",
      },
      type: {
        player: "Jogador",
        agent: "Agente",
      },
      actions: {
        edit: "Editar",
        copy_id: "Copiar ID PPPoker",
        whatsapp: "WhatsApp",
        delete: "Excluir",
      },
      form: {
        title_create: "Adicionar Jogador",
        title_edit: "Editar Jogador",
        pppoker_id: "ID PPPoker",
        pppoker_id_placeholder: "12345678",
        pppoker_id_description: "Identificador único do jogador no PPPoker",
        nickname: "Apelido",
        nickname_placeholder: "NickDoJogador",
        nickname_description: "Nome de exibição no clube",
        memo_name: "Nome de Memorando",
        memo_name_placeholder: "Nome real ou anotação",
        memo_name_description: "Nome de referência interno (opcional)",
        type: "Tipo",
        type_description: "Jogador ou Agente",
        status: "Status",
        status_description: "Status atual da conta",
        agent: "Agente",
        agent_placeholder: "Selecionar agente",
        agent_description: "Atribuir um agente a este jogador",
        email: "E-mail",
        email_placeholder: "jogador@exemplo.com",
        phone: "Telefone",
        phone_placeholder: "+55 11 99999-9999",
        credit_limit: "Limite de Crédito",
        credit_limit_placeholder: "0,00",
        credit_limit_description: "Crédito máximo permitido",
        is_vip: "Jogador VIP",
        is_vip_description: "Marcar como VIP para tratamento especial",
        is_shark: "Jogador Shark",
        is_shark_description: "Marcar como shark (jogador com alto ROI)",
        note: "Observações",
        note_placeholder: "Anotações adicionais sobre este jogador...",
        create_button: "Adicionar Jogador",
        update_button: "Salvar Alterações",
        delete_title: "Excluir Jogador",
        delete_description:
          "Esta ação não pode ser desfeita. Isso excluirá permanentemente este jogador e todos os dados associados.",
        delete_button: "Excluir Jogador",
      },
      toast: {
        created: "Jogador adicionado com sucesso",
        updated: "Jogador atualizado com sucesso",
        deleted: "Jogador excluído com sucesso",
        id_copied: "ID PPPoker copiado para a área de transferência",
      },
    },
    agents: {
      title: "Agentes",
      description: "Gerencie agentes e suas comissões",
      no_agents: "Nenhum agente ainda",
      no_agents_description:
        "Comece adicionando seu primeiro agente ao clube.",
      create_agent: "Adicionar Agente",
      search_placeholder: "Buscar agentes...",
      table: {
        agent: "Agente",
        pppoker_id: "ID PPPoker",
        status: "Status",
        rakeback: "Rakeback %",
        super_agent: "Super Agente",
        balance: "Saldo",
        contact: "Contato",
        player_count: "Jogadores",
      },
      actions: {
        edit: "Editar",
        view_players: "Ver Jogadores",
        copy_id: "Copiar ID PPPoker",
        whatsapp: "WhatsApp",
        delete: "Excluir",
      },
      toast: {
        created: "Agente adicionado com sucesso",
        updated: "Agente atualizado com sucesso",
        deleted: "Agente excluído com sucesso",
      },
    },
    sessions: {
      title: "Sessões",
      description: "Visualize e audite sessões de jogo",
      no_sessions: "Nenhuma sessão ainda",
      no_sessions_description:
        "As sessões aparecerão aqui após a importação dos jogos.",
      search_placeholder: "Buscar sessões...",
      filter: {
        all_types: "Todos os Tipos",
        all_games: "Todos os Jogos",
      },
      type: {
        cash_game: "Cash Game",
        mtt: "MTT",
        sit_n_go: "Sit&Go",
        spin: "SPIN",
      },
      table: {
        session: "Sessão",
        type: "Tipo",
        game: "Jogo",
        blinds: "Blinds",
        players: "Jogadores",
        buy_ins: "Buy-ins",
        rake: "Rake",
        duration: "Duração",
        host: "Host",
      },
    },
    settlements: {
      title: "Acertos",
      description: "Acertos semanais e pagamentos",
      no_settlements: "Nenhum acerto ainda",
      no_settlements_description:
        "Os acertos aparecerão aqui após fechar semanas.",
      filter: {
        all_statuses: "Todos os Status",
      },
      status: {
        pending: "Pendente",
        partial: "Parcial",
        completed: "Concluído",
        disputed: "Contestado",
        cancelled: "Cancelado",
      },
      table: {
        period: "Período",
        player_agent: "Jogador/Agente",
        status: "Status",
        gross: "Bruto",
        net: "Líquido",
        paid: "Pago",
      },
    },
    import: {
      title: "Importar Dados",
      description: "Importe dados das exportações do PPPoker",
      recentImports: "Importações Recentes",
      noImports: "Nenhuma importação ainda",
      supportedFormats: "Formatos suportados: CSV, XLS, XLSX",
      helpLink: "Guia de Exportação",
      dragOrClick: "Arraste e solte um arquivo ou clique para selecionar",
      dropHere: "Solte o arquivo aqui",
      processing: "Processando arquivo...",
      uploadSuccess: "Arquivo enviado com sucesso",
      uploadError: "Falha ao enviar arquivo",
      parseError: "Falha ao processar arquivo",
      noDataFound: "Nenhum dado válido encontrado no arquivo",
      excelNotSupported: "Arquivos Excel ainda não suportados",
      exportAsCsv: "Por favor, exporte seu arquivo como CSV primeiro",
      validate: "Validar",
      process: "Processar",
      validateSuccess: "Importação validada com sucesso",
      validateError: "Falha na validação",
      processSuccess: "Importação processada com sucesso",
      processError: "Falha no processamento",
      cancelSuccess: "Importação cancelada",
      deleteSuccess: "Importação excluída",
      cancelled: "Importação cancelada pelo usuário",
      totalPlayers: "Total de Jogadores",
      newPlayers: "Novos Jogadores",
      updatedPlayers: "Jogadores Atualizados",
      totalTransactions: "Transações",
      period: "Período",
      errors: "Erros",
      warnings: "Avisos",
      loadMore: "Carregar mais",
      status: {
        pending: "Pendente",
        validating: "Validando",
        validated: "Validado",
        processing: "Processando",
        completed: "Concluído",
        failed: "Falhou",
        cancelled: "Cancelado",
      },
    },
    dashboard: {
      title: "Painel do Poker",
      description: "Visão geral do seu clube de poker",
      totalPlayers: "Total de Jogadores",
      activeAgents: "Agentes Ativos",
      activePlayers: "Jogadores Ativos",
      pendingSettlements: "Acertos Pendentes",
      topPlayers: "Top Jogadores",
      debtors: "Devedores",
      totalDebt: "Dívida Total",
      noPlayersYet: "Nenhum jogador ainda",
      noDebtors: "Sem devedores - todos os saldos são positivos!",
      viewSettlements: "Ver Acertos",
      quickActions: "Ações Rápidas",
      viewAll: "Ver todos",
    },
    widgets: {
      grossRake: "Rake Bruto",
      totalRakeCollected: "Total de rake coletado",
      bankResult: "Resultado da Banca",
      netBankResult: "Resultado líquido da banca",
      revenueByGame: "Receita por Jogo",
      noGameData: "Sem dados de jogos disponíveis",
    },
    closeWeek: {
      button: "Fechar Semana",
      title: "Fechar Período Semanal",
      description:
        "Isso criará acertos para todos os jogadores com saldos pendentes e zerará seus saldos de fichas. Esta ação não pode ser desfeita.",
      confirm: "Fechar Semana",
      processing: "Processando...",
      success: "Semana fechada com sucesso",
      successDescription: "{count} acertos criados",
      error: "Falha ao fechar semana",
    },
  },
} as const;
