/**
 * E-Coris - Application principale
 * Initialisation et gestion de la navigation
 */

// État de l'application
let currentTab = 'finances';
let currentFinanceView = 'dashboard';
let isAuthenticated = false;

// ==================== INITIALISATION ====================

/**
 * Initialiser l'application
 */
async function initApp() {
    console.log('🚀 Initialisation E-Coris...');
    
    // Afficher le splash screen
    showSplash();
    
    // Configurer les event listeners
    setupEventListeners();
    
    // Vérifier l'authentification
    const user = await checkAuth();
    
    if (user) {
        isAuthenticated = true;
        showMainApp();
        await loadInitialData();
    } else {
        showAuthScreen();
    }
    
    // Masquer le splash après un délai
    setTimeout(hideSplash, 1500);
}

/**
 * Afficher le splash screen
 */
function showSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.add('active');
    }
}

/**
 * Masquer le splash screen
 */
function hideSplash() {
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.classList.remove('active');
        setTimeout(() => splash.style.display = 'none', 500);
    }
}

/**
 * Configurer les event listeners
 */
function setupEventListeners() {
    // Navigation principale (onglets)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    
    // Navigation finances (sous-menu)
    document.querySelectorAll('.finance-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => switchFinanceView(btn.dataset.view));
    });
    
    // Formulaire de connexion
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const success = await handleLogin(email, password);
            if (success) {
                isAuthenticated = true;
                showMainApp();
                await loadInitialData();
            }
        });
    }
    
    // Formulaire d'inscription
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            const activationCode = document.getElementById('register-code')?.value;
            
            if (password !== confirmPassword) {
                showToast('Les mots de passe ne correspondent pas', 'error');
                return;
            }
            
            const success = await handleRegister({ fullName, email, password, activationCode });
            if (success) {
                isAuthenticated = true;
                showMainApp();
                await loadInitialData();
            }
        });
    }
    
    // Basculer entre login et register
    document.getElementById('show-register')?.addEventListener('click', () => {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('register-section').style.display = 'block';
    });
    
    document.getElementById('show-login')?.addEventListener('click', () => {
        document.getElementById('register-section').style.display = 'none';
        document.getElementById('login-section').style.display = 'block';
    });
    
    // Bouton déconnexion
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        await logout();
        isAuthenticated = false;
        showAuthScreen();
    });
    
    // Bouton profil
    document.getElementById('profile-btn')?.addEventListener('click', showProfile);
    
    // Formulaire de transaction
    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', saveTransaction);
    }
    
    // Changement de type de transaction
    document.getElementById('transaction-type')?.addEventListener('change', (e) => {
        updateCategoryOptions(e.target.value);
    });
    
    // Formulaire de budget
    const budgetForm = document.getElementById('budget-form');
    if (budgetForm) {
        budgetForm.addEventListener('submit', saveBudget);
    }
    
    // Boutons d'ajout
    document.getElementById('add-transaction-btn')?.addEventListener('click', () => openTransactionModal());
    document.getElementById('add-budget-btn')?.addEventListener('click', () => openBudgetModal());
    
    // Fermeture des modals
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target === el) {
                closeAllModals();
            }
        });
    });
    
    // Fermeture avec Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
        }
    });
    
    // Filtres
    document.getElementById('apply-filters')?.addEventListener('click', applyFilters);
    document.getElementById('reset-filters')?.addEventListener('click', resetFilters);
    
    // Formulaire d'activation
    const activationForm = document.getElementById('activation-form');
    if (activationForm) {
        activationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const code = document.getElementById('activation-code').value;
            activateFormation(code);
        });
    }
    
    // Bouton d'activation
    document.getElementById('activate-formation-btn')?.addEventListener('click', openActivationModal);
    
    // Pull to refresh (PWA)
    setupPullToRefresh();
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

// ==================== AFFICHAGE ====================

/**
 * Afficher l'écran d'authentification
 */
function showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('register-section').style.display = 'none';
}

/**
 * Afficher l'application principale
 */
function showMainApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('main-app').style.display = 'flex';
}

/**
 * Fermer tous les modals
 */
function closeAllModals() {
    document.querySelectorAll('.modal.active').forEach(modal => {
        modal.classList.remove('active');
    });
    closeTransactionModal();
    closeBudgetModal();
    closeActivationModal();
}

// ==================== PWA ====================

/**
 * Configurer le pull-to-refresh
 */
function setupPullToRefresh() {
    let touchStartY = 0;
    let touchEndY = 0;
    
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', async (e) => {
        touchEndY = e.changedTouches[0].clientY;
        
        // Si on tire vers le bas depuis le haut de la page
        if (touchEndY - touchStartY > 100 && window.scrollY === 0) {
            await refreshCurrentView();
        }
    });
}

/**
 * Rafraîchir la vue courante
 */
async function refreshCurrentView() {
    const refreshIndicator = document.getElementById('refresh-indicator');
    if (refreshIndicator) {
        refreshIndicator.classList.add('active');
    }
    
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
    } finally {
        if (refreshIndicator) {
            refreshIndicator.classList.remove('active');
        }
    }
}

/**
 * Enregistrer le service worker
 */
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('Service Worker enregistré:', registration.scope);
        } catch (error) {
            console.error('Erreur Service Worker:', error);
        }
    }
}

// ==================== UTILITAIRES ====================

/**
 * Afficher un toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-circle',
        info: 'info'
    };
    
    toast.innerHTML = `
        <i class="toast-icon icon-${icons[type] || 'info'}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Animation d'entrée
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Auto-suppression
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Créer le conteneur de toasts
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
    return container;
}

// Exposer showToast globalement
window.showToast = showToast;

// ==================== DÉMARRAGE ====================

// Lancer l'application au chargement du DOM
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    registerServiceWorker();
});

// Gérer les erreurs non capturées
window.addEventListener('unhandledrejection', (event) => {
    console.error('Erreur non gérée:', event.reason);
    showToast('Une erreur est survenue', 'error');
});

// Export pour le débogage
window.ECoris = {
    switchTab,
    switchFinanceView,
    refreshCurrentView,
    loadDashboard,
    loadTransactions,
    loadBudgets
};
