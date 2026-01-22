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

// Catégories avec icônes et couleurs
const CATEGORIES = {
    income: {
        'salary': { label: 'Salaire', icon: 'icon-briefcase', color: '#4ADE80' },
        'freelance': { label: 'Freelance', icon: 'icon-laptop', color: '#2DD4BF' },
        'investments': { label: 'Investissements', icon: 'icon-trending-up', color: '#00D9FF' },
        'gifts': { label: 'Cadeaux', icon: 'icon-gift', color: '#F472B6' },
        'refunds': { label: 'Remboursements', icon: 'icon-refresh', color: '#A78BFA' },
        'other_income': { label: 'Autres revenus', icon: 'icon-plus-circle', color: '#60A5FA' }
    },
    expense: {
        'food': { label: 'Alimentation', icon: 'icon-shopping-cart', color: '#FF6B6B' },
        'transport': { label: 'Transport', icon: 'icon-car', color: '#FF9F43' },
        'housing': { label: 'Logement', icon: 'icon-home', color: '#FBBF24' },
        'health': { label: 'Santé', icon: 'icon-heart', color: '#F472B6' },
        'leisure': { label: 'Loisirs', icon: 'icon-film', color: '#A78BFA' },
        'shopping': { label: 'Shopping', icon: 'icon-shopping-bag', color: '#7B2DFF' },
        'bills': { label: 'Factures', icon: 'icon-file-text', color: '#60A5FA' },
        'education': { label: 'Éducation', icon: 'icon-book', color: '#2DD4BF' },
        'savings': { label: 'Épargne', icon: 'icon-piggy-bank', color: '#4ADE80' },
        'other_expense': { label: 'Autres dépenses', icon: 'icon-more-horizontal', color: '#888' }
    }
};

// ==================== TRANSACTIONS ====================

/**
 * Charger les transactions
 */
