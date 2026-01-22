/**
 * E-Coris - Application principale
 * Initialisation et gestion de la navigation
 */

// État de l'application
let currentTab = 'finances';
let currentFinanceView = 'dashboard';
let appInitialized = false;

// ==================== INITIALISATION ====================

/**
 * Initialiser l'application
 */
async function initializeApp() {
    if (appInitialized) {
        // Si déjà initialisé, juste afficher l'app principale
        showMainApp();
        return;
    }
    
    console.log('🚀 Initialisation E-Coris...');
    
    // Masquer le splash après un délai
    setTimeout(hideSplash, 1500);
    
    // Vérifier l'authentification
    const isLoggedIn = await checkAuth();
    
    if (isLoggedIn) {
        showMainApp();
        await loadInitialData();
        appInitialized = true;
    } else {
        showAuthSection();
    }
}

/**
 * Masquer le splash screen
 */
function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('hidden');
        setTimeout(() => splash.style.display = 'none', 500);
    }
    
    // Afficher l'app container
    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('hidden');
    }
}

/**
 * Charger les données initiales
 */
async function loadInitialData() {
    try {
        // Charger en parallèle
        await Promise.all([
            loadDashboard(),
            loadTransactions(),
            checkFormationAccess()
        ]);
    } catch (error) {
        console.error('Erreur chargement initial:', error);
    }
}

// ==================== NAVIGATION ====================

/**
 * Changer d'onglet principal
 */
function switchTab(tab) {
    currentTab = tab;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Mettre à jour les contenus
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tab}-tab`);
    });
    
    // Charger les données si nécessaire
    if (tab === 'formation') {
        checkFormationAccess();
    } else if (tab === 'finances') {
        if (currentFinanceView === 'dashboard') {
            loadDashboard();
        }
    }
}

/**
 * Changer de vue dans l'onglet finances
 */
function switchFinanceView(view) {
    currentFinanceView = view;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.finance-nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Mettre à jour les vues
    document.querySelectorAll('.finance-view').forEach(v => {
        v.classList.toggle('active', v.id === `${view}-view`);
    });
    
    // Charger les données
    switch (view) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'transactions':
            loadTransactions();
            break;
        case 'budgets':
            loadBudgets();
            break;
    }
}

// ==================== MODALS ====================

/**
 * Ouvrir un modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Fermer le modal actif
 */
function closeModal() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
}

// ==================== EVENT LISTENERS ====================

/**
 * Configurer les event listeners au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    // Navigation principale (onglets)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Navigation finances (sous-menu)
    document.querySelectorAll('.finance-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchFinanceView(btn.dataset.view));
    });
    
    // Changement de type de transaction
    const transactionType = document.getElementById('transaction-type');
    if (transactionType) {
        transactionType.addEventListener('change', (e) => {
            updateCategoryOptions(e.target.value);
        });
    }
    
    // Fermeture des modals avec overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeModal);
    });
    
    // Fermeture avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    });
    
    // Fermeture avec bouton close
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });
    
    // Initialiser l'application
    initializeApp();
});

// ==================== UTILITAIRES GLOBAUX ====================

/**
 * Rafraîchir la vue courante
 */
async function refreshCurrentView() {
    try {
        if (currentTab === 'finances') {
            switch (currentFinanceView) {
                case 'dashboard':
                    await loadDashboard();
                    break;
                case 'transactions':
                    await loadTransactions();
                    break;
                case 'budgets':
                    await loadBudgets();
                    break;
            }
        } else if (currentTab === 'formation') {
            await loadChapters();
        }
        showToast('Données actualisées', 'success');
    } catch (error) {
        showToast('Erreur lors de l\'actualisation', 'error');
    }
}

// Export pour le débogage
window.ECoris = {
    switchTab,
    switchFinanceView,
    refreshCurrentView,
    openModal,
    closeModal
};
