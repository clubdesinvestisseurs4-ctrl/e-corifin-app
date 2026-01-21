/**
 * E-Coris - Module Finances
 * Gestion des transactions, budgets et tableaux de bord
 */

// État local
let transactions = [];
let budgets = [];
let dashboardData = null;
let currentFilters = {
    type: 'all',
    category: 'all',
    dateFrom: null,
    dateTo: null
};

// ==================== TRANSACTIONS ====================

/**
 * Charger les transactions
 */
export async function loadTransactions(filters = {}) {
    try {
        showLoading('transactions-list');
        const mergedFilters = { ...currentFilters, ...filters };
        currentFilters = mergedFilters;
        
        const data = await api.transactions.getAll(mergedFilters);
        transactions = data.transactions || [];
        renderTransactions();
        return transactions;
    } catch (error) {
        console.error('Erreur chargement transactions:', error);
        showToast('Erreur lors du chargement des transactions', 'error');
        return [];
    }
}

/**
 * Afficher les transactions dans la liste
 */
function renderTransactions() {
    const container = document.getElementById('transactions-list');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="icon-wallet"></i>
                <p>Aucune transaction pour le moment</p>
                <button class="btn btn-primary" onclick="window.FinancesModule.openTransactionModal()">
                    Ajouter une transaction
                </button>
            </div>
        `;
        return;
    }
    
    // Grouper par date
    const grouped = groupTransactionsByDate(transactions);
    
    let html = '';
    for (const [date, items] of Object.entries(grouped)) {
        const dayTotal = items.reduce((sum, t) => {
            return sum + (t.type === 'income' ? t.amount : -t.amount);
        }, 0);
        
        html += `
            <div class="transaction-group">
                <div class="transaction-date-header">
                    <span class="date">${formatDateHeader(date)}</span>
                    <span class="day-total ${dayTotal >= 0 ? 'positive' : 'negative'}">
                        ${dayTotal >= 0 ? '+' : ''}${formatAmount(dayTotal)}
                    </span>
                </div>
                <div class="transaction-items">
        `;
        
        for (const transaction of items) {
            html += renderTransactionItem(transaction);
        }
        
        html += `
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Ajouter les événements
    container.querySelectorAll('.transaction-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            openTransactionModal(transactions.find(t => t.id === id));
        });
    });
}

/**
 * Rendre un élément de transaction
 */
function renderTransactionItem(transaction) {
    const isIncome = transaction.type === 'income';
    const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
    
    return `
        <div class="transaction-item" data-id="${transaction.id}">
            <div class="transaction-icon" style="background: ${categoryInfo.color}20; color: ${categoryInfo.color}">
                <i class="${categoryInfo.icon}"></i>
            </div>
            <div class="transaction-info">
                <span class="transaction-category">${categoryInfo.label}</span>
                <span class="transaction-description">${transaction.description || '-'}</span>
            </div>
            <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                ${isIncome ? '+' : '-'}${formatAmount(transaction.amount)}
            </div>
        </div>
    `;
}

/**
 * Grouper les transactions par date
 */
function groupTransactionsByDate(transactions) {
    const grouped = {};
    transactions.forEach(t => {
        const date = t.date.split('T')[0];
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
    });
    
    // Trier par date décroissante
    const sorted = {};
    Object.keys(grouped)
        .sort((a, b) => new Date(b) - new Date(a))
        .forEach(key => sorted[key] = grouped[key]);
    
    return sorted;
}

/**
 * Formater l'en-tête de date
 */
function formatDateHeader(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateStr === today.toISOString().split('T')[0]) {
        return "Aujourd'hui";
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
        return "Hier";
    } else {
        return date.toLocaleDateString('fr-FR', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        });
    }
}

/**
 * Obtenir les infos d'une catégorie
 */
function getCategoryInfo(category, type) {
    const categories = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    return categories[category] || { label: category, icon: 'icon-tag', color: '#666' };
}

/**
 * Ouvrir le modal de transaction
 */
