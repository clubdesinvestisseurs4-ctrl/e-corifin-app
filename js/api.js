/**
 * E-Coris - API Service
 */

const API = {
    // Token management
    getToken: function() {
        return localStorage.getItem('ecoris_token');
    },
    
    setToken: function(token) {
        localStorage.setItem('ecoris_token', token);
    },
    
    removeToken: function() {
        localStorage.removeItem('ecoris_token');
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
        }
        return data;
    },
    
    getCurrentUser: async function() {
        return await this.request('/auth/me');
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

console.log('✅ API Service chargé');
