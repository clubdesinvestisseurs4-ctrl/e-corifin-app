/**
 * E-Coris - Authentification
 */

// État utilisateur
let currentUser = null;

/**
 * Vérifier si l'utilisateur est authentifié
 */
async function checkAuth() {
    const token = API.getToken();
    if (!token) {
        return false;
    }
    
    try {
        const data = await API.getCurrentUser();
        currentUser = data.user;
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        API.removeToken();
        return false;
    }
}

/**
 * Connexion
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    try {
        const data = await API.login(email, password);
        currentUser = data.user;
        showToast('Connexion réussie !', 'success');
        showMainApp();
        loadInitialData();
    } catch (error) {
        showToast(error.message || 'Erreur de connexion', 'error');
    }
    
    return false;
}

/**
 * Inscription
 */
async function handleRegister(event) {
    event.preventDefault();
    
    const fullName = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const purchaseCode = document.getElementById('purchase-code').value;
    
    try {
        const data = await API.register(fullName, email, password, purchaseCode || null);
        currentUser = data.user;
        showToast('Compte créé avec succès !', 'success');
        showMainApp();
        loadInitialData();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'inscription', 'error');
    }
    
    return false;
}

/**
 * Déconnexion
 */
function logout() {
    API.removeToken();
    currentUser = null;
    closeModal();
    showAuthSection();
    showToast('Déconnexion réussie', 'success');
}

/**
 * Afficher le formulaire de connexion
 */
function showLogin() {
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('register-form').classList.add('hidden');
}

/**
 * Afficher le formulaire d'inscription
 */
function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
}

/**
 * Afficher/masquer le mot de passe
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
    } else {
        input.type = 'password';
    }
}

/**
 * Afficher le profil
 */
function showProfile() {
    if (!currentUser) return;
    
    document.getElementById('profile-name').textContent = currentUser.fullName || 'Utilisateur';
    document.getElementById('profile-email').textContent = currentUser.email || '';
    
    const badge = document.getElementById('profile-badge');
    if (currentUser.hasFormationAccess) {
        badge.textContent = 'Compte Premium';
        badge.className = 'badge badge-premium';
    } else {
        badge.textContent = 'Compte gratuit';
        badge.className = 'badge';
    }
    
    openModal('profile-modal');
}

/**
 * Obtenir l'utilisateur courant
 */
function getCurrentUser() {
    return currentUser;
}

// Exposer globalement
window.currentUser = currentUser;
window.checkAuth = checkAuth;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.togglePassword = togglePassword;
window.showProfile = showProfile;
window.getCurrentUser = getCurrentUser;

console.log('✅ Auth module chargé');
