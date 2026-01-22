/**
 * E-Coris - Module Finances
 * Version corrigée - Gestion complète des budgets, graphiques et synchronisation
 */

// État local
let transactions = [];
let budgets = [];
let dashboardData = null;
let currentFilters = { type: '', category: '' };
let expenseChart = null;

// Période courante (partagée entre dashboard et budgets)
let currentMonth = new Date().getMonth() + 1;
let currentYear = new Date().getFullYear();

// ==================== INITIALISATION ====================

/**
 * Initialiser les sélecteurs de période du dashboard
 */
function initDashboardPeriodSelectors() {
    const monthSelect = document.getElementById('period-month');
    const yearSelect = document.getElementById('period-year');
    
    if (!monthSelect || !yearSelect) return;
    
    const now = new Date();
    
    // Mois
    monthSelect.innerHTML = MONTHS.map((m, i) => 
        `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`
    ).join('');
    
    // Années (3 ans: année précédente, actuelle, suivante)
    const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
    yearSelect.innerHTML = years.map(y => 
        `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
    ).join('');
}

/**
 * Changement de période depuis le dashboard
 */
function onPeriodChange() {
    const monthSelect = document.getElementById('period-month');
    const yearSelect = document.getElementById('period-year');
    
    if (monthSelect && yearSelect) {
        currentMonth = parseInt(monthSelect.value);
        currentYear = parseInt(yearSelect.value);
    }
    
    // Recharger le dashboard avec la nouvelle période
    loadDashboard();
}

// ==================== DASHBOARD ====================

/**
 * Charger le dashboard
 */
async function loadDashboard() {
    try {
        console.log(`📊 Chargement dashboard: ${currentMonth}/${currentYear}`);
        
        const [summary, trend, alerts, recent] = await Promise.all([
            API.getDashboardSummary(currentMonth, currentYear),
            API.getDashboardTrend(6),
            API.getDashboardAlerts(),
            API.getDashboardRecent(5)
        ]);
        
        dashboardData = { summary, trend, alerts, recent };
        renderDashboard();
        
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur de chargement', 'error');
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
    const totalIncome = summary.totalIncome || 0;
    const totalExpense = summary.totalExpense || 0;
    const balance = totalIncome - totalExpense;
    
    const balanceEl = document.getElementById('monthly-balance');
    if (balanceEl) {
        balanceEl.textContent = formatAmount(balance);
        balanceEl.className = 'card-amount ' + (balance >= 0 ? 'positive' : 'negative');
    }
    
    const incomeEl = document.getElementById('monthly-income');
    if (incomeEl) {
        incomeEl.textContent = formatAmount(totalIncome);
    }
    
    const expenseEl = document.getElementById('monthly-expense');
    if (expenseEl) {
        expenseEl.textContent = formatAmount(totalExpense);
    }
    
    // Graphique des dépenses
    const expensesByCategory = summary.breakdown ? summary.breakdown.expensesByCategory : {};
    renderExpenseChart(expensesByCategory);
    
    // Alertes
    renderAlerts(alerts.alerts || []);
    
    // Transactions récentes
    renderRecentTransactions(recent.transactions || []);
}

/**
 * Graphique des dépenses par catégorie
 */
function renderExpenseChart(expensesByCategory) {
    const chartContainer = document.querySelector('.chart-container');
    const legendEl = document.getElementById('expense-legend');
    
    if (!chartContainer) return;
    
    // Détruire l'ancien graphique s'il existe
    if (expenseChart) {
        expenseChart.destroy();
        expenseChart = null;
    }
    
    const categories = Object.keys(expensesByCategory || {});
    
    // Recréer le canvas
    chartContainer.innerHTML = '<canvas id="expense-chart"></canvas>';
    const canvas = document.getElementById('expense-chart');
    
    if (categories.length === 0) {
        chartContainer.innerHTML = '<p class="empty-chart">Aucune dépense ce mois</p>';
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
            <div class="transaction-date-header">${dateLabel}</div>`;
        
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
    // Chercher dans les transactions chargées
    let transaction = transactions.find(t => t.id === id);
    
    // Sinon chercher dans les transactions récentes du dashboard
    if (!transaction && dashboardData && dashboardData.recent && dashboardData.recent.transactions) {
        transaction = dashboardData.recent.transactions.find(t => t.id === id);
    }
    
    if (!transaction) {
        showToast('Transaction non trouvée', 'error');
        return;
    }
    
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
 * Charger les budgets du mois/année courant
 */
async function loadBudgets() {
    try {
        // Mettre à jour depuis les sélecteurs de la vue budgets
        const budgetMonthSelect = document.getElementById('budget-period-month');
        const budgetYearSelect = document.getElementById('budget-period-year');
        
        if (budgetMonthSelect && budgetYearSelect) {
            currentMonth = parseInt(budgetMonthSelect.value);
            currentYear = parseInt(budgetYearSelect.value);
        }
        
        console.log(`📋 Chargement budgets: ${currentMonth}/${currentYear}`);
        
        const data = await API.getBudgetTracking(currentMonth, currentYear);
        budgets = data.budgets || [];
        
        console.log('Budgets reçus:', budgets);
        
        renderBudgets();
    } catch (error) {
        console.error('Erreur chargement budgets:', error);
        showToast('Erreur de chargement des budgets', 'error');
    }
}

/**
 * Afficher les budgets
 */
function renderBudgets() {
    const container = document.getElementById('budgets-tracking');
    if (!container) return;
    
    // Créer les sélecteurs de période s'ils n'existent pas
    ensureBudgetPeriodSelectors();
    
    const monthName = MONTHS[currentMonth - 1] || '';
    
    if (!budgets || budgets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>Aucun budget défini pour ${monthName} ${currentYear}</p>
                <button class="btn btn-primary" onclick="showAddBudget()">Créer un budget</button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = budgets.map(budget => {
        const info = getCategoryInfo(budget.category, 'expense');
        const budgetAmount = budget.amount || 0;
        const spent = budget.spent || 0;
        
        // Calcul du pourcentage (peut dépasser 100%)
        const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 100) : 0;
        const displayWidth = Math.min(percentage, 100); // Barre max 100%
        const remaining = budgetAmount - spent;
        const isOver = spent > budgetAmount;
        
        // Déterminer la classe de couleur
        let progressClass = '';
        if (isOver) {
            progressClass = 'over';
        } else if (percentage >= 80) {
            progressClass = 'warning';
        }
        
        return `
            <div class="budget-card ${isOver ? 'over' : ''}" onclick="editBudget('${budget.id}')">
                <div class="budget-header">
                    <span class="budget-icon" style="background: ${info.color}20; color: ${info.color}">${info.icon}</span>
                    <span class="budget-name">${info.label}</span>
                    <span class="budget-edit-icon">✏️</span>
                </div>
                <div class="budget-progress">
                    <div class="progress-bar">
                        <div class="progress-fill ${progressClass}" style="width: ${displayWidth}%"></div>
                    </div>
                    <div class="progress-text ${isOver ? 'over' : ''}">${percentage}%</div>
                </div>
                <div class="budget-amounts">
                    <span class="spent">${formatAmount(spent)}</span>
                    <span class="separator">/</span>
                    <span class="total">${formatAmount(budgetAmount)}</span>
                </div>
                <div class="budget-remaining ${remaining < 0 ? 'over' : ''}">
                    ${remaining >= 0 ? 'Reste' : 'Dépassement'}: ${formatAmount(Math.abs(remaining))}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * S'assurer que les sélecteurs de période des budgets existent
 */
function ensureBudgetPeriodSelectors() {
    let periodSelector = document.getElementById('budget-period-selector');
    
    if (!periodSelector) {
        const header = document.querySelector('#budgets-view .view-header');
        if (header) {
            // Insérer après le titre
            const h2 = header.querySelector('h2');
            periodSelector = document.createElement('div');
            periodSelector.id = 'budget-period-selector';
            periodSelector.className = 'period-selector';
            periodSelector.innerHTML = `
                <select id="budget-period-month" onchange="loadBudgets()"></select>
                <select id="budget-period-year" onchange="loadBudgets()"></select>
            `;
            
            // Insérer avant le bouton d'ajout
            const addBtn = header.querySelector('.btn-icon');
            if (addBtn) {
                header.insertBefore(periodSelector, addBtn);
            } else {
                header.appendChild(periodSelector);
            }
        }
    }
    
    // Initialiser les options
    const monthSelect = document.getElementById('budget-period-month');
    const yearSelect = document.getElementById('budget-period-year');
    
    if (monthSelect && yearSelect) {
        const now = new Date();
        
        // Mois
        if (monthSelect.options.length === 0) {
            monthSelect.innerHTML = MONTHS.map((m, i) => 
                `<option value="${i + 1}">${m}</option>`
            ).join('');
        }
        monthSelect.value = currentMonth;
        
        // Années
        if (yearSelect.options.length === 0) {
            const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
            yearSelect.innerHTML = years.map(y => 
                `<option value="${y}">${y}</option>`
            ).join('');
        }
        yearSelect.value = currentYear;
    }
}

/**
 * Afficher le formulaire d'ajout de budget
 */
function showAddBudget() {
    const modalTitle = document.querySelector('#budget-modal .modal-header h3');
    const categorySelect = document.getElementById('budget-category');
    const monthSelect = document.getElementById('budget-month');
    const yearSelect = document.getElementById('budget-year');
    const budgetIdField = document.getElementById('budget-id');
    const deleteBtn = document.getElementById('delete-budget-btn');
    
    // Reset
    document.getElementById('budget-form').reset();
    if (budgetIdField) budgetIdField.value = '';
    if (modalTitle) modalTitle.textContent = 'Nouveau budget';
    if (deleteBtn) deleteBtn.style.display = 'none';
    
    // Catégories de dépenses
    categorySelect.innerHTML = Object.entries(CATEGORIES.expense).map(([key, val]) => 
        `<option value="${key}">${val.icon} ${val.label}</option>`
    ).join('');
    
    // Utiliser le mois/année courant
    const now = new Date();
    monthSelect.innerHTML = MONTHS.map((m, i) => 
        `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`
    ).join('');
    
    // Années
    const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
    yearSelect.innerHTML = years.map(y => 
        `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
    ).join('');
    
    openModal('budget-modal');
}

/**
 * Éditer un budget existant
 */
function editBudget(budgetId) {
    const budget = budgets.find(b => b.id === budgetId);
    if (!budget) {
        showToast('Budget non trouvé', 'error');
        return;
    }
    
    const modalTitle = document.querySelector('#budget-modal .modal-header h3');
    const categorySelect = document.getElementById('budget-category');
    const monthSelect = document.getElementById('budget-month');
    const yearSelect = document.getElementById('budget-year');
    const budgetIdField = document.getElementById('budget-id');
    const deleteBtn = document.getElementById('delete-budget-btn');
    const amountField = document.getElementById('budget-amount');
    
    // Titre
    if (modalTitle) modalTitle.textContent = 'Modifier le budget';
    
    // ID
    if (budgetIdField) budgetIdField.value = budgetId;
    
    // Montant
    if (amountField) amountField.value = budget.amount;
    
    // Catégories - sélectionner la catégorie actuelle
    categorySelect.innerHTML = Object.entries(CATEGORIES.expense).map(([key, val]) => 
        `<option value="${key}" ${key === budget.category ? 'selected' : ''}>${val.icon} ${val.label}</option>`
    ).join('');
    
    // Mois
    const now = new Date();
    monthSelect.innerHTML = MONTHS.map((m, i) => 
        `<option value="${i + 1}" ${i + 1 === currentMonth ? 'selected' : ''}>${m}</option>`
    ).join('');
    
    // Années
    const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
    yearSelect.innerHTML = years.map(y => 
        `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`
    ).join('');
    
    // Afficher le bouton supprimer
    if (deleteBtn) {
        deleteBtn.style.display = 'block';
    }
    
    openModal('budget-modal');
}

/**
 * Sauvegarder un budget (création ou modification)
 */
async function saveBudget(event) {
    event.preventDefault();
    
    const budgetIdField = document.getElementById('budget-id');
    const budgetId = budgetIdField ? budgetIdField.value : '';
    
    const data = {
        category: document.getElementById('budget-category').value,
        amount: parseFloat(document.getElementById('budget-amount').value),
        month: parseInt(document.getElementById('budget-month').value),
        year: parseInt(document.getElementById('budget-year').value)
    };
    
    try {
        if (budgetId) {
            // Modification
            await API.updateBudget(budgetId, data);
            showToast('Budget modifié', 'success');
        } else {
            // Création
            await API.createBudget(data);
            showToast('Budget créé', 'success');
        }
        
        closeModal();
        
        // Mettre à jour la période courante
        currentMonth = data.month;
        currentYear = data.year;
        
        // Synchroniser les sélecteurs du dashboard
        const dashboardMonthSelect = document.getElementById('period-month');
        const dashboardYearSelect = document.getElementById('period-year');
        if (dashboardMonthSelect) dashboardMonthSelect.value = currentMonth;
        if (dashboardYearSelect) dashboardYearSelect.value = currentYear;
        
        // Recharger les données
        loadBudgets();
        loadDashboard();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
    
    return false;
}

/**
 * Supprimer un budget
 */
async function deleteBudget() {
    const budgetIdField = document.getElementById('budget-id');
    const budgetId = budgetIdField ? budgetIdField.value : '';
    
    if (!budgetId) {
        showToast('Aucun budget sélectionné', 'error');
        return;
    }
    
    if (!confirm('Supprimer ce budget ?')) return;
    
    try {
        await API.deleteBudget(budgetId);
        showToast('Budget supprimé', 'success');
        closeModal();
        loadBudgets();
        loadDashboard();
    } catch (error) {
        showToast(error.message || 'Erreur', 'error');
    }
}

// ==================== NAVIGATION ====================

/**
 * Afficher le dashboard
 */
function showDashboard() {
    document.getElementById('dashboard-view').classList.add('active');
    document.getElementById('transactions-view').classList.remove('active');
    document.getElementById('budgets-view').classList.remove('active');
    
    // Synchroniser les sélecteurs du dashboard
    const monthSelect = document.getElementById('period-month');
    const yearSelect = document.getElementById('period-year');
    if (monthSelect) monthSelect.value = currentMonth;
    if (yearSelect) yearSelect.value = currentYear;
    
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

// ==================== EXPORTS GLOBAUX ====================

window.initDashboardPeriodSelectors = initDashboardPeriodSelectors;
window.onPeriodChange = onPeriodChange;
window.loadDashboard = loadDashboard;
window.loadTransactions = loadTransactions;
window.loadBudgets = loadBudgets;
window.showAddTransaction = showAddTransaction;
window.editTransaction = editTransaction;
window.saveTransaction = saveTransaction;
window.showTransactionFilters = showTransactionFilters;
window.filterTransactions = filterTransactions;
window.showAddBudget = showAddBudget;
window.editBudget = editBudget;
window.saveBudget = saveBudget;
window.deleteBudget = deleteBudget;
window.showDashboard = showDashboard;
window.showTransactions = showTransactions;
window.showBudgets = showBudgets;

console.log('✅ Finances module chargé');
