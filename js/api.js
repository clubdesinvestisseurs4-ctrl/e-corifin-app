/**
 * E-Coris - API Service
 * Avec gestion de session persistante (7 jours)
 */

const API = {
    // Clés de stockage
    TOKEN_KEY: 'ecoris_token',
    TOKEN_EXPIRY_KEY: 'ecoris_token_expiry',
    USER_KEY: 'ecoris_user',
    
    // Token management
    getToken: function() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
        
        // Vérifier si le token existe et n'est pas expiré
        if (token && expiry) {
            const expiryDate = new Date(expiry);
            if (new Date() < expiryDate) {
                return token;
            } else {
                // Token expiré, nettoyer
                this.clearSession();
                return null;
            }
        }
        
        return token;
    },
    
    setToken: function(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
        
        // Calculer la date d'expiration (7 jours)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);
        localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiry.toISOString());
    },
    
    removeToken: function() {
        this.clearSession();
    },
    
    // Gestion utilisateur en cache
    getCachedUser: function() {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                return null;
            }
        }
        return null;
    },
    
    setCachedUser: function(user) {
        if (user) {
            localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        }
    },
    
    clearSession: function() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
        localStorage.removeItem(this.USER_KEY);
    },
    
    // Vérifier si la session est valide localement
    hasValidSession: function() {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
        const user = localStorage.getItem(this.USER_KEY);
        
        if (!token || !expiry || !user) {
            return false;
        }
        
        const expiryDate = new Date(expiry);
        return new Date() < expiryDate;
    },
    
    // Generic request
    request: async function(endpoint, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        
        try {
            const response = await fetch(API_URL + endpoint, {
                ...options,
                headers
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Si erreur d'authentification, nettoyer la session
                if (response.status === 401 || response.status === 403) {
                    this.clearSession();
                }
                throw new Error(data.error || 'Erreur serveur');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // Auth
    login: async function(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        if (data.token) {
            this.setToken(data.token);
            this.setCachedUser(data.user);
        }
        return data;
    },
    
    register: async function(fullName, email, password, purchaseCode) {
        const body = { fullName, email, password };
        if (purchaseCode) body.purchaseCode = purchaseCode;
        
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        if (data.token) {
            this.setToken(data.token);
            this.setCachedUser(data.user);
        }
        return data;
    },
    
    getCurrentUser: async function() {
        const data = await this.request('/auth/me');
        if (data.user) {
            this.setCachedUser(data.user);
        }
        return data;
    },
    
    activateCode: async function(code) {
        return await this.request('/auth/activate', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    },
    
    // Transactions
    getTransactions: async function(filters = {}) {
        const params = new URLSearchParams();
        if (filters.type && filters.type !== 'all') params.append('type', filters.type);
        if (filters.category && filters.category !== 'all') params.append('category', filters.category);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        
        return await this.request('/transactions?' + params.toString());
    },
    
    createTransaction: async function(data) {
        return await this.request('/transactions', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    updateTransaction: async function(id, data) {
        return await this.request('/transactions/' + id, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    deleteTransaction: async function(id) {
        return await this.request('/transactions/' + id, {
            method: 'DELETE'
        });
    },
    
    // Budgets
    getBudgets: async function(month, year) {
        const params = new URLSearchParams();
        if (month) params.append('month', month);
        if (year) params.append('year', year);
        return await this.request('/budgets?' + params.toString());
    },
    
    getBudgetTracking: async function(month, year) {
        return await this.request('/budgets/tracking?month=' + month + '&year=' + year);
    },
    
    createBudget: async function(data) {
        return await this.request('/budgets', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    updateBudget: async function(id, data) {
        return await this.request('/budgets/' + id, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    deleteBudget: async function(id) {
        return await this.request('/budgets/' + id, {
            method: 'DELETE'
        });
    },
    
    // Dashboard
    getDashboardSummary: async function(month, year) {
        return await this.request('/dashboard/summary?month=' + month + '&year=' + year);
    },
    
    getDashboardTrend: async function(months) {
        return await this.request('/dashboard/trend?months=' + (months || 6));
    },
    
    getDashboardAlerts: async function() {
        return await this.request('/dashboard/alerts');
    },
    
    getDashboardRecent: async function(limit) {
        return await this.request('/dashboard/recent?limit=' + (limit || 5));
    },
    
    getDashboardStats: async function() {
        return await this.request('/dashboard/stats');
    },
    
    // Formation
    getFormationStatus: async function() {
        return await this.request('/courses/access-status');
    },
    
    getChapters: async function() {
        return await this.request('/courses/chapters');
    },
    
    getLessons: async function(chapterId) {
        return await this.request('/courses/chapters/' + chapterId + '/lessons');
    },
    
    getLesson: async function(lessonId) {
        return await this.request('/courses/lessons/' + lessonId);
    },
    
    markLessonComplete: async function(lessonId) {
        return await this.request('/courses/lessons/' + lessonId + '/complete', {
            method: 'POST'
        });
    },
    
    getFormationProgress: async function() {
        const data = await this.request('/courses/progress');
        return {
            completed: data.completedLessons || 0,
            total: data.totalLessons || 0,
            percentage: data.progress || 0
        };
    }
};

// Exposer globalement
window.API = API;

console.log('✅ API Service chargé (session persistante 7j)');
