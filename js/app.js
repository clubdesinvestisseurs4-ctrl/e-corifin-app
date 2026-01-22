/**
 * E-Coris - Application principale
 */

// État global
let currentTab = 'finances';

/**
 * Initialiser l'application
 */
async function initApp() {
    console.log('🚀 Initialisation E-Coris...');
    
    // Initialiser les sélecteurs de période
    initPeriodSelectors();
    
    // Masquer le splash après un délai
    setTimeout(hideSplash, 1500);
    
    // Vérifier l'authentification
    const isLoggedIn = await checkAuth();
    
    if (isLoggedIn) {
        showMainApp();
        loadInitialData();
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
    
    const app = document.getElementById('app');
    if (app) {
        app.classList.remove('hidden');
    }
}

/**
 * Afficher la section d'authentification
 */
function showAuthSection() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

/**
 * Afficher l'application principale
 */
function showMainApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

/**
 * Charger les données initiales
 */
async function loadInitialData() {
    try {
        await Promise.all([
            loadDashboard(),
            checkFormationAccess()
        ]);
    } catch (error) {
        console.error('Erreur chargement initial:', error);
    }
}

/**
 * Initialiser les sélecteurs de période
 */
function initPeriodSelectors() {
    const monthSelect = document.getElementById('period-month');
    const yearSelect = document.getElementById('period-year');
    
    if (monthSelect && yearSelect) {
        const now = new Date();
        
        // Mois
        monthSelect.innerHTML = MONTHS.map((m, i) => 
            `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${m}</option>`
        ).join('');
        
        // Années
        const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
        yearSelect.innerHTML = years.map(y => 
            `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`
        ).join('');
    }
}

/**
 * Changer d'onglet
 */
function switchTab(tab) {
    currentTab = tab;
    
    // Mettre à jour les boutons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Mettre à jour les contenus
    document.getElementById('finances-content').classList.toggle('active', tab === 'finances');
    document.getElementById('formation-content').classList.toggle('active', tab === 'formation');
    
    // Charger les données
    if (tab === 'finances') {
        showDashboard();
    } else if (tab === 'formation') {
        checkFormationAccess();
    }
}

/**
 * Ouvrir un modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById('modal-overlay');
    
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('active');
    }
    if (overlay) {
        overlay.classList.remove('hidden');
    }
    
    document.body.style.overflow = 'hidden';
}

/**
 * Fermer tous les modals
 */
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
        modal.classList.remove('active');
    });
    
    const overlay = document.getElementById('modal-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
    
    document.body.style.overflow = '';
}

/**
 * Afficher un toast
 */
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', initApp);

// Fermer modal avec Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Exposer globalement
window.initApp = initApp;
window.showAuthSection = showAuthSection;
window.showMainApp = showMainApp;
window.loadInitialData = loadInitialData;
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.showToast = showToast;

console.log('✅ App module chargé');