export function openTransactionModal(transaction = null) {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    const title = modal.querySelector('.modal-title');
    const deleteBtn = document.getElementById('delete-transaction-btn');
    
    // Reset form
    form.reset();
    
    if (transaction) {
        // Mode édition
        title.textContent = 'Modifier la transaction';
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => deleteTransaction(transaction.id);
        
        form.elements['transaction-id'].value = transaction.id;
        form.elements['transaction-type'].value = transaction.type;
        form.elements['transaction-amount'].value = transaction.amount;
        form.elements['transaction-category'].value = transaction.category;
        form.elements['transaction-date'].value = transaction.date.split('T')[0];
        form.elements['transaction-description'].value = transaction.description || '';
        
        updateCategoryOptions(transaction.type);
    } else {
        // Mode création
        title.textContent = 'Nouvelle transaction';
        deleteBtn.style.display = 'none';
        form.elements['transaction-id'].value = '';
        form.elements['transaction-date'].value = new Date().toISOString().split('T')[0];
        updateCategoryOptions('expense');
    }
    
    modal.classList.add('active');
}

/**
 * Fermer le modal de transaction
 */
export function closeTransactionModal() {
    const modal = document.getElementById('transaction-modal');
    modal.classList.remove('active');
}

/**
 * Mettre à jour les options de catégorie selon le type
 */
export function updateCategoryOptions(type) {
    const select = document.getElementById('transaction-category');
    const categories = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    
    select.innerHTML = '';
    for (const [value, info] of Object.entries(categories)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = info.label;
        select.appendChild(option);
    }
}

/**
 * Sauvegarder une transaction
 */
