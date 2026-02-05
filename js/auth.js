/**
 * E-Coris - Authentification
 * Avec session persistante (7 jours)
 */

// État utilisateur
let currentUser = null;

/**
 * Vérifier si l'utilisateur est authentifié
 * Utilise d'abord le cache local, puis vérifie avec le serveur
 */
async function checkAuth() {
    // 1. Vérifier si une session valide existe localement
    if (!API.hasValidSession()) {
        console.log('🔒 Pas de session locale valide');
        return false;
    }
    
    // 2. Récupérer l'utilisateur du cache pour un affichage rapide
    const cachedUser = API.getCachedUser();
    if (cachedUser) {
        currentUser = cachedUser;
        console.log('👤 Utilisateur récupéré du cache:', cachedUser.fullName);
    }
    
    // 3. Vérifier avec le serveur en arrière-plan
    try {
        const data = await API.getCurrentUser();
        currentUser = data.user;
        console.log('✅ Session validée par le serveur');
        return true;
    } catch (error) {
        console.error('❌ Validation session échouée:', error);
        
        // Si erreur réseau mais cache valide, garder la session
        if (cachedUser && error.message.includes('fetch')) {
            console.log('📶 Mode hors-ligne, utilisation du cache');
            return true;
        }
        
        // Sinon, nettoyer la session
        API.clearSession();
        currentUser = null;
        return false;
    }
}

/**
 * Vérification rapide (sans appel serveur)
 * Utile pour les checks fréquents
 */
function isLoggedIn() {
    return API.hasValidSession() && (currentUser !== null || API.getCachedUser() !== null);
}

/**
 * Connexion
 */
async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Désactiver le bouton pendant le chargement
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Connexion...</span>';
    }
    
    try {
        const data = await API.login(email, password);
        currentUser = data.user;
        showToast('Connexion réussie !', 'success');
        showMainApp();
        loadInitialData();
    } catch (error) {
        showToast(error.message || 'Erreur de connexion', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Se connecter</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>`;
        }
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
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    // Désactiver le bouton pendant le chargement
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Création...</span>';
    }
    
    try {
        const data = await API.register(fullName, email, password, purchaseCode || null);
        currentUser = data.user;
        
        // Message personnalisé selon l'accès formation
        const message = data.user.hasFormationAccess 
            ? 'Compte créé avec accès formation !' 
            : 'Compte créé avec succès !';
        
        showToast(message, 'success');
        showMainApp();
        loadInitialData();
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'inscription', 'error');
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<span>Créer mon compte</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>`;
        }
    }
    
    return false;
}

/**
 * Déconnexion
 */
function logout() {
    API.clearSession();
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
    
    // Reset des champs
    document.getElementById('login-email').value = '';
    document.getElementById('login-password').value = '';
}

/**
 * Afficher le formulaire d'inscription
 */
function showRegister() {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    
    // Reset des champs
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('purchase-code').value = '';
}

/**
 * Afficher/masquer le mot de passe
 */
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const btn = input.parentElement.querySelector('.password-toggle');
    
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>`;
        }
    } else {
        input.type = 'password';
        if (btn) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>`;
        }
    }
}

/**
 * Afficher le profil
 */
function showProfile() {
    // Utiliser le cache si currentUser n'est pas défini
    const user = currentUser || API.getCachedUser();
    if (!user) return;
    
    document.getElementById('profile-name').textContent = user.fullName || 'Utilisateur';
    document.getElementById('profile-email').textContent = user.email || '';
    
    const badge = document.getElementById('profile-badge');
    if (user.hasFormationAccess) {
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
    return currentUser || API.getCachedUser();
}

/**
 * Mettre à jour l'utilisateur courant
 */
function setCurrentUser(user) {
    currentUser = user;
    if (user) {
        API.setCachedUser(user);
    }
}

// Exposer globalement
window.currentUser = currentUser;
window.checkAuth = checkAuth;
window.isLoggedIn = isLoggedIn;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.logout = logout;
window.showLogin = showLogin;
window.showRegister = showRegister;
window.togglePassword = togglePassword;
window.showProfile = showProfile;
window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;

console.log('✅ Auth module chargé (session 7j)');
