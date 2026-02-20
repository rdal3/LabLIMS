export interface LabParam {
    id: string;
    label: string;
    category: 'fisicoq' | 'micro' | 'metais' | 'btex';
    unit?: string;
    options?: string[]; // Para selects
    isColumn?: boolean; // Se true, salva em coluna SQL dedicada. Se false, salva no JSON 'params'
    method?: string;
    ld?: string;
    lq?: string;
}

export interface AnalyticalMatrix {
    id: string;
    name: string;
    prefix: string;
    description: string;
    analyses: string[]; // IDs dos parâmetros incluídos
    groups?: {
        fisicoQuimicos?: string[];
        microbiologicos?: string[];
        metais?: string[];
        btex?: string[];
    };
}

export const LAB_PARAMS: LabParam[] = [
    // ========== FÍSICO-QUÍMICOS ==========
    { id: 'temperatura', label: 'Temperatura', category: 'fisicoq', unit: '°C', isColumn: true },
    { id: 'ph', label: 'pH', category: 'fisicoq', unit: '', isColumn: true },
    { id: 'turbidez', label: 'Turbidez', category: 'fisicoq', unit: 'uT', isColumn: true },
    { id: 'condutividade', label: 'Condutividade Elétrica', category: 'fisicoq', unit: 'µS/cm', isColumn: true },
    { id: 'std', label: 'Sólidos Totais Dissolvidos', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'cloreto', label: 'Cloreto', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'cloroResidual', label: 'Cloro Residual Livre', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'corAparente', label: 'Cor Aparente', category: 'fisicoq', unit: 'uH', isColumn: true },
    { id: 'ferroTotal', label: 'Ferro', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'trihalometanos', label: 'Trihalometanos Totais', category: 'fisicoq', unit: 'mg/L', isColumn: true },

    // Parâmetros adicionais
    { id: 'od', label: 'OD', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'oleosGraxas', label: 'Óleos e Graxas', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'salinidade', label: 'Salinidade', category: 'fisicoq', unit: '‰', isColumn: true },
    { id: 'sts', label: 'STS', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'corVerdadeira', label: 'Cor Verdadeira', category: 'fisicoq', unit: 'uH', isColumn: true },
    { id: 'dbo', label: 'DBO', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'dqo', label: 'DQO', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'nNitrato', label: 'N-Nitrato', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'nNitrito', label: 'N-Nitrito', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'nAmoniacal', label: 'N-Amoniacal', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'sulfato', label: 'Sulfato', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'fosforoTotal', label: 'Fósforo Total', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'alcalinidade', label: 'Alcalinidade', category: 'fisicoq', unit: 'mg/L CaCO₃', isColumn: true },
    { id: 'sst', label: 'SST', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'ssv', label: 'SSV', category: 'fisicoq', unit: 'mg/L', isColumn: true },
    { id: 'solidosSedimentaveis', label: 'Sólidos Sedimentáveis', category: 'fisicoq', unit: 'mL/L', isColumn: true },

    // ========== MICROBIOLOGIA ==========
    {
        id: 'coliformesTotais',
        label: 'Coliformes Totais',
        category: 'micro',
        options: ['Ausente', 'Presente'],
        isColumn: true
    },
    {
        id: 'coliformesTermotolerantes',
        label: 'Coliformes Termotolerantes',
        category: 'micro',
        options: ['Ausente', 'Presente'],
        isColumn: true
    },
    {
        id: 'escherichiaColi',
        label: 'E. coli',
        category: 'micro',
        options: ['Ausente', 'Presente'],
        isColumn: true
    },
    {
        id: 'bacteriasHeterotroficas',
        label: 'Bactérias Heterotróficas',
        category: 'micro',
        options: ['< 500 UFC/mL', '> 500 UFC/mL'],
        isColumn: true
    },

    // ========== METAIS ==========
    { id: 'aluminio', label: 'Alumínio', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'bario', label: 'Bário', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'cadmio', label: 'Cádmio', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'chumbo', label: 'Chumbo', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'cobre', label: 'Cobre', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'niquel', label: 'Níquel', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'cromo', label: 'Cromo', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'ferro', label: 'Ferro', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'manganes', label: 'Manganês', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'sodio', label: 'Sódio', category: 'metais', unit: 'mg/L', isColumn: true },
    { id: 'zinco', label: 'Zinco', category: 'metais', unit: 'mg/L', isColumn: true },

    // ========== BTEX ==========
    { id: 'benzeno', label: 'Benzeno', category: 'btex', unit: 'µg/L', isColumn: true },
    { id: 'tolueno', label: 'Tolueno', category: 'btex', unit: 'µg/L', isColumn: true },
    { id: 'etilbenzeno', label: 'Etilbenzeno', category: 'btex', unit: 'µg/L', isColumn: true },
    { id: 'xilenosTotais', label: 'Xilenos Totais', category: 'btex', unit: 'µg/L', isColumn: true },
];

