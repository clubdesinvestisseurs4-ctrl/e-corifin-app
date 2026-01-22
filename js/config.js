/**
 * E-Coris - Configuration
 */

// Détection automatique de l'environnement
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// Configuration API
const API_URL = isLocalhost 
    ? 'http://localhost:3000/api' 
    : 'https://e-corisfin-api.onrender.com/api';

// Catégories avec icônes et couleurs
const CATEGORIES = {
    income: {
        'salary': { label: 'Salaire', icon: '💼', color: '#4ADE80' },
        'freelance': { label: 'Freelance', icon: '💻', color: '#2DD4BF' },
        'investments': { label: 'Investissements', icon: '📈', color: '#00D9FF' },
        'gifts': { label: 'Cadeaux', icon: '🎁', color: '#F472B6' },
        'refunds': { label: 'Remboursements', icon: '↩️', color: '#A78BFA' },
        'other_income': { label: 'Autres revenus', icon: '💰', color: '#60A5FA' }
    },
    expense: {
        'food': { label: 'Alimentation', icon: '🛒', color: '#FF6B6B' },
        'transport': { label: 'Transport', icon: '🚗', color: '#FF9F43' },
        'housing': { label: 'Logement', icon: '🏠', color: '#FBBF24' },
        'health': { label: 'Santé', icon: '❤️', color: '#F472B6' },
        'leisure': { label: 'Loisirs', icon: '🎬', color: '#A78BFA' },
        'shopping': { label: 'Shopping', icon: '🛍️', color: '#7B2DFF' },
        'bills': { label: 'Factures', icon: '📄', color: '#60A5FA' },
        'education': { label: 'Éducation', icon: '📚', color: '#2DD4BF' },
        'savings': { label: 'Épargne', icon: '🐷', color: '#4ADE80' },
        'other_expense': { label: 'Autres dépenses', icon: '📦', color: '#888' }
    }
};

// Mois en français
const MONTHS = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Formater un montant en FCFA
 */
function formatAmount(amount) {
    return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA';
}

/**
 * Formater une date
 */
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Obtenir les infos d'une catégorie
 */
function getCategoryInfo(category, type) {
    const cats = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    return cats[category] || { label: category || 'Autre', icon: '📦', color: '#888' };
}

// Exposer globalement
window.API_URL = API_URL;
window.CATEGORIES = CATEGORIES;
window.MONTHS = MONTHS;
window.formatAmount = formatAmount;
window.formatDate = formatDate;
window.getCategoryInfo = getCategoryInfo;

console.log('✅ Config chargé - API:', API_URL);
