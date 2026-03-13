export type AppLocale = "pt-BR" | "en-US";

type Dictionary = {
    appName: string;
    dashboard: string;
    inbox: string;
    reports: string;
    deepDive: string;
    profile: string;
    settings: string;
    logout: string;
    userFallback: string;
    currentPlan: string;
    reportsThisMonth: string;
    remaining: string;
    activeDeepDives: string;
    updatesInbox: string;
    updatesInboxDescription: string;
    openInbox: string;
    latestReport: string;
    latestPipelineItem: string;
    viewHistory: string;
    openReport: string;
    reportFallbackTitle: string;
    firstReportPending: string;
    nextRecommendedStep: string;
    nextStepDescription: string;
    requestDeepDive: string;
    reviewHistory: string;
    deliveredInProgress: (delivered: number, pending: number) => string;
    recentHistory: string;
    recentHistoryDescription: string;
    emptyHistory: string;
    recommendations: string;
    reportListTitle: string;
    reportListDescription: string;
    pendingReportsHint: string;
    readyCount: string;
    inProgressCount: string;
    errorCount: string;
    createdOn: (date: string) => string;
    completedOn: (date: string) => string;
    noReportsYet: string;
    generateNewReport: string;
    generatingReport: string;
    inboxTitle: string;
    inboxDescription: string;
    inboxHeroTitle: string;
    inboxHeroDescription: string;
    reportReady: string;
    reportInProgress: string;
    deliveryBadge: string;
    queueBadge: string;
    deepDiveBadge: string;
    deepDiveDelivered: string;
    deepDiveUpdated: string;
    deepDiveUpdateFallback: string;
    emptyInbox: string;
    deepDiveTitle: string;
    deepDiveDescription: string;
    newRequest: string;
    newRequestDescription: string;
    deepDiveTopic: string;
    topicPlaceholder: string;
    referenceReport: string;
    optionalSelect: string;
    additionalContext: string;
    contextPlaceholder: string;
    requestHint: string;
    sending: string;
    requestSent: string;
    previousRequests: string;
    noDeepDiveYet: string;
    teamResponse: string;
    profileTitle: string;
    profileDescription: string;
    account: string;
    email: string;
    contact: string;
    whatsapp: string;
    plan: string;
    frequency: string;
    company: string;
    industry: string;
    size: string;
    location: string;
    preferences: string;
    tone: string;
    language: string;
    market: string;
    audience: string;
    productsServices: string;
    notDefined: string;
    editProfileHint: string;
    chatOnWhatsApp: string;
    backToReports: string;
    intelligenceReport: string;
    summary: string;
    insightsCovered: (insights: number, niches: number) => string;
    reportPdf: string;
    fullPdf: string;
    onePagePdf: string;
    socialPack: string;
    downloadFullPack: string;
    audioBriefing: string;
    downloadMp3: string;
    whatsappCopy: string;
    copyText: string;
    processingReportHint: string;
    processingAutoRefreshHint: string;
    noFilesAvailable: string;
    emailSentOn: (date: string) => string;
    settingsTitle: string;
    settingsDescription: string;
    scheduleSection: string;
    scheduleDescription: string;
    scheduleTimezone: string;
    scheduleWindowStart: string;
    scheduleWindowEnd: string;
    scheduleBusinessDaysOnly: string;
    schedulePreferredWeekday: string;
    schedulePreferredDayOfMonth: string;
    scheduleSave: string;
    scheduleSaved: string;
    generateNowSection: string;
    generateNowDescription: string;
    generateNowButton: string;
    generateNowGenerating: string;
    generateNowSuccess: string;
    generateNowQuotaUsed: (used: number, limit: number) => string;
    generateNowLimitReached: string;
    generateNowUpgradeHint: string;
    generateNowUpgradeButton: string;
    generateNowFirstFree: string;
    generateNowFirstFreeHint: string;
    weekdays: Record<string, string>;
    generateReportCta: string;
    statuses: Record<string, string>;
    frequencies: Record<string, string>;
    tones: Record<string, string>;
    languages: Record<string, string>;
    locale: AppLocale;
    // Niches
    myNiches: string;
    nichesTitle: string;
    nichesDescription: string;
    nicheName: string;
    nicheRelevance: string;
    nichePrimary: string;
    nicheSecondary: string;
    nicheActive: string;
    nicheInactive: string;
    addNiche: string;
    deleteNiche: string;
    deleteNicheConfirm: string;
    nicheSaved: string;
    nicheAdded: string;
    nicheDeleted: string;
    nicheSaveError: string;
    nicheEmptyName: string;
    noNichesYet: string;
    nichesHint: string;
};

