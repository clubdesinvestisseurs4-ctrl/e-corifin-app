/**
 * E-Coris - Module Finances
 */

// État local
let transactions = [];
let budgets = [];
let dashboardData = null;
let currentFilters = { type: '', category: '' };
let expenseChart = null;

// ==================== DASHBOARD ====================

/**
 * Charger le dashboard
 */
async function loadDashboard() {
    try {
        const now = new Date();
        const monthSelect = document.getElementById('period-month');
        const yearSelect = document.getElementById('period-year');
        
        const month = monthSelect ? parseInt(monthSelect.value) : now.getMonth() + 1;
        const year = yearSelect ? parseInt(yearSelect.value) : now.getFullYear();
        
        const [summary, trend, alerts, recent] = await Promise.all([
            API.getDashboardSummary(month, year),
            API.getDashboardTrend(6),
            API.getDashboardAlerts(),
            API.getDashboardRecent(5)
        ]);
        
        dashboardData = { summary, trend, alerts, recent };
        renderDashboard();
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
    }
}

/**
 * Afficher le dashboard
 */
function renderDashboard() {
    if (!dashboardData) return;
    
    const { summary, alerts, recent } = dashboardData;
    
    // Afficher le nom de l'utilisateur
    const user = getCurrentUser();
    const userName = document.getElementById('user-name');
    if (userName && user) {
        userName.textContent = user.fullName ? user.fullName.split(' ')[0] : 'Utilisateur';
    }
    
    // Date du jour
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        dateEl.textContent = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
    
    // Montants
    const balance = (summary.totalIncome || 0) - (summary.totalExpense || 0);
    
    const balanceEl = document.getElementById('monthly-balance');
    if (balanceEl) {
        balanceEl.textContent = formatAmount(balance);
        balanceEl.className = 'card-amount ' + (balance >= 0 ? 'positive' : 'negative');
    }
    
    const incomeEl = document.getElementById('monthly-income');
    if (incomeEl) {
        incomeEl.textContent = formatAmount(summary.totalIncome || 0);
    }
    
    const expenseEl = document.getElementById('monthly-expense');
    if (expenseEl) {
        expenseEl.textContent = formatAmount(summary.totalExpense || 0);
    }
    
    // Graphique des dépenses
    renderExpenseChart(summary.breakdown ? summary.breakdown.expensesByCategory : {});
    
    // Alertes
    renderAlerts(alerts.alerts || []);
    
    // Transactions récentes
    renderRecentTransactions(recent.transactions || []);
}

/**
 * Graphique des dépenses par catégorie
 */
function renderExpenseChart(expensesByCategory) {
    const canvas = document.getElementById('expense-chart');
    const legendEl = document.getElementById('expense-legend');
    if (!canvas) return;
    
    const categories = Object.keys(expensesByCategory);
    
    if (categories.length === 0) {
        canvas.parentElement.innerHTML = '<p class="empty-chart">Aucune dépense ce mois</p>';
        if (legendEl) legendEl.innerHTML = '';
        return;
    }
    
    const labels = [];
    const data = [];
    const colors = [];
    
    categories.forEach(cat => {
        const info = getCategoryInfo(cat, 'expense');
        labels.push(info.label);
        data.push(expensesByCategory[cat]);
        colors.push(info.color);
    });
    
    const ctx = canvas.getContext('2d');
    
    if (expenseChart) {
        expenseChart.destroy();
    }
    
    expenseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            cutout: '65%'
        }
    });
    
    // Légende personnalisée
    if (legendEl) {
        legendEl.innerHTML = labels.map((label, i) => `
            <div class="legend-item">
                <span class="legend-color" style="background: ${colors[i]}"></span>
                <span class="legend-label">${label}</span>
                <span class="legend-value">${formatAmount(data[i])}</span>
            </div>
        `).join('');
    }
}

/**
 * Afficher les alertes
 */