async function loadTransactions(filters = {}) {
    try {
        const mergedFilters = { ...currentFilters, ...filters };
        currentFilters = mergedFilters;
        
        const data = await API.getTransactions(mergedFilters);
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/>
                </svg>
                <p>Aucune transaction pour le moment</p>
                <button class="btn btn-primary" onclick="openTransactionModal()">
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
}

/**
 * Rendre un élément de transaction
 */
function renderTransactionItem(transaction) {
    const isIncome = transaction.type === 'income';
    const categoryInfo = getCategoryInfo(transaction.category, transaction.type);
    
    return `
        <div class="transaction-item" data-id="${transaction.id}" onclick="openTransactionModal('${transaction.id}')">
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
function groupTransactionsByDate(transactionsList) {
    const grouped = {};
    transactionsList.forEach(t => {
        const date = t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0];
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
    return categories[category] || { label: category || 'Autre', icon: 'icon-tag', color: '#666' };
}

/**
 * Ouvrir le modal de transaction
 */
function openTransactionModal(transactionId = null) {
    const modal = document.getElementById('transaction-modal');
    const form = document.getElementById('transaction-form');
    const title = modal.querySelector('.modal-title');
    const deleteBtn = document.getElementById('delete-transaction-btn');
    
    if (!modal || !form) return;
    
    // Reset form
    form.reset();
    
    const transaction = transactionId ? transactions.find(t => t.id === transactionId) : null;
    
    if (transaction) {
        // Mode édition
        title.textContent = 'Modifier la transaction';
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = () => deleteTransaction(transaction.id);
        }
        
        document.getElementById('transaction-id').value = transaction.id;
        document.getElementById('transaction-type').value = transaction.type;
        document.getElementById('transaction-amount').value = transaction.amount;
        document.getElementById('transaction-date').value = transaction.date ? transaction.date.split('T')[0] : '';
        document.getElementById('transaction-description').value = transaction.description || '';
        
        updateCategoryOptions(transaction.type);
        document.getElementById('transaction-category').value = transaction.category;
    } else {
        // Mode création
        title.textContent = 'Nouvelle transaction';
        if (deleteBtn) deleteBtn.style.display = 'none';
        document.getElementById('transaction-id').value = '';
        document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        updateCategoryOptions('expense');
    }
    
    openModal('transaction-modal');
}

/**
 * Mettre à jour les options de catégorie selon le type
 */
function updateCategoryOptions(type) {
    const select = document.getElementById('transaction-category');
    if (!select) return;
    
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
async function saveTransaction(event) {
    event.preventDefault();
    
    const id = document.getElementById('transaction-id').value;
    
    const data = {
        type: document.getElementById('transaction-type').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        category: document.getElementById('transaction-category').value,
        date: document.getElementById('transaction-date').value,
        description: document.getElementById('transaction-description').value
    };
    
    try {
        if (id) {
            await API.updateTransaction(id, data);
            showToast('Transaction modifiée avec succès', 'success');
        } else {
            await API.createTransaction(data);
            showToast('Transaction ajoutée avec succès', 'success');
        }
        
        closeModal();
        await loadTransactions();
        await loadDashboard();
        
    } catch (error) {
        console.error('Erreur sauvegarde transaction:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    }
}

/**
 * Supprimer une transaction
 */
async function deleteTransaction(id) {
    if (!confirm('Supprimer cette transaction ?')) return;
    
    try {
        await API.deleteTransaction(id);
        showToast('Transaction supprimée', 'success');
        closeModal();
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
async function loadBudgets() {
    try {
        const now = new Date();
        const data = await API.getBudgetTracking(now.getMonth() + 1, now.getFullYear());
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
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 6v6l4 2"/>
                </svg>
                <p>Aucun budget défini</p>
                <button class="btn btn-primary" onclick="openBudgetModal()">
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
                    <button class="btn-icon" onclick="openBudgetModal('${budget.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
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
function openBudgetModal(budgetId = null) {
    const modal = document.getElementById('budget-modal');
    const form = document.getElementById('budget-form');
    const title = modal.querySelector('.modal-title');
    const deleteBtn = document.getElementById('delete-budget-btn');
    
    if (!modal || !form) return;
    
    // Reset form
    form.reset();
    
    // Remplir les catégories
    const categorySelect = document.getElementById('budget-category');
    categorySelect.innerHTML = '';
    for (const [value, info] of Object.entries(CATEGORIES.expense)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = info.label;
        categorySelect.appendChild(option);
    }
    
    // Date par défaut: mois en cours
    const now = new Date();
    document.getElementById('budget-month').value = now.getMonth() + 1;
    document.getElementById('budget-year').value = now.getFullYear();
    
    const budget = budgetId ? budgets.find(b => b.id === budgetId) : null;
    
    if (budget) {
        // Mode édition
        title.textContent = 'Modifier le budget';
        if (deleteBtn) {
            deleteBtn.style.display = 'block';
            deleteBtn.onclick = () => deleteBudget(budget.id);
        }
        
        document.getElementById('budget-id').value = budget.id;
        document.getElementById('budget-category').value = budget.category;
        document.getElementById('budget-amount').value = budget.amount;
        document.getElementById('budget-month').value = budget.month;
        document.getElementById('budget-year').value = budget.year;
    } else {
        // Mode création
        title.textContent = 'Nouveau budget';
        if (deleteBtn) deleteBtn.style.display = 'none';
        document.getElementById('budget-id').value = '';
    }
    
    openModal('budget-modal');
}

/**
 * Sauvegarder un budget
 */
async function saveBudget(event) {
    event.preventDefault();
    
    const id = document.getElementById('budget-id').value;
    
    const data = {
        category: document.getElementById('budget-category').value,
        amount: parseFloat(document.getElementById('budget-amount').value),
        month: parseInt(document.getElementById('budget-month').value),
        year: parseInt(document.getElementById('budget-year').value)
    };
    
    try {
        if (id) {
            await API.updateBudget(id, data);
            showToast('Budget modifié avec succès', 'success');
        } else {
            await API.createBudget(data);
            showToast('Budget créé avec succès', 'success');
        }
        
        closeModal();
        await loadBudgets();
        await loadDashboard();
        
    } catch (error) {
        console.error('Erreur sauvegarde budget:', error);
        showToast('Erreur lors de la sauvegarde', 'error');
    }
}

/**
 * Supprimer un budget
 */
async function deleteBudget(id) {
    if (!confirm('Supprimer ce budget ?')) return;
    
    try {
        await API.deleteBudget(id);
        showToast('Budget supprimé', 'success');
        closeModal();
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
async function loadDashboard() {
    try {
        const now = new Date();
        const [summary, trend, alerts] = await Promise.all([
            API.getDashboardSummary(now.getMonth() + 1, now.getFullYear()),
            API.getDashboardTrend(6),
            API.getDashboardAlerts()
        ]);
        
        dashboardData = { summary, trend, alerts };
        renderDashboard();
        return dashboardData;
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
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
        balance.className = balanceValue >= 0 ? 'positive' : 'negative';
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
    if (!canvas || !trend || !trend.data) return;
    
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
                    data: trend.data.map(d => d.income || 0),
                    backgroundColor: 'rgba(0, 217, 255, 0.8)',
                    borderRadius: 4
                },
                {
                    label: 'Dépenses',
                    data: trend.data.map(d => d.expense || 0),
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
                        callback: value => formatAmount(value)
                    }
                }
            }
        }
    });
}

/**
 * Afficher les alertes
 */
function renderAlerts(alertsData) {
    const container = document.getElementById('budget-alerts');
    if (!container) return;
    
    if (!alertsData || !alertsData.alerts || alertsData.alerts.length === 0) {
        container.innerHTML = `
            <div class="no-alerts">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="24" height="24">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Tous vos budgets sont sous contrôle</span>
            </div>
        `;
        return;
    }
    
    let html = '';
    for (const alert of alertsData.alerts) {
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

// ==================== UTILITAIRES ====================

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
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-message">${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Exposer showToast globalement
window.showToast = showToast;