export async function saveTransaction(event) {
    event.preventDefault();
    
    const form = event.target;
    const id = form.elements['transaction-id'].value;
    
    const data = {
        type: form.elements['transaction-type'].value,
        amount: parseFloat(form.elements['transaction-amount'].value),
        category: form.elements['transaction-category'].value,
        date: form.elements['transaction-date'].value,
        description: form.elements['transaction-description'].value
    };
    
    try {
        showLoading('transaction-submit-btn');
        
        if (id) {
            await api.transactions.update(id, data);
            showToast('Transaction modifiée avec succès', 'success');
        } else {
            await api.transactions.create(data);
            showToast('Transaction ajoutée avec succès', 'success');
        }
        
        closeTransactionModal();
        await loadTransactions();
        await loadDashboard();
        
    } catch (error) {
        console.error('Erreur sauvegarde transaction:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        hideLoading('transaction-submit-btn');
    }
}

/**
 * Supprimer une transaction
 */
async function deleteTransaction(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    
    try {
        await api.transactions.delete(id);
        showToast('Transaction supprimée', 'success');
        closeTransactionModal();
        await loadTransactions();
        await loadDashboard();
    } catch (error) {
        console.error('Erreur suppression transaction:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ==================== BUDGETS ====================

/**
 * Charger les budgets
 */
export async function loadBudgets() {
    try {
        showLoading('budgets-list');
        const data = await api.budgets.getTracking();
        budgets = data.budgets || [];
        renderBudgets();
        return budgets;
    } catch (error) {
        console.error('Erreur chargement budgets:', error);
        showToast('Erreur lors du chargement des budgets', 'error');
        return [];
    }
}

/**
 * Afficher les budgets
 */
function renderBudgets() {
    const container = document.getElementById('budgets-list');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="icon-target"></i>
                <p>Aucun budget défini</p>
                <button class="btn btn-primary" onclick="window.FinancesModule.openBudgetModal()">
                    Créer un budget
                </button>
            </div>
        `;
        return;
    }
    
    let html = '<div class="budgets-grid">';
    
    for (const budget of budgets) {
        const spent = budget.spent || 0;
        const percentage = Math.min((spent / budget.amount) * 100, 100);
        const remaining = budget.amount - spent;
        const isOverBudget = spent > budget.amount;
        const categoryInfo = getCategoryInfo(budget.category, 'expense');
        
        html += `
            <div class="budget-card ${isOverBudget ? 'over-budget' : ''}" data-id="${budget.id}">
                <div class="budget-header">
                    <div class="budget-category">
                        <span class="budget-icon" style="background: ${categoryInfo.color}20; color: ${categoryInfo.color}">
                            <i class="${categoryInfo.icon}"></i>
                        </span>
                        <span class="budget-name">${categoryInfo.label}</span>
                    </div>
                    <button class="btn-icon" onclick="window.FinancesModule.openBudgetModal(${JSON.stringify(budget).replace(/"/g, '&quot;')})">
                        <i class="icon-edit"></i>
                    </button>
                </div>
                
                <div class="budget-amounts">
                    <span class="budget-spent ${isOverBudget ? 'over' : ''}">${formatAmount(spent)}</span>
                    <span class="budget-separator">/</span>
                    <span class="budget-total">${formatAmount(budget.amount)}</span>
                </div>
                
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${isOverBudget ? 'over' : ''}" style="width: ${percentage}%"></div>
                    </div>
                </div>
                
                <div class="budget-footer">
                    <span class="budget-remaining ${remaining < 0 ? 'negative' : ''}">
                        ${remaining >= 0 ? 'Reste' : 'Dépassement'}: ${formatAmount(Math.abs(remaining))}
                    </span>
                    <span class="budget-percentage">${Math.round(percentage)}%</span>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    container.innerHTML = html;
}

/**
 * Ouvrir le modal de budget
 */
export function openBudgetModal(budget = null) {
    const modal = document.getElementById('budget-modal');
    const form = document.getElementById('budget-form');
    const title = modal.querySelector('.modal-title');
    const deleteBtn = document.getElementById('delete-budget-btn');
    
    // Reset form
    form.reset();
    
    // Remplir les catégories
    const categorySelect = form.elements['budget-category'];
    categorySelect.innerHTML = '';
    for (const [value, info] of Object.entries(CATEGORIES.expense)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = info.label;
        categorySelect.appendChild(option);
    }
    
    // Date par défaut: mois en cours
    const now = new Date();
    form.elements['budget-month'].value = now.getMonth() + 1;
    form.elements['budget-year'].value = now.getFullYear();
    
    if (budget) {
        // Mode édition
        title.textContent = 'Modifier le budget';
        deleteBtn.style.display = 'block';
        deleteBtn.onclick = () => deleteBudget(budget.id);
        
        form.elements['budget-id'].value = budget.id;
        form.elements['budget-category'].value = budget.category;
        form.elements['budget-amount'].value = budget.amount;
        form.elements['budget-month'].value = budget.month;
        form.elements['budget-year'].value = budget.year;
    } else {
        // Mode création
        title.textContent = 'Nouveau budget';
        deleteBtn.style.display = 'none';
        form.elements['budget-id'].value = '';
    }
    
    modal.classList.add('active');
}

/**
 * Fermer le modal de budget
 */
export function closeBudgetModal() {
    const modal = document.getElementById('budget-modal');
    modal.classList.remove('active');
}

/**
 * Sauvegarder un budget
 */
export async function saveBudget(event) {
    event.preventDefault();
    
    const form = event.target;
    const id = form.elements['budget-id'].value;
    
    const data = {
        category: form.elements['budget-category'].value,
        amount: parseFloat(form.elements['budget-amount'].value),
        month: parseInt(form.elements['budget-month'].value),
        year: parseInt(form.elements['budget-year'].value)
    };
    
    try {
        showLoading('budget-submit-btn');
        
        if (id) {
            await api.budgets.update(id, data);
            showToast('Budget modifié avec succès', 'success');
        } else {
            await api.budgets.create(data);
            showToast('Budget créé avec succès', 'success');
        }
        
        closeBudgetModal();
        await loadBudgets();
        await loadDashboard();
        
    } catch (error) {
        console.error('Erreur sauvegarde budget:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
        hideLoading('budget-submit-btn');
    }
}

/**
 * Supprimer un budget
 */
async function deleteBudget(id) {
    if (!confirm('Supprimer ce budget ?')) return;
    
    try {
        await api.budgets.delete(id);
        showToast('Budget supprimé', 'success');
        closeBudgetModal();
        await loadBudgets();
    } catch (error) {
        console.error('Erreur suppression budget:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

// ==================== DASHBOARD ====================

/**
 * Charger les données du dashboard
 */
export async function loadDashboard() {
    try {
        const [summary, trend, alerts] = await Promise.all([
            api.dashboard.getSummary(),
            api.dashboard.getTrend(),
            api.dashboard.getAlerts()
        ]);
        
        dashboardData = { summary, trend, alerts };
        renderDashboard();
        return dashboardData;
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur lors du chargement du tableau de bord', 'error');
        return null;
    }
}

/**
 * Afficher le dashboard
 */
function renderDashboard() {
    if (!dashboardData) return;
    
    // Cartes de résumé
    renderSummaryCards(dashboardData.summary);
    
    // Graphique d'évolution
    renderTrendChart(dashboardData.trend);
    
    // Alertes budgets
    renderAlerts(dashboardData.alerts);
}

/**
 * Afficher les cartes de résumé
 */
function renderSummaryCards(summary) {
    const balance = document.getElementById('dashboard-balance');
    const income = document.getElementById('dashboard-income');
    const expense = document.getElementById('dashboard-expense');
    
    if (balance) {
        const balanceValue = (summary.totalIncome || 0) - (summary.totalExpense || 0);
        balance.textContent = formatAmount(balanceValue);
        balance.classList.toggle('positive', balanceValue >= 0);
        balance.classList.toggle('negative', balanceValue < 0);
    }
    
    if (income) {
        income.textContent = formatAmount(summary.totalIncome || 0);
    }
    
    if (expense) {
        expense.textContent = formatAmount(summary.totalExpense || 0);
    }
}

/**
 * Afficher le graphique d'évolution
 */
function renderTrendChart(trend) {
    const canvas = document.getElementById('trend-chart');
    if (!canvas || !trend.data) return;
    
    const ctx = canvas.getContext('2d');
    
    // Détruire l'ancien graphique si existe
    if (window.trendChart) {
        window.trendChart.destroy();
    }
    
    const labels = trend.data.map(d => {
        const date = new Date(d.year, d.month - 1);
        return date.toLocaleDateString('fr-FR', { month: 'short' });
    });
    
    window.trendChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Revenus',
                    data: trend.data.map(d => d.income),
                    backgroundColor: 'rgba(0, 217, 255, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Dépenses',
                    data: trend.data.map(d => d.expense),
                    backgroundColor: 'rgba(255, 77, 77, 0.8)',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#fff',
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { 
                        color: '#888',
                        callback: value => formatAmount(value, true)
                    }
                }
            }
        }
    });
}