// ========== MATRIZES ANALÍTICAS ==========
export const ANALYTICAL_MATRICES: AnalyticalMatrix[] = [
    {
        id: 'rd-mensal',
        name: 'Rede de Distribuição (Mensal)',
        prefix: 'RD-',
        description: 'Monitoramento mensal da rede de distribuição de água tratada',
        analyses: [
            'corAparente',
            'turbidez',
            'cloroResidual',
            'coliformesTotais',
            'escherichiaColi',
            'bacteriasHeterotroficas',
            'std',
            'ph',
            'condutividade',
            'temperatura',
            'trihalometanos',
            'cloreto',
            'ferroTotal'
        ]
    },
    {
        id: 'eta-semanal',
        name: 'ETA (Semanal)',
        prefix: 'ETA-S-',
        description: 'Controle semanal da qualidade na Estação de Tratamento de Água',
        analyses: [
            'corAparente',
            'temperatura',
            'condutividade',
            'turbidez',
            'std',
            'cloroResidual',
            'ph',
            'coliformesTotais',
            'escherichiaColi'
        ]
    },
    {
        id: 'eta-mensal',
        name: 'ETA (Mensal)',
        prefix: 'ETA-M-',
        description: 'Análise mensal completa da ETA com pacote expandido',
        analyses: [
            // Físico-químicos
            'ferroTotal',
            'cloreto',
            'trihalometanos',
            // Microbiológicos
            'bacteriasHeterotroficas',
            // Metais
            'aluminio',
            'bario',
            'cadmio',
            'chumbo',
            'cobre',
            'niquel',
            'cromo',
            'ferro',
            'manganes',
            'sodio',
            'zinco',
            // BTEX
            'benzeno',
            'tolueno',
            'etilbenzeno',
            'xilenosTotais'
        ],
        groups: {
            fisicoQuimicos: ['ferroTotal', 'cloreto', 'trihalometanos'],
            microbiologicos: ['bacteriasHeterotroficas'],
            metais: ['aluminio', 'bario', 'cadmio', 'chumbo', 'cobre', 'niquel', 'cromo', 'ferro', 'manganes', 'sodio', 'zinco'],
            btex: ['benzeno', 'tolueno', 'etilbenzeno', 'xilenosTotais']
        }
    },
    {
        id: 'agua-superficial-mensal',
        name: 'Água Superficial (Mensal)',
        prefix: 'AS-',
        description: 'Monitoramento mensal de corpos d\'água superficiais',
        analyses: [
            // Físico-químicos
            'oleosGraxas',
            'ph',
            'temperatura',
            'condutividade',
            'std',
            'od',
            'salinidade',
            'turbidez',
            'sts',
            'corVerdadeira',
            'dbo',
            'dqo',
            'nNitrato',
            'nNitrito',
            'nAmoniacal',
            'sulfato',
            'fosforoTotal',
            'cloreto',
            // Microbiológicos
            'coliformesTotais',
            'coliformesTermotolerantes',
            'escherichiaColi',
            // Metais
            'aluminio',
            'bario',
            'cadmio',
            'chumbo',
            'cobre',
            'niquel',
            'cromo',
            'ferro',
            'manganes',
            'sodio',
            'zinco',
            // BTEX
            'benzeno',
            'tolueno',
            'etilbenzeno',
            'xilenosTotais'
        ],
        groups: {
            fisicoQuimicos: ['oleosGraxas', 'ph', 'temperatura', 'condutividade', 'std', 'od', 'salinidade', 'turbidez', 'sts', 'corVerdadeira', 'dbo', 'dqo', 'nNitrato', 'nNitrito', 'nAmoniacal', 'sulfato', 'fosforoTotal', 'cloreto'],
            microbiologicos: ['coliformesTotais', 'coliformesTermotolerantes', 'escherichiaColi'],
            metais: ['aluminio', 'bario', 'cadmio', 'chumbo', 'cobre', 'niquel', 'cromo', 'ferro', 'manganes', 'sodio', 'zinco'],
            btex: ['benzeno', 'tolueno', 'etilbenzeno', 'xilenosTotais']
        }
    },
    {
        id: 'ete-mensal',
        name: 'ETE (Mensal)',
        prefix: 'ETE-',
        description: 'Controle mensal de Estação de Tratamento de Esgoto',
        analyses: [
            'ph',
            'temperatura',
            'alcalinidade',
            'condutividade',
            'dbo',
            'dqo',
            'sst',
            'ssv',
            'solidosSedimentaveis',
            'coliformesTermotolerantes'
        ]
    }
];
