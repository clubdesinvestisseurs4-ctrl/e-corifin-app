// ================================================
// E-CORIS - Authentication Module
// ================================================

// État de l'utilisateur
let currentUser = null;

// Vérifier si l'utilisateur est connecté
function isAuthenticated() {
    return !!API.getToken();
}

// Récupérer l'utilisateur courant
function getCurrentUser() {
    if (currentUser) return currentUser;
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (stored) {
        currentUser = JSON.parse(stored);
        return currentUser;
    }
    return null;
}

// Mettre à jour l'utilisateur courant
function setCurrentUser(user) {
    currentUser = user;
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(user));
}

// Afficher le formulaire de connexion
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

// Afficher le formulaire d'inscription
function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

// Toggle visibilité mot de passe
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
    input.setAttribute('type', type);
}

// Gérer la connexion
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Connexion...</span>';
    
    try {
        const response = await API.login(email, password);
        setCurrentUser(response.user);
        showToast('Connexion réussie !', 'success');
        initializeApp();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span>Se connecter</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
    
    return false;
}

// Gérer l'inscription
async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const purchaseCode = document.getElementById('purchase-code').value || null;
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>Création...</span>';
    
    try {
        const response = await API.register(fullName, email, password, purchaseCode);
        setCurrentUser(response.user);
        showToast('Compte créé avec succès !', 'success');
        initializeApp();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `
            <span>Créer mon compte</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        `;
    }
    
    return false;
}

// Déconnexion
function logout() {
    API.logout();
    currentUser = null;
    closeModal();
    showAuthSection();
    showToast('Déconnexion réussie', 'success');
}

// Afficher la section authentification
function showAuthSection() {
    document.getElementById('auth-section').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
    showLogin();
}

// Afficher l'application principale
function showMainApp() {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

// Afficher le profil
async function showProfile() {
    const user = getCurrentUser();
    if (!user) return;
    
    document.getElementById('profile-name').textContent = user.fullName;
    document.getElementById('profile-email').textContent = user.email;
    
    const badge = document.getElementById('profile-badge');
    if (user.hasFormationAccess) {
        badge.textContent = 'Formation Premium';
        badge.classList.add('premium');
    } else {
        badge.textContent = 'Compte gratuit';
        badge.classList.remove('premium');
    }
    
    // Charger les statistiques
    try {
        const { stats } = await API.getDashboardStats();
        document.getElementById('profile-stats').innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${stats.transactionCount}</div>
                <div class="stat-label">Transactions</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.monthsTracked}</div>
                <div class="stat-label">Mois suivis</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${formatAmount(stats.totalSavings)}</div>
                <div class="stat-label">Épargne totale</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${stats.savingsRate}%</div>
                <div class="stat-label">Taux d'épargne</div>
            </div>
        `;
    } catch (error) {
        document.getElementById('profile-stats').innerHTML = '<p class="text-muted">Statistiques non disponibles</p>';
    }
    
    openModal('profile-modal');
}

// Vérifier le token au démarrage
async function checkAuth() {
    if (!isAuthenticated()) {
        return false;
    }
    
    try {
        const response = await API.getProfile();
        setCurrentUser(response.user);
        return true;
    } catch (error) {
        API.logout();
        return false;
    }
}