function renderAlerts(alerts) {
    const container = document.getElementById('budget-alerts');
    if (!container) return;
    
    if (!alerts || alerts.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = alerts.map(alert => {
        const info = getCategoryInfo(alert.category, 'expense');
        return `
            <div class="alert alert-${alert.type}">
                <span class="alert-icon">${info.icon}</span>
                <span class="alert-text">${info.label}: ${alert.message}</span>
            </div>
        `;
    }).join('');
}

/**
 * Afficher les transactions récentes
 */
function renderRecentTransactions(transactionsList) {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    if (!transactionsList || transactionsList.length === 0) {
        container.innerHTML = '<p class="empty-list">Aucune transaction récente</p>';
        return;
    }
    
    container.innerHTML = transactionsList.map(t => {
        const info = getCategoryInfo(t.category, t.type);
        const isIncome = t.type === 'income';
        return `
            <div class="transaction-item" onclick="editTransaction('${t.id}')">
                <div class="transaction-icon" style="background: ${info.color}20; color: ${info.color}">${info.icon}</div>
                <div class="transaction-info">
                    <span class="transaction-category">${info.label}</span>
                    <span class="transaction-date">${formatDate(t.date)}</span>
                </div>
                <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                    ${isIncome ? '+' : '-'}${formatAmount(t.amount)}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== TRANSACTIONS ====================

/**
 * Charger toutes les transactions
 */
async function loadTransactions() {
    try {
        const data = await API.getTransactions(currentFilters);
        transactions = data.transactions || [];
        renderAllTransactions();
    } catch (error) {
        console.error('Erreur chargement transactions:', error);
    }
}

/**
 * Afficher toutes les transactions
 */
function renderAllTransactions() {
    const container = document.getElementById('all-transactions');
    if (!container) return;
    
    if (transactions.length === 0) {
        container.innerHTML = '<p class="empty-list">Aucune transaction</p>';
        return;
    }
    
    // Grouper par date
    const grouped = {};
    transactions.forEach(t => {
        const date = t.date ? t.date.split('T')[0] : 'Date inconnue';
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(t);
    });
    
    let html = '';
    Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).forEach(date => {
        const dateObj = new Date(date);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        let dateLabel;
        if (date === today.toISOString().split('T')[0]) {
            dateLabel = "Aujourd'hui";
        } else if (date === yesterday.toISOString().split('T')[0]) {
            dateLabel = 'Hier';
        } else {
            dateLabel = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
        }
        
        html += `<div class="transaction-group">
            <div class="transaction-date">${dateLabel}</div>`;
        
        grouped[date].forEach(t => {
            const info = getCategoryInfo(t.category, t.type);
            const isIncome = t.type === 'income';
            html += `
                <div class="transaction-item" onclick="editTransaction('${t.id}')">
                    <div class="transaction-icon" style="background: ${info.color}20; color: ${info.color}">${info.icon}</div>
                    <div class="transaction-info">
                        <span class="transaction-category">${info.label}</span>
                        <span class="transaction-desc">${t.description || ''}</span>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${formatAmount(t.amount)}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    container.innerHTML = html;
}

/**
 * Afficher le formulaire d'ajout de transaction
 */
function showAddTransaction(type) {
    const modal = document.getElementById('transaction-modal');
    const title = document.getElementById('transaction-modal-title');
    const typeHidden = document.getElementById('transaction-type-hidden');
    const categorySelect = document.getElementById('transaction-category');
    
    // Reset
    document.getElementById('transaction-form').reset();
    document.getElementById('transaction-id').value = '';
    document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
    
    // Titre
    title.textContent = type === 'income' ? 'Ajouter un revenu' : 'Ajouter une dépense';
    typeHidden.value = type;
    
    // Catégories
    const categories = type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    categorySelect.innerHTML = Object.entries(categories).map(([key, val]) => 
        `<option value="${key}">${val.icon} ${val.label}</option>`
    ).join('');
    
    openModal('transaction-modal');
}

/**
 * Éditer une transaction
 */
function editTransaction(id) {
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;
    
    const title = document.getElementById('transaction-modal-title');
    const typeHidden = document.getElementById('transaction-type-hidden');
    const categorySelect = document.getElementById('transaction-category');
    
    title.textContent = 'Modifier la transaction';
    document.getElementById('transaction-id').value = id;
    typeHidden.value = transaction.type;
    document.getElementById('transaction-amount').value = transaction.amount;
    document.getElementById('transaction-date').value = transaction.date ? transaction.date.split('T')[0] : '';
    document.getElementById('transaction-description').value = transaction.description || '';
    
    // Catégories
    const categories = transaction.type === 'income' ? CATEGORIES.income : CATEGORIES.expense;
    categorySelect.innerHTML = Object.entries(categories).map(([key, val]) => 
        `<option value="${key}" ${key === transaction.category ? 'selected' : ''}>${val.icon} ${val.label}</option>`
    ).join('');
    
    openModal('transaction-modal');
}

/**
 * Sauvegarder une transaction
 */
async function saveTransaction(event) {
    event.preventDefault();
    
    const id = document.getElementById('transaction-id').value;
    const data = {
        type: document.getElementById('transaction-type-hidden').value,
        amount: parseFloat(document.getElementById('transaction-amount').value),
        category: document.getElementById('transaction-category').value,
        date: document.getElementById('transaction-date').value,
        description: document.getElementById('transaction-description').value
    };
    
    try {
        if (id) {
            await API.updateTransaction(id, data);
            showToast('Transaction modifiée', 'success');
        } else {
            await API.createTransaction(data);
            showToast('Transaction ajoutée', 'success');
        }
        
        closeModal();
        loadDashboard();
        loadTransactions();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
    
    return false;
}

/**
 * Afficher/Masquer les filtres
 */
function showTransactionFilters() {
    const filters = document.getElementById('transaction-filters');
    if (filters) {
        filters.classList.toggle('hidden');
    }
}

/**
 * Filtrer les transactions
 */
function filterTransactions() {
    currentFilters.type = document.getElementById('filter-type').value;
    currentFilters.category = document.getElementById('filter-category').value;
    loadTransactions();
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
    } catch (error) {
        console.error('Erreur chargement budgets:', error);
    }
}

/**
 * Afficher les budgets
 */
function renderBudgets() {
    const container = document.getElementById('budgets-tracking');
    if (!container) return;
    
    if (budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucun budget défini</p>
                <button class="btn btn-primary" onclick="showAddBudget()">Créer un budget</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = budgets.map(budget => {
        const info = getCategoryInfo(budget.category, 'expense');
        const spent = budget.spent || 0;
        const percentage = Math.min(Math.round((spent / budget.amount) * 100), 100);
        const remaining = budget.amount - spent;
        const isOver = spent > budget.amount;
        
        return `
            <div class="budget-card ${isOver ? 'over' : ''}">
                <div class="budget-header">
                    <span class="budget-icon" style="background: ${info.color}20; color: ${info.color}">${info.icon}</span>
                    <span class="budget-name">${info.label}</span>
                </div>
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${isOver ? 'over' : ''}" style="width: ${percentage}%"></div>
                    </div>
                    <div class="progress-text">${percentage}%</div>
                </div>
                <div class="budget-amounts">
                    <span class="spent">${formatAmount(spent)}</span>
                    <span class="separator">/</span>
                    <span class="total">${formatAmount(budget.amount)}</span>
                </div>
                <div class="budget-remaining ${remaining < 0 ? 'over' : ''}">
                    ${remaining >= 0 ? 'Reste' : 'Dépassement'}: ${formatAmount(Math.abs(remaining))}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Afficher le formulaire d'ajout de budget
 */
function showAddBudget() {
    const categorySelect = document.getElementById('budget-category');
    const monthSelect = document.getElementById('budget-month');
    const yearSelect = document.getElementById('budget-year');
    
    // Reset
    document.getElementById('budget-form').reset();
    
    // Catégories de dépenses
    categorySelect.innerHTML = Object.entries(CATEGORIES.expense).map(([key, val]) => 
        `<option value="${key}">${val.icon} ${val.label}</option>`
    ).join('');
    
    // Mois
    const now = new Date();
    monthSelect.innerHTML = MONTHS.map((m, i) => 
        `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${m}</option>`
    ).join('');
    
    // Années
    yearSelect.innerHTML = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => 
        `<option value="${y}" ${y === now.getFullYear() ? 'selected' : ''}>${y}</option>`
    ).join('');
    
    openModal('budget-modal');
}

/**
 * Sauvegarder un budget
 */
async function saveBudget(event) {
    event.preventDefault();
    
    const data = {
        category: document.getElementById('budget-category').value,
        amount: parseFloat(document.getElementById('budget-amount').value),
        month: parseInt(document.getElementById('budget-month').value),
        year: parseInt(document.getElementById('budget-year').value)
    };
    
    try {
        await API.createBudget(data);
        showToast('Budget créé', 'success');
        closeModal();
        loadBudgets();
        loadDashboard();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
    
    return false;
}

// ==================== NAVIGATION ====================

/**
 * Afficher le dashboard
 */
function showDashboard() {
    document.getElementById('dashboard-view').classList.add('active');
    document.getElementById('transactions-view').classList.remove('active');
    document.getElementById('budgets-view').classList.remove('active');
    loadDashboard();
}

/**
 * Afficher les transactions
 */
function showTransactions() {
    document.getElementById('dashboard-view').classList.remove('active');
    document.getElementById('transactions-view').classList.add('active');
    document.getElementById('budgets-view').classList.remove('active');
    loadTransactions();
}

/**
 * Afficher les budgets
 */
function showBudgets() {
    document.getElementById('dashboard-view').classList.remove('active');
    document.getElementById('transactions-view').classList.remove('active');
    document.getElementById('budgets-view').classList.add('active');
    loadBudgets();
}

// Exposer globalement
window.loadDashboard = loadDashboard;
window.loadTransactions = loadTransactions;
window.loadBudgets = loadBudgets;
window.showAddTransaction = showAddTransaction;
window.editTransaction = editTransaction;
window.saveTransaction = saveTransaction;
window.showTransactionFilters = showTransactionFilters;
window.filterTransactions = filterTransactions;
window.showAddBudget = showAddBudget;
window.saveBudget = saveBudget;
window.showDashboard = showDashboard;
window.showTransactions = showTransactions;
window.showBudgets = showBudgets;

console.log('✅ Finances module chargé');