const dictionaries: Record<AppLocale, Dictionary> = {
    "pt-BR": {
        appName: "Guilds",
        dashboard: "Dashboard",
        inbox: "Inbox",
        reports: "Meus Relatórios",
        deepDive: "Deep Dive",
        profile: "Meu Perfil",
        settings: "Configurações",
        logout: "Sair",
        userFallback: "Usuário",
        currentPlan: "Plano atual",
        reportsThisMonth: "Relatórios este mês",
        remaining: "Restantes",
        activeDeepDives: "Deep dives ativos",
        updatesInbox: "Inbox de atualizações",
        updatesInboxDescription: "Acompanhe entregas, fila e respostas de deep dive em um único lugar.",
        openInbox: "Abrir inbox",
        latestReport: "Último relatório",
        latestPipelineItem: "O item mais recente da sua esteira.",
        viewHistory: "Ver histórico",
        openReport: "Abrir relatório",
        reportFallbackTitle: "Relatório",
        firstReportPending: "Seu primeiro relatório ainda não apareceu por aqui. Assim que estiver pronto, ele será exibido neste painel.",
        nextRecommendedStep: "Próximo passo recomendado",
        nextStepDescription: "Use um deep dive para transformar um insight do relatório em análise acionável para sua operação.",
        requestDeepDive: "Solicitar Deep Dive",
        reviewHistory: "Revisar histórico",
        deliveredInProgress: (delivered, pending) => `Entregues: ${delivered} • Em andamento: ${pending}`,
        recentHistory: "Histórico recente",
        recentHistoryDescription: "Seus últimos relatórios e o status de cada entrega.",
        emptyHistory: "Seu histórico ainda está vazio. Assim que a primeira entrega ficar pronta, ela aparece aqui.",
        recommendations: "Recomendações para seguir avançando",
        reportListTitle: "Meus Relatórios",
        reportListDescription: "Acesse suas entregas, acompanhe o status e retome os principais insights.",
        pendingReportsHint: "Há relatórios em andamento. Esta página atualiza automaticamente enquanto houver fila ativa.",
        readyCount: "Prontos",
        inProgressCount: "Em andamento",
        errorCount: "Com erro",
        createdOn: (date) => `Criado em ${date}`,
        completedOn: (date) => `Concluído em ${date}`,
        noReportsYet: "Nenhum relatório disponível ainda. Seu primeiro relatório está sendo preparado.",
        generateNewReport: "Gerar relatório",
        generatingReport: "Gerando...",
        inboxTitle: "Inbox",
        inboxDescription: "Atualizações recentes das suas entregas, fila e deep dives.",
        inboxHeroTitle: "Acompanhe novidades por aqui",
        inboxHeroDescription: "Esta inbox resume relatórios prontos, itens em fila e atualizações de deep dive.",
        reportReady: "Relatório pronto",
        reportInProgress: "Relatório em andamento",
        deliveryBadge: "Entrega",
        queueBadge: "Fila",
        deepDiveBadge: "Deep Dive",
        deepDiveDelivered: "Deep dive entregue",
        deepDiveUpdated: "Atualização de deep dive",
        deepDiveUpdateFallback: "Sua solicitação de deep dive teve atualização.",
        emptyInbox: "Sua inbox ainda está vazia. As próximas entregas e atualizações aparecerão aqui.",
        deepDiveTitle: "Deep Dive",
        deepDiveDescription: "Solicite uma análise aprofundada sobre qualquer tema do seu relatório.",
        newRequest: "Nova solicitação",
        newRequestDescription: "Defina o tema, o contexto e o relatório de referência para acelerar a análise.",
        deepDiveTopic: "Tema do deep dive *",
        topicPlaceholder: "Ex: Aprofundar as oportunidades de IA generativa no meu setor e o impacto prático para a operação comercial.",
        referenceReport: "Relatório de referência",
        optionalSelect: "Selecione (opcional)",
        additionalContext: "Contexto adicional",
        contextPlaceholder: "Quais decisões você precisa tomar com essa análise?",
        requestHint: "Quanto mais específico o pedido, melhor a entrega. Tente incluir o contexto, a decisão que precisa tomar e o recorte que quer aprofundar.",
        sending: "Enviando...",
        requestSent: "Solicitação enviada!",
        previousRequests: "Solicitações anteriores",
        noDeepDiveYet: "Nenhuma solicitação de deep dive ainda. Use o formulário acima para pedir uma análise aprofundada.",
        teamResponse: "Resposta da equipe:",
        profileTitle: "Meu Perfil",
        profileDescription: "Seus dados e configurações da empresa",
        account: "Conta",
        email: "Email",
        contact: "Contato",
        whatsapp: "WhatsApp",
        plan: "Plano",
        frequency: "Frequência",
        company: "Empresa",
        industry: "Setor",
        size: "Tamanho",
        location: "Localização",
        preferences: "Preferências",
        tone: "Tom",
        language: "Idioma",
        market: "Mercado",
        audience: "Público-alvo",
        productsServices: "Produtos/Serviços",
        notDefined: "Não definido",
        editProfileHint: "Para alterar dados do perfil, entre em contato:",
        chatOnWhatsApp: "Falar pelo WhatsApp",
        backToReports: "Voltar aos relatórios",
        intelligenceReport: "Relatório de Inteligência",
        summary: "Resumo",
        insightsCovered: (insights, niches) => `${insights} insights identificados • ${niches} nichos cobertos`,
        reportPdf: "Relatório PDF",
        fullPdf: "PDF Completo",
        onePagePdf: "PDF One Page",
        socialPack: "Pack Social Media",
        downloadFullPack: "Baixar Pack Completo (.zip)",
        audioBriefing: "Áudio Briefing",
        downloadMp3: "Baixar MP3",
        whatsappCopy: "Copy para WhatsApp",
        copyText: "Copiar texto",
        processingReportHint: "Este relatório ainda está sendo processado. Os arquivos aparecerão aqui automaticamente quando estiverem prontos.",
        processingAutoRefreshHint: "Esta página atualiza automaticamente enquanto o processamento estiver em andamento.",
        noFilesAvailable: "Nenhum arquivo disponível para este relatório.",
        emailSentOn: (date) => `Email enviado em ${date}`,
        settingsTitle: "Configurações",
        settingsDescription: "Gerencie sua agenda de relatórios e solicite relatórios sob demanda.",
        scheduleSection: "Agenda de entrega",
        scheduleDescription: "Configure quando você prefere receber seus relatórios de inteligência.",
        scheduleTimezone: "Fuso horário",
        scheduleWindowStart: "Horário inicial da janela de envio",
        scheduleWindowEnd: "Horário final da janela de envio",
        scheduleBusinessDaysOnly: "Apenas dias úteis",
        schedulePreferredWeekday: "Dia preferido da semana",
        schedulePreferredDayOfMonth: "Dia preferido do mês (1-28)",
        scheduleSave: "Salvar preferências",
        scheduleSaved: "Preferências salvas com sucesso!",
        generateNowSection: "Gerar relatório agora",
        generateNowDescription: "Solicite um relatório de inteligência imediatamente, consumindo uma unidade da sua cota mensal.",
        generateNowButton: "Gerar meu relatório agora",
        generateNowGenerating: "Gerando...",
        generateNowSuccess: "Relatório solicitado com sucesso! Acompanhe na sua dashboard.",
        generateNowQuotaUsed: (used, limit) => `${used} de ${limit} relatórios utilizados este mês`,
        generateNowLimitReached: "Você atingiu o limite de relatórios do seu plano este mês.",
        generateNowUpgradeHint: "Quer mais relatórios? Faça upgrade do seu plano para aumentar sua cota mensal.",
        generateNowUpgradeButton: "Ver planos disponíveis",
        generateNowFirstFree: "Seu primeiro relatório é grátis!",
        generateNowFirstFreeHint: "Este relatório não será descontado da sua cota mensal.",
        weekdays: {
            "0": "Domingo",
            "1": "Segunda-feira",
            "2": "Terça-feira",
            "3": "Quarta-feira",
            "4": "Quinta-feira",
            "5": "Sexta-feira",
            "6": "Sábado",
            none: "Sem preferência",
        },
        generateReportCta: "Gerar relatório agora",
        statuses: {
            done: "Pronto",
            processing: "Processando",
            error: "Com erro",
            queued: "Na fila",
        },
        frequencies: {
            daily: "Diário",
            weekly: "Semanal",
            biweekly: "Quinzenal",
            monthly: "Mensal",
            business_days: "Dias úteis",
        },
        tones: {
            profissional: "Profissional",
            casual: "Casual",
            tecnico: "Técnico",
            inspiracional: "Inspiracional",
        },
        languages: {
            "pt-BR": "Português",
            "en-US": "English",
            en: "English",
            es: "Español",
            "es-ES": "Español",
        },
        locale: "pt-BR",
        // Niches
        myNiches: "Meus Nichos",
        nichesTitle: "Meus Nichos",
        nichesDescription: "Gerencie os nichos de mercado que a IA monitora para gerar seus relatórios.",
        nicheName: "Nome do nicho",
        nicheRelevance: "Relevância",
        nichePrimary: "Primário",
        nicheSecondary: "Secundário",
        nicheActive: "Ativo",
        nicheInactive: "Inativo",
        addNiche: "Adicionar nicho",
        deleteNiche: "Excluir",
        deleteNicheConfirm: "Excluir este nicho?",
        nicheSaved: "Nicho atualizado!",
        nicheAdded: "Nicho adicionado!",
        nicheDeleted: "Nicho removido!",
        nicheSaveError: "Erro ao salvar. Tente novamente.",
        nicheEmptyName: "O nome do nicho não pode ficar vazio.",
        noNichesYet: "Nenhum nicho configurado ainda.",
        nichesHint: "Os nichos definem os temas de mercado que a IA busca e analisa para gerar seus relatórios de inteligência.",
    },
    "en-US": {
        appName: "Guilds",
        dashboard: "Dashboard",
        inbox: "Inbox",
        reports: "My Reports",
        deepDive: "Deep Dive",
        profile: "My Profile",
        settings: "Settings",
        logout: "Sign out",
        userFallback: "User",
        currentPlan: "Current plan",
        reportsThisMonth: "Reports this month",
        remaining: "Remaining",
        activeDeepDives: "Active deep dives",
        updatesInbox: "Updates inbox",
        updatesInboxDescription: "Track deliveries, queue activity, and deep dive replies in one place.",
        openInbox: "Open inbox",
        latestReport: "Latest report",
        latestPipelineItem: "The most recent item in your pipeline.",
        viewHistory: "View history",
        openReport: "Open report",
        reportFallbackTitle: "Report",
        firstReportPending: "Your first report is not here yet. As soon as it is ready, it will appear on this dashboard.",
        nextRecommendedStep: "Recommended next step",
        nextStepDescription: "Use a deep dive to turn one report insight into an actionable analysis for your operation.",
        requestDeepDive: "Request Deep Dive",
        reviewHistory: "Review history",
        deliveredInProgress: (delivered, pending) => `Delivered: ${delivered} • In progress: ${pending}`,
        recentHistory: "Recent history",
        recentHistoryDescription: "Your latest reports and the status of each delivery.",
        emptyHistory: "Your history is still empty. As soon as the first delivery is ready, it will appear here.",
        recommendations: "Recommendations to keep moving",
        reportListTitle: "My Reports",
        reportListDescription: "Access your deliveries, track status, and revisit the main insights.",
        pendingReportsHint: "There are reports in progress. This page refreshes automatically while there is an active queue.",
        readyCount: "Ready",
        inProgressCount: "In progress",
        errorCount: "Errors",
        createdOn: (date) => `Created on ${date}`,
        completedOn: (date) => `Completed on ${date}`,
        noReportsYet: "No reports are available yet. Your first report is being prepared.",
        generateNewReport: "Generate report",
        generatingReport: "Generating...",
        inboxTitle: "Inbox",
        inboxDescription: "Recent updates about your deliveries, queue, and deep dives.",
        inboxHeroTitle: "Keep up with what is new",
        inboxHeroDescription: "This inbox summarizes ready reports, queued items, and deep dive updates.",
        reportReady: "Report ready",
        reportInProgress: "Report in progress",
        deliveryBadge: "Delivery",
        queueBadge: "Queue",
        deepDiveBadge: "Deep Dive",
        deepDiveDelivered: "Deep dive delivered",
        deepDiveUpdated: "Deep dive update",
        deepDiveUpdateFallback: "Your deep dive request received an update.",
        emptyInbox: "Your inbox is still empty. Upcoming deliveries and updates will appear here.",
        deepDiveTitle: "Deep Dive",
        deepDiveDescription: "Request a deeper analysis about any topic from your report.",
        newRequest: "New request",
        newRequestDescription: "Define the topic, context, and reference report to speed up the analysis.",
        deepDiveTopic: "Deep dive topic *",
        topicPlaceholder: "Example: Explore generative AI opportunities in my sector and the practical impact on our commercial operation.",
        referenceReport: "Reference report",
        optionalSelect: "Select (optional)",
        additionalContext: "Additional context",
        contextPlaceholder: "What decision do you need to make with this analysis?",
        requestHint: "The more specific the request, the better the delivery. Try to include context, the decision you need to make, and the angle you want to explore.",
        sending: "Sending...",
        requestSent: "Request sent!",
        previousRequests: "Previous requests",
        noDeepDiveYet: "No deep dive requests yet. Use the form above to ask for a deeper analysis.",
        teamResponse: "Team response:",
        profileTitle: "My Profile",
        profileDescription: "Your company data and settings",
        account: "Account",
        email: "Email",
        contact: "Contact",
        whatsapp: "WhatsApp",
        plan: "Plan",
        frequency: "Frequency",
        company: "Company",
        industry: "Industry",
        size: "Size",
        location: "Location",
        preferences: "Preferences",
        tone: "Tone",
        language: "Language",
        market: "Market",
        audience: "Target audience",
        productsServices: "Products/Services",
        notDefined: "Not defined",
        editProfileHint: "To update your profile data, contact us:",
        chatOnWhatsApp: "Chat on WhatsApp",
        backToReports: "Back to reports",
        intelligenceReport: "Intelligence Report",
        summary: "Summary",
        insightsCovered: (insights, niches) => `${insights} insights identified • ${niches} niches covered`,
        reportPdf: "PDF report",
        fullPdf: "Full PDF",
        onePagePdf: "One-page PDF",
        socialPack: "Social Media Pack",
        downloadFullPack: "Download full pack (.zip)",
        audioBriefing: "Audio briefing",
        downloadMp3: "Download MP3",
        whatsappCopy: "WhatsApp copy",
        copyText: "Copy text",
        processingReportHint: "This report is still being processed. The files will appear here automatically when they are ready.",
        processingAutoRefreshHint: "This page refreshes automatically while processing is still running.",
        noFilesAvailable: "No files are available for this report.",
        emailSentOn: (date) => `Email sent on ${date}`,
        settingsTitle: "Settings",
        settingsDescription: "Manage your report schedule and request reports on demand.",
        scheduleSection: "Delivery schedule",
        scheduleDescription: "Configure when you prefer to receive your intelligence reports.",
        scheduleTimezone: "Timezone",
        scheduleWindowStart: "Delivery window start hour",
        scheduleWindowEnd: "Delivery window end hour",
        scheduleBusinessDaysOnly: "Business days only",
        schedulePreferredWeekday: "Preferred weekday",
        schedulePreferredDayOfMonth: "Preferred day of month (1-28)",
        scheduleSave: "Save preferences",
        scheduleSaved: "Preferences saved successfully!",
        generateNowSection: "Generate report now",
        generateNowDescription: "Request an intelligence report immediately, using one unit of your monthly quota.",
        generateNowButton: "Generate my report now",
        generateNowGenerating: "Generating...",
        generateNowSuccess: "Report requested successfully! Track it on your dashboard.",
        generateNowQuotaUsed: (used, limit) => `${used} of ${limit} reports used this month`,
        generateNowLimitReached: "You have reached your plan's report limit for this month.",
        generateNowUpgradeHint: "Want more reports? Upgrade your plan to increase your monthly quota.",
        generateNowUpgradeButton: "View available plans",
        generateNowFirstFree: "Your first report is free!",
        generateNowFirstFreeHint: "This report will not count against your monthly quota.",
        weekdays: {
            "0": "Sunday",
            "1": "Monday",
            "2": "Tuesday",
            "3": "Wednesday",
            "4": "Thursday",
            "5": "Friday",
            "6": "Saturday",
            none: "No preference",
        },
        generateReportCta: "Generate report now",
        statuses: {
            done: "Ready",
            processing: "Processing",
            error: "Error",
            queued: "Queued",
        },
        frequencies: {
            daily: "Daily",
            weekly: "Weekly",
            biweekly: "Biweekly",
            monthly: "Monthly",
            business_days: "Business days",
        },
        tones: {
            profissional: "Professional",
            casual: "Casual",
            tecnico: "Technical",
            inspiracional: "Inspirational",
        },
        languages: {
            "pt-BR": "Portuguese",
            "en-US": "English",
            en: "English",
            es: "Spanish",
            "es-ES": "Spanish",
        },
        locale: "en-US",
        // Niches
        myNiches: "My Niches",
        nichesTitle: "My Niches",
        nichesDescription: "Manage the market niches the AI monitors to generate your reports.",
        nicheName: "Niche name",
        nicheRelevance: "Relevance",
        nichePrimary: "Primary",
        nicheSecondary: "Secondary",
        nicheActive: "Active",
        nicheInactive: "Inactive",
        addNiche: "Add niche",
        deleteNiche: "Delete",
        deleteNicheConfirm: "Delete this niche?",
        nicheSaved: "Niche updated!",
        nicheAdded: "Niche added!",
        nicheDeleted: "Niche removed!",
        nicheSaveError: "Save failed. Please try again.",
        nicheEmptyName: "Niche name cannot be empty.",
        noNichesYet: "No niches configured yet.",
        nichesHint: "Niches define the market topics the AI searches and analyzes to generate your intelligence reports.",
    },
};

export function normalizeLocale(value?: string | null): AppLocale {
    if (!value) {
        return "pt-BR";
    }

    const normalized = value.toLowerCase();
    if (normalized.startsWith("en")) {
        return "en-US";
    }

    return "pt-BR";
}

export function getDictionary(value?: string | null) {
    return dictionaries[normalizeLocale(value)];
}

export function formatDate(
    value: string | null | undefined,
    locale?: string | null,
    options?: Intl.DateTimeFormatOptions
) {
    if (!value) {
        return "";
    }

    return new Date(value).toLocaleDateString(normalizeLocale(locale), options);
}

export function formatDateTime(
    value: string | null | undefined,
    locale?: string | null,
    options?: Intl.DateTimeFormatOptions
) {
    if (!value) {
        return "";
    }

    return new Date(value).toLocaleString(normalizeLocale(locale), options);
}
