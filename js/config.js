// ================================================
// E-CORIS - Configuration
// ================================================

const CONFIG = {
    // API Backend URL - à modifier selon l'environnement
    API_URL: 'https://your-backend-url.onrender.com/api',
    
    // Version de l'application
    VERSION: '1.0.0',
    
    // Clés de stockage local
    STORAGE_KEYS: {
        TOKEN: 'e_coris_token',
        USER: 'e_coris_user',
        THEME: 'e_coris_theme'
    },
    
    // Catégories par défaut
    DEFAULT_CATEGORIES: {
        income: [
            'Salaire',
            'Freelance',
            'Investissements',
            'Cadeaux',
            'Remboursements',
            'Autres revenus'
        ],
        expense: [
            'Alimentation',
            'Transport',
            'Logement',
            'Santé',
            'Loisirs',
            'Shopping',
            'Factures',
            'Éducation',
            'Épargne',
            'Autres dépenses'
        ]
    },
    
    // Couleurs pour les graphiques
    CHART_COLORS: [
        '#00D9FF', // Cyan
        '#7B2DFF', // Purple
        '#2DD4BF', // Teal
        '#FF6B6B', // Red
        '#FF9F43', // Orange
        '#F472B6', // Pink
        '#4ADE80', // Green
        '#FBBF24', // Yellow
        '#A78BFA', // Violet
        '#60A5FA'  // Blue
    ],
    
    // Format de devise
    CURRENCY: {
        code: 'XOF',
        symbol: 'FCFA',
        locale: 'fr-FR'
    },
    
    // Mois en français
    MONTHS: [
        'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
        'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ],
    
    // URL d'achat de la formation (à personnaliser)
    PURCHASE_URL: 'https://votre-site.com/formation'
};

// Fonction utilitaire pour formater les montants
function formatAmount(amount) {
    return new Intl.NumberFormat(CONFIG.CURRENCY.locale, {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount) + ' ' + CONFIG.CURRENCY.symbol;
}

// Fonction utilitaire pour formater les dates
function formatDate(dateString, options = {}) {
    const date = new Date(dateString);
    const defaultOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    };
    return date.toLocaleDateString('fr-FR', { ...defaultOptions, ...options });
}

// Fonction utilitaire pour formater les dates courtes
function formatShortDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit'
    });
}

// Fonction pour obtenir la date au format ISO (YYYY-MM-DD)
function toISODateString(date) {
    return date.toISOString().split('T')[0];
}

// Détection du mode développement
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    CONFIG.API_URL = 'http://localhost:3000/api';
    console.log('🔧 Mode développement - API:', CONFIG.API_URL);
}