/**
 * Afficher les alertes
 */
function renderAlerts(alerts) {
    const container = document.getElementById('budget-alerts');
    if (!container) return;
    
    if (!alerts.alerts || alerts.alerts.length === 0) {
        container.innerHTML = `
            <div class="no-alerts">
                <i class="icon-check-circle"></i>
                <span>Tous vos budgets sont sous contrôle</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (const alert of alerts.alerts) {
        const categoryInfo = getCategoryInfo(alert.category, 'expense');
        const isOver = alert.percentage >= 100;
        
        html += `
            <div class="alert-item ${isOver ? 'alert-danger' : 'alert-warning'}">
                <span class="alert-icon" style="background: ${categoryInfo.color}20; color: ${categoryInfo.color}">
                    <i class="${categoryInfo.icon}"></i>
                </span>
                <div class="alert-content">
                    <span class="alert-title">${categoryInfo.label}</span>
                    <span class="alert-message">
                        ${isOver ? 'Budget dépassé' : 'Budget bientôt atteint'}: ${Math.round(alert.percentage)}%
                    </span>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ==================== FILTRES ====================

/**
 * Appliquer les filtres de transactions
 */
export function applyFilters() {
    const type = document.getElementById('filter-type')?.value || 'all';
    const category = document.getElementById('filter-category')?.value || 'all';
    const dateFrom = document.getElementById('filter-date-from')?.value || null;
    const dateTo = document.getElementById('filter-date-to')?.value || null;
    
    loadTransactions({ type, category, dateFrom, dateTo });
}

/**
 * Réinitialiser les filtres
 */
export function resetFilters() {
    document.getElementById('filter-type').value = 'all';
    document.getElementById('filter-category').value = 'all';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    
    loadTransactions({ type: 'all', category: 'all', dateFrom: null, dateTo: null });
}

// ==================== UTILITAIRES ====================

/**
 * Afficher un indicateur de chargement
 */
function showLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el) {
        el.dataset.originalContent = el.innerHTML;
        el.innerHTML = '<div class="spinner"></div>';
        el.disabled = true;
    }
}

/**
 * Masquer l'indicateur de chargement
 */
function hideLoading(elementId) {
    const el = document.getElementById(elementId);
    if (el && el.dataset.originalContent) {
        el.innerHTML = el.dataset.originalContent;
        el.disabled = false;
    }
}

/**
 * Afficher un toast
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="toast-icon icon-${type === 'success' ? 'check' : type === 'error' ? 'x' : 'info'}"></i>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
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
