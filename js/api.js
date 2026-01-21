// ================================================
// E-CORIS - API Service
// ================================================

const API = {
    // Token d'authentification
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    setToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TOKEN, token);
    },
    
    clearToken() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    },
    
    // Headers par défaut
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth) {
            const token = this.getToken();
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }
        
        return headers;
    },
    
    // Requête générique
    async request(endpoint, options = {}) {
        const url = `${CONFIG.API_URL}${endpoint}`;
        const defaultOptions = {
            headers: this.getHeaders(options.auth !== false)
        };
        
        try {
            const response = await fetch(url, { ...defaultOptions, ...options });
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Une erreur est survenue');
            }
            
            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },
    
    // GET
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    },
    
    // POST
    async post(endpoint, body = {}, auth = true) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body),
            auth
        });
    },
    
    // PUT
    async put(endpoint, body = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    
    // DELETE
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    // ============================================
    // AUTH
    // ============================================
    
    async login(email, password) {
        const response = await this.post('/auth/login', { email, password }, false);
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.user));
        }
        return response;
    },
    
    async register(fullName, email, password, purchaseCode = null) {
        const endpoint = purchaseCode ? '/auth/register-formation' : '/auth/register';
        const body = { fullName, email, password };
        if (purchaseCode) body.purchaseCode = purchaseCode;
        
        const response = await this.post(endpoint, body, false);
        if (response.token) {
            this.setToken(response.token);
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER, JSON.stringify(response.user));
        }
        return response;
    },
    
    async getProfile() {
        return this.get('/auth/me');
    },
    
    logout() {
        this.clearToken();
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    },
    
    // ============================================
    // TRANSACTIONS
    // ============================================
    
    async getTransactions(params = {}) {
        return this.get('/transactions', params);
    },
    
    async createTransaction(data) {
        return this.post('/transactions', data);
    },
    
    async updateTransaction(id, data) {
        return this.put(`/transactions/${id}`, data);
    },
    
    async deleteTransaction(id) {
        return this.delete(`/transactions/${id}`);
    },
    
    async getCategories() {
        return this.get('/transactions/categories');
    },
    
    // ============================================
    // BUDGETS
    // ============================================
    
    async getBudgets(params = {}) {
        return this.get('/budgets', params);
    },
    
    async createBudget(data) {
        return this.post('/budgets', data);
    },
    
    async updateBudget(id, data) {
        return this.put(`/budgets/${id}`, data);
    },
    
    async deleteBudget(id) {
        return this.delete(`/budgets/${id}`);
    },
    
    async getBudgetTracking(month, year) {
        return this.get('/budgets/tracking', { month, year });
    },
    
    // ============================================
    // DASHBOARD
    // ============================================
    
    async getDashboardSummary(month, year) {
        return this.get('/dashboard/summary', { month, year });
    },
    
    async getDashboardTrend(months = 6) {
        return this.get('/dashboard/trend', { months });
    },
    
    async getRecentTransactions(limit = 5) {
        return this.get('/dashboard/recent', { limit });
    },
    
    async getDashboardAlerts() {
        return this.get('/dashboard/alerts');
    },
    
    async getDashboardStats() {
        return this.get('/dashboard/stats');
    },
    
    // ============================================
    // FORMATION
    // ============================================
    
    async getFormationAccessStatus() {
        return this.get('/courses/access-status');
    },
    
    async getChapters() {
        return this.get('/courses/chapters');
    },
    
    async getLessons(chapterId) {
        return this.get(`/courses/chapters/${chapterId}/lessons`);
    },
    
    async getLesson(lessonId) {
        return this.get(`/courses/lessons/${lessonId}`);
    },
    
    async markLessonComplete(lessonId) {
        return this.post(`/courses/lessons/${lessonId}/complete`);
    },
    
    async getFormationProgress() {
        return this.get('/courses/progress');
    }
};
