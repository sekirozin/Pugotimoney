// Wrapper de fetch com autenticação
const origFetch = window.fetch;
window.fetch = function(url, options = {}) {
    const token = localStorage.getItem('authToken');
    if (token) {
        options.headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    }
    return origFetch.call(this, url, options);
};

// Sanitização para prevenir XSS
function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function applyTheme(theme) {
    const isDark = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDark);
    const button = document.getElementById('theme-toggle-button');
    const icon = document.getElementById('theme-toggle-icon');
    if (button) {
        button.title = isDark ? 'Ativar modo claro' : 'Ativar modo escuro';
        button.setAttribute('aria-label', button.title);
    }
    if (icon) icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
    document.getElementById('profile-menu')?.classList.remove('open');
    window.app?.refreshIcons();
}

applyTheme('dark');

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        handleLogin();
    });

    document.getElementById('register-form')?.addEventListener('submit', (event) => {
        event.preventDefault();
        handleRegister();
    });
});

// Funções de autenticação
async function checkFirstUser() {
    const res = await origFetch('/api/auth/check-first-user');
    const data = await res.json();
    return data.success && data.data && !data.data.hasUsers;
}

async function handleLogin() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    if (!username || !password) { showAuthError('Preencha todos os campos'); return; }
    try {
        const res = await origFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('authUser', JSON.stringify(data.data));
            hideAuth();
            startApp();
        } else {
            showAuthError(data.error || 'Erro ao fazer login');
        }
    } catch (e) {
        showAuthError('Erro ao conectar ao servidor');
    }
}

async function handleRegister() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    if (!username || !password) { showAuthError('Preencha todos os campos'); return; }
    if (password.length < 8) { showAuthError('A senha deve ter pelo menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(password)) { showAuthError('A senha deve conter pelo menos uma letra maiúscula'); return; }
    if (!/[0-9]/.test(password)) { showAuthError('A senha deve conter pelo menos um número'); return; }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) { showAuthError('A senha deve conter pelo menos um caractere especial'); return; }
    try {
        const res = await origFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('authUser', JSON.stringify(data.data));
            hideAuth();
            startApp();
        } else {
            showAuthError(data.error || 'Erro ao registrar');
        }
    } catch (e) {
        showAuthError('Erro ao conectar ao servidor');
    }
}

function showLogin() {
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('auth-subtitle').textContent = 'Faça login para continuar';
    document.getElementById('auth-error').style.display = 'none';
}

function showRegister() {
    document.getElementById('register-username').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('auth-subtitle').textContent = 'Crie sua conta';
    document.getElementById('auth-error').style.display = 'none';
}

function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function hideAuth() {
    document.getElementById('auth-page').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    updateProfileInfo();
    void refreshPugotiProfile();
}

function profileLabel(user) {
    return user.nickname || user.displayName || user.username;
}

function profileRoleLabel(role) {
    return role === 'admin' ? 'Administrador' : 'Usuário';
}

function setProfileAvatar(element, user) {
    if (!element) return;
    const label = profileLabel(user);
    element.textContent = label.charAt(0).toUpperCase();
    element.style.backgroundImage = '';
    element.dataset.avatarUrl = user.avatarUrl || '';
    if (user.avatarUrl) {
        element.textContent = '';
        element.style.backgroundImage = `url("${String(user.avatarUrl).replaceAll('"', '%22')}")`;
    }
}

async function refreshPugotiProfile() {
    try {
        const response = await fetch('/api/profile');
        const data = await response.json();
        if (!data.success) return null;
        const user = {
            ...JSON.parse(localStorage.getItem('authUser') || '{}'),
            ...data.data
        };
        localStorage.setItem('authUser', JSON.stringify(user));
        updateProfileInfo();
        return data.data;
    } catch {
        return null;
    }
}

function updateProfileInfo() {
    const userData = localStorage.getItem('authUser');
    if (!userData) return;
    const user = JSON.parse(userData);
    document.getElementById('user-name').textContent = profileLabel(user);
    document.getElementById('user-role').textContent = profileRoleLabel(user.role);
    setProfileAvatar(document.getElementById('user-avatar'), user);
    setProfileAvatar(document.getElementById('profile-menu-avatar'), user);
    const badge = document.getElementById('user-role');
    badge.textContent = profileRoleLabel(user.role);
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    menu.classList.toggle('open');
}

document.addEventListener('click', function(e) {
    const area = document.querySelector('.profile-area');
    if (area && !area.contains(e.target)) {
        document.getElementById('profile-menu')?.classList.remove('open');
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = `https://pugotilab.com/auth/logout?return=${encodeURIComponent(window.location.origin)}`;
}

async function startApp() {
    window.app = new FinanceApp();
}

// Perfil
async function openProfileModal() {
    document.getElementById('profile-menu').classList.remove('open');
    const modal = document.getElementById('profile-modal');
    modal.style.display = 'block';

    const userData = localStorage.getItem('authUser');
    if (userData) {
        const user = JSON.parse(userData);
        document.getElementById('profile-username').textContent = profileLabel(user);
        const badge = document.getElementById('profile-role-badge');
        badge.textContent = user.role;
        badge.setAttribute('data-role', user.role);
        setProfileAvatar(document.getElementById('profile-avatar'), user);
    }

    try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.success) {
            const profile = data.data;
            document.getElementById('profile-username').textContent = profileLabel(profile);
            document.getElementById('profile-nickname').value = profile.nickname || '';
            document.getElementById('profile-bio').value = profile.biography || '';
            document.getElementById('profile-location').value = data.data.location || '';
            setProfileAvatar(document.getElementById('profile-avatar'), profile);
            localStorage.setItem('authUser', JSON.stringify({
                ...JSON.parse(localStorage.getItem('authUser') || '{}'),
                ...profile
            }));
            updateProfileInfo();
            if (data.data.createdAt) {
                const d = new Date(data.data.createdAt);
                document.getElementById('profile-member-since').textContent =
                    `Membro desde ${d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
            }
        }
    } catch (e) {
        console.error('Erro ao carregar perfil:', e);
    }
}

function closeProfileModal() {
    document.getElementById('profile-modal').style.display = 'none';
}

async function saveProfile() {
    const nickname = document.getElementById('profile-nickname').value.trim();
    const biography = document.getElementById('profile-bio').value.trim();
    const location = document.getElementById('profile-location').value.trim();
    const avatarUrl = document.getElementById('profile-avatar').dataset.avatarUrl || '';
    try {
        const res = await fetch('/api/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname, biography, location, avatarUrl })
        });
        const data = await res.json();
        if (data.success) {
            localStorage.setItem('authUser', JSON.stringify({
                ...JSON.parse(localStorage.getItem('authUser') || '{}'),
                ...data.data
            }));
            updateProfileInfo();
            closeProfileModal();
        } else {
            alert(data.error || 'Erro ao salvar perfil');
        }
    } catch (e) {
        alert('Erro ao conectar ao servidor');
    }
}

document.getElementById('profile-avatar-file')?.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 350000) {
        alert('Use uma imagem de até 350 KB.');
        event.target.value = '';
        return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
        const avatarUrl = String(reader.result || '');
        const avatar = document.getElementById('profile-avatar');
        avatar.dataset.avatarUrl = avatarUrl;
        setProfileAvatar(avatar, {
            nickname: document.getElementById('profile-nickname').value,
            username: document.getElementById('profile-username').textContent,
            avatarUrl
        });
    });
    reader.readAsDataURL(file);
});

// Inicialização: verificar autenticação
(async function() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const res = await origFetch('/api/auth/me');
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('authUser', JSON.stringify(data.data));
                hideAuth();
                startApp();
                return;
            }
        } catch (e) {}
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    }
    try {
        const response = await origFetch('/api/auth/sso', { credentials: 'include' });
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('authToken', data.data.token);
            localStorage.setItem('authUser', JSON.stringify(data.data));
            hideAuth();
            startApp();
            return;
        }
    } catch (error) {
        console.error('Falha ao iniciar sessão PugotiLab:', error);
    }
    window.location.href = `https://pugotilab.com/auth?return=${encodeURIComponent(window.location.href)}`;
})();

class FinanceApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.transactions = [];
        this.shoppingList = [];
        this.creditCards = [];
        this.budgets = [];
        this.installments = [];
        this.subscriptions = [];
        this.goals = [];
        this.incomes = [];
        this.charts = {};
        this.selectedMonth = new Date().getMonth();
        this.selectedYear = new Date().getFullYear();
        this.shoppingFilter = 'all';
        this.installmentPreviewIndexes = {};
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.populateYearDropdown();
        this.setDefaultMonthYear();
        await this.loadInitialData();
        this.initCharts();
        this.updateDashboard();
        this.refreshIcons();
    }

    populateYearDropdown() {
        const yearSelect = document.getElementById('dashboard-year');
        const reportYearSelect = document.getElementById('report-year');
        const filterYearSelect = document.getElementById('filter-year');
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (yearSelect) yearSelect.appendChild(opt.cloneNode(true));
            if (reportYearSelect) reportYearSelect.appendChild(opt.cloneNode(true));
            if (filterYearSelect) filterYearSelect.appendChild(opt.cloneNode(true));
        }
    }

    setDefaultMonthYear() {
        const monthSelect = document.getElementById('dashboard-month');
        const yearSelect = document.getElementById('dashboard-year');
        const reportMonthSelect = document.getElementById('report-month');
        const reportYearSelect = document.getElementById('report-year');
        const filterMonthSelect = document.getElementById('filter-month');
        const filterYearSelect = document.getElementById('filter-year');
        if (monthSelect) monthSelect.value = this.selectedMonth;
        if (yearSelect) yearSelect.value = this.selectedYear;
        if (reportMonthSelect) reportMonthSelect.value = this.selectedMonth + 1;
        if (reportYearSelect) reportYearSelect.value = this.selectedYear;
        if (filterMonthSelect) filterMonthSelect.value = this.selectedMonth + 1;
        if (filterYearSelect) filterYearSelect.value = this.selectedYear;
    }

    onDashboardPeriodChange() {
        const monthSelect = document.getElementById('dashboard-month');
        const yearSelect = document.getElementById('dashboard-year');
        if (monthSelect) this.selectedMonth = parseInt(monthSelect.value);
        if (yearSelect) this.selectedYear = parseInt(yearSelect.value);
        this.updateDashboard();
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.navigateTo(e.target.dataset.page);
            });
        });

        const addListener = (id, event, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener(event, handler);
        };

        addListener('transaction-form', 'submit', (e) => { e.preventDefault(); this.addTransaction(); });
        addListener('shopping-form', 'submit', (e) => { e.preventDefault(); this.addShoppingItem(); });
        addListener('card-form', 'submit', (e) => { e.preventDefault(); this.addCreditCard(); });
        addListener('budget-form', 'submit', (e) => { e.preventDefault(); this.addBudget(); });
        addListener('installment-form', 'submit', (e) => { e.preventDefault(); this.addInstallment(); });
        addListener('installment-total', 'input', () => { this.lastInstallmentEditedField = 'total'; this.syncInstallmentTotals(); });
        addListener('installment-count', 'input', () => { this.syncInstallmentTotals(); this.renderInstallmentAmountFields(); });
        addListener('installment-amount', 'input', () => { this.lastInstallmentEditedField = 'amount'; this.syncInstallmentTotals(); this.renderInstallmentAmountFields(); });
        addListener('installment-start', 'change', () => { this.renderInstallmentAmountFields(); });
        addListener('installment-custom-enabled', 'change', () => { this.toggleCustomInstallmentAmounts(); });
        addListener('installment-custom-toggle-btn', 'click', () => {
            const customEnabled = document.getElementById('installment-custom-enabled');
            if (!customEnabled) return;
            customEnabled.checked = !customEnabled.checked;
            this.toggleCustomInstallmentAmounts();
        });
        addListener('subscription-form', 'submit', (e) => { e.preventDefault(); this.addSubscription(); });
        addListener('income-form', 'submit', (e) => { e.preventDefault(); this.addIncome(); });

        addListener('filter-type', 'change', () => { this.filterTransactions(); });
        addListener('filter-category', 'change', () => { this.filterTransactions(); });
        addListener('filter-search', 'input', () => { this.filterTransactions(); });
        addListener('filter-period', 'change', () => { this.onTransactionPeriodFilterChange(); });
        addListener('filter-month', 'change', () => { this.filterTransactions(); });
        addListener('filter-year', 'change', () => { this.filterTransactions(); });
        addListener('filter-date-start', 'change', () => { this.filterTransactions(); });
        addListener('filter-date-end', 'change', () => { this.filterTransactions(); });
        addListener('dashboard-month', 'change', () => { this.onDashboardPeriodChange(); });
        addListener('dashboard-year', 'change', () => { this.onDashboardPeriodChange(); });
        addListener('shopping-filter', 'change', () => {
            this.shoppingFilter = document.getElementById('shopping-filter').value;
            this.loadShoppingList();
        });
    }

    navigateTo(page) {
        // Atualizar navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // Mostrar página
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });
        document.getElementById(page).style.display = 'block';

        this.currentPage = page;
        this.updatePageContent(page);
        this.refreshIcons();
    }

    updatePageContent(page) {
        switch(page) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'transactions':
                this.loadTransactions();
                break;
            case 'installments':
                this.loadInstallments();
                break;
            case 'subscriptions':
                this.loadSubscriptions();
                break;
            case 'shopping-list':
                this.loadShoppingList();
                break;
            case 'credit-cards':
                this.loadCreditCards();
                break;
            case 'budgets':
                this.loadBudgets();
                break;
            case 'reports':
                this.updateReports();
                break;
            case 'incomes':
                this.loadIncomes();
                break;
        }
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/initial-data');
            const data = await response.json();
            this.transactions = data.transactions || [];
            this.shoppingList = data.shoppingList || [];
            this.creditCards = data.creditCards || [];
            this.budgets = data.budgets || [];
            this.installments = data.installments || [];
            this.subscriptions = data.goals ? data.goals.filter(g => g.category !== 'Dívida') : [];
            this.goals = data.goals ? data.goals.filter(g => g.category === 'Dívida') : [];
            this.incomes = data.incomes || [];
        } catch (error) {
            console.error('Erro ao carregar dados iniciais:', error);
            this.useMockData();
        }
    }

    useMockData() {
        this.transactions = [
            {
                id: 1,
                type: 'income',
                amount: 3000,
                category: 'salario',
                description: 'Salário Mensal',
                date: '2024-01-01'
            },
            {
                id: 2,
                type: 'expense',
                amount: 150,
                category: 'alimentacao',
                description: 'Mercado',
                date: '2024-01-02'
            },
            {
                id: 3,
                type: 'expense',
                amount: 50,
                category: 'transporte',
                description: 'Gasolina',
                date: '2024-01-03'
            }
        ];

        this.shoppingList = [
            {
                id: 1,
                item: 'Arroz',
                category: 'alimentacao',
                estimatedPrice: 20,
                purchased: false
            },
            {
                id: 2,
                item: 'Sabão em Pó',
                category: 'limpeza',
                estimatedPrice: 15,
                purchased: false
            }
        ];

        this.creditCards = [
            {
                id: 1,
                name: 'Visa Gold',
                bank: 'Itaú',
                limit: 2000,
                closingDate: '2024-01-15',
                dueDate: '2024-02-15'
            }
        ];

        this.budgets = [
            {
                id: 1,
                category: 'alimentacao',
                amount: 500,
                period: 'monthly',
                spent: 320
            },
            {
                id: 2,
                category: 'transporte',
                amount: 200,
                period: 'monthly',
                spent: 120
            }
        ];
    }

    updateDashboard() {
        const monthlyIncome = this.calculateMonthlyTotal('income', this.selectedMonth, this.selectedYear);
        const monthlyExpenses = this.calculateMonthlyTotal('expense', this.selectedMonth, this.selectedYear);
        const totalIncomes = this.incomes
            .filter(inc => {
                const d = new Date((inc.date || '').split('T')[0]);
                return d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear;
            })
            .reduce((sum, inc) => sum + inc.amount, 0);
        const totalIncome = monthlyIncome + totalIncomes;
        const periodNet = totalIncome - monthlyExpenses;

        document.getElementById('total-balance').textContent = `R$ ${periodNet.toFixed(2)}`;
        document.getElementById('monthly-income').textContent = `R$ ${totalIncome.toFixed(2)}`;
        document.getElementById('monthly-expenses').textContent = `R$ ${monthlyExpenses.toFixed(2)}`;

        this.updateDashboardCommitments();
        this.updateCharts();
        this.refreshIcons();
    }

    updateDashboardCommitments() {
        const money = value => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const listStyle = 'display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid #eee;font-size:13px;';

        const installments = this.installments || [];
        const installmentTotals = installments.reduce((totals, inst) => {
            const total = Number(inst.totalInstallments || inst.total_installments || 0);
            const paid = Math.max(0, Math.min(Number(inst.currentInstallment ?? inst.current_installment ?? 0), total));
            totals.paid += this.sumInstallmentAmounts(inst, 0, paid);
            totals.pending += this.sumInstallmentAmounts(inst, paid, total);
            return totals;
        }, { paid: 0, pending: 0 });
        const installmentItems = installments.map(inst => {
            const total = Number(inst.totalInstallments || inst.total_installments || 0);
            const paid = Math.max(0, Math.min(Number(inst.currentInstallment ?? inst.current_installment ?? 0), total));
            const nextAmount = this.getInstallmentAmountAt(inst, paid);
            return `<div style="${listStyle}"><span><strong>${esc(inst.description)}</strong><br><small>${paid} de ${total} pagas</small></span><span style="text-align:right;">${money(nextAmount)}<br><small>próxima parcela</small></span></div>`;
        }).join('') || '<p style="color:#666;font-size:13px;">Nenhum parcelamento cadastrado.</p>';
        const installmentsCard = document.getElementById('dashboard-installments-card');
        if (installmentsCard) installmentsCard.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><h3 style="margin:0;">Parcelamentos</h3><button class="btn-small" onclick="app.navigateTo('installments')">Ver todos</button></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">
                <div><small style="color:#666;">Pago</small><strong style="display:block;color:#2e9d62;">${money(installmentTotals.paid)}</strong></div>
                <div><small style="color:#666;">Ainda falta</small><strong style="display:block;color:#e67e22;">${money(installmentTotals.pending)}</strong></div>
            </div>${installmentItems}`;

        const subscriptions = this.subscriptions || [];
        const isPaid = sub => (this.transactions || []).some(t => {
            const d = new Date((t.date || '').split('T')[0] + 'T00:00:00');
            return t.description === sub.name + ' (Assinatura)' && d.getMonth() === this.selectedMonth && d.getFullYear() === this.selectedYear;
        });
        const subscriptionTotals = subscriptions.reduce((totals, sub) => {
            const amount = Number(sub.targetAmount || sub.target_amount || 0);
            if (isPaid(sub)) totals.paid += amount; else totals.pending += amount;
            return totals;
        }, { paid: 0, pending: 0 });
        const subscriptionItems = subscriptions.map(sub => {
            const paid = isPaid(sub);
            const amount = Number(sub.targetAmount || sub.target_amount || 0);
            return `<div style="${listStyle}"><span><strong>${esc(sub.name)}</strong><br><small style="color:${paid ? '#2e9d62' : '#e67e22'};">${paid ? 'Pago' : 'Pendente'} no mês</small></span><strong>${money(amount)}</strong></div>`;
        }).join('') || '<p style="color:#666;font-size:13px;">Nenhuma assinatura cadastrada.</p>';
        const subscriptionsCard = document.getElementById('dashboard-subscriptions-card');
        if (subscriptionsCard) subscriptionsCard.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><h3 style="margin:0;">Assinaturas</h3><button class="btn-small" onclick="app.navigateTo('subscriptions')">Ver todas</button></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">
                <div><small style="color:#666;">Pago no mês</small><strong style="display:block;color:#2e9d62;">${money(subscriptionTotals.paid)}</strong></div>
                <div><small style="color:#666;">Pendente no mês</small><strong style="display:block;color:#e67e22;">${money(subscriptionTotals.pending)}</strong></div>
            </div>${subscriptionItems}`;

        const shopping = this.shoppingList || [];
        const openItems = shopping.filter(item => !item.purchased);
        const purchasedItems = shopping.filter(item => item.purchased);
        const openTotal = openItems.reduce((sum, item) => sum + Number(item.estimatedPrice || item.estimated_price || 0), 0);
        const shoppingItems = openItems.map(item => {
            const purchased = Boolean(item.purchased);
            return `<div style="${listStyle}${purchased ? 'opacity:.65;' : ''}"><span><strong style="${purchased ? 'text-decoration:line-through;' : ''}">${esc(item.item)}</strong><br><small>${esc(this.getCategoryName(item.category))} · ${purchased ? 'Comprado' : 'Pendente'}</small></span><strong>${money(item.estimatedPrice || item.estimated_price)}</strong></div>`;
        }).join('') || '<p style="color:#666;font-size:13px;">Nenhum item pendente.</p>';
        const shoppingCard = document.getElementById('dashboard-shopping-card');
        if (shoppingCard) shoppingCard.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;"><h3 style="margin:0;">Lista de compras</h3><button class="btn-small" onclick="app.navigateTo('shopping-list')">Abrir lista</button></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0;">
                <div><small style="color:#666;">Comprados</small><strong style="display:block;color:#2e9d62;">${purchasedItems.length}</strong></div>
                <div><small style="color:#666;">Pendentes</small><strong style="display:block;color:#e67e22;">${openItems.length} · ${money(openTotal)}</strong></div>
            </div>${shoppingItems}`;
    }

    refreshIcons() {
        if (typeof lucide !== 'undefined' && lucide.createIcons) {
            try { lucide.createIcons(); } catch (e) {}
        }
    }

    calculatePeriodBalance(month, year) {
        const endOfMonth = new Date(year, month + 1, 0);
        const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(endOfMonth.getDate()).padStart(2, '0')}`;
        return this.transactions
            .filter(t => {
                const d = (t.date || '').split('T')[0];
                return d <= endDateStr;
            })
            .reduce((total, transaction) => {
                return total + (transaction.type === 'income' ? transaction.amount : -transaction.amount);
            }, 0);
    }

    calculateMonthlyTotal(type, month, year) {
        const targetMonth = month !== undefined ? month : this.selectedMonth;
        const targetYear = year !== undefined ? year : this.selectedYear;
        
        return this.transactions
            .filter(transaction => {
                const dateStr = transaction.date;
                const parts = dateStr.split('T')[0].split('-');
                const transactionYear = parseInt(parts[0]);
                const transactionMonth = parseInt(parts[1]) - 1;
                return transaction.type === type &&
                       transactionMonth === targetMonth &&
                       transactionYear === targetYear;
            })
            .reduce((total, transaction) => total + transaction.amount, 0);
    }

    initCharts() {
        try {
        // Gráfico de categorias
        const categoryCtx = document.getElementById('category-chart').getContext('2d');
        this.charts.category = new Chart(categoryCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Gastos por Categoria'
                    }
                }
            }
        });

        // Gráfico de fluxo de caixa
        const cashFlowCtx = document.getElementById('cash-flow-chart').getContext('2d');
        this.charts.cashFlow = new Chart(cashFlowCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Saldo',
                    data: [],
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Fluxo de Caixa'
                    }
                }
            }
        });
        } catch (e) {
            console.warn('Chart.js não disponível, gráficos desabilitados:', e);
        }
    }

    updateCharts() {
        if (!this.charts.category || !this.charts.cashFlow) return;
        try {
            const { selectedMonth, selectedYear } = this;

            // Gráfico de categorias — filtrar pelo mês selecionado
            const categoryTotals = {};
            this.transactions
                .filter(t => {
                    if (t.type !== 'expense') return false;
                    const parts = (t.date || '').split('T')[0].split('-');
                    const tYear = parseInt(parts[0]);
                    const tMonth = parseInt(parts[1]) - 1;
                    return tMonth === selectedMonth && tYear === selectedYear;
                })
                .forEach(transaction => {
                    categoryTotals[transaction.category] =
                        (categoryTotals[transaction.category] || 0) + transaction.amount;
                });

            this.charts.category.data.labels = Object.keys(categoryTotals);
            this.charts.category.data.datasets[0].data = Object.values(categoryTotals);
            this.charts.category.update();

            // Fluxo de caixa — dias do mês selecionado
            const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
            const labels = [];
            const dailyBalances = [];
            let cumulativeBalance = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                labels.push(String(day));
                const dayTransactions = this.transactions.filter(t => {
                    const tDate = (t.date || '').split('T')[0];
                    return tDate === dateStr;
                });
                const dayBalance = dayTransactions.reduce((total, t) => {
                    return total + (t.type === 'income' ? t.amount : -t.amount);
                }, 0);
                cumulativeBalance += dayBalance;
                dailyBalances.push(cumulativeBalance);
            }

            this.charts.cashFlow.data.labels = labels;
            this.charts.cashFlow.data.datasets[0].data = dailyBalances;
            this.charts.cashFlow.update();
        } catch (e) {
            console.warn('Erro ao atualizar gráficos:', e);
        }
    }

    async addTransaction() {
        const type = document.getElementById('transaction-type').value;
        const amount = parseFloat(document.getElementById('transaction-amount').value);
        const category = document.getElementById('transaction-category').value;
        const description = document.getElementById('transaction-description').value;
        const date = document.getElementById('transaction-date').value;
        const payment_method = document.getElementById('transaction-method').value;
        const credit_card_id = payment_method === 'credito' ? document.getElementById('transaction-card').value || null : null;
        const editId = document.getElementById('transaction-modal').dataset.editId;
        const isRecurring = document.getElementById('transaction-recurring').checked;

        const transaction = { type, amount, category, description, date, payment_method, credit_card_id };
        if (isRecurring) {
            transaction.recurrence = document.getElementById('transaction-recurrence-period').value;
            transaction.recurrence_end_date = document.getElementById('transaction-recurrence-end').value || null;
        } else {
            transaction.recurrence = null;
            transaction.recurrence_end_date = null;
        }

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/transactions/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                });
                if (response.ok) {
                    const idx = app.transactions.findIndex(t => t.id == editId);
                    if (idx !== -1) app.transactions[idx] = { ...transaction, id: parseInt(editId) };
                    delete document.getElementById('transaction-modal').dataset.editId;
                    document.getElementById('transaction-modal').querySelector('h2').textContent = 'Nova Transação';
                }
            } else {
                response = await fetch('/api/transactions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(transaction)
                });
                if (response.ok) {
                    const data = await response.json();
                    this.transactions.push({ ...transaction, id: data.data.id });
                }
            }
            this.closeTransactionModal();
            this.updateDashboard();
            this.loadTransactions();
            this.refreshIcons();
        } catch (error) {
            console.error('Erro ao salvar transação:', error);
        }
    }

    loadTransactions() {
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '';

        const filteredTransactions = this.getFilteredTransactions();
        this.updateTransactionFilterSummary(filteredTransactions);

        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<div class="empty-state">Nenhuma transação encontrada para os filtros selecionados.</div>';
            return;
        }

        filteredTransactions.forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            
            const amountClass = transaction.type === 'income' ? 'income' : 'expense';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';
            
            const methodNames = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' };
            const method = methodNames[transaction.payment_method] || transaction.payment_method || '';
            const recurringLabel = transaction.recurrence ? `<span class="recurring-badge" title="Recorrente ${esc(transaction.recurrence)}"><i data-lucide="refresh-cw" class="lucide-icon"></i></span> ` : '';
            item.innerHTML = `
                <div class="transaction-info">
                    <div>${recurringLabel}${esc(transaction.description)}</div>
                    <div class="transaction-category">${esc(this.getCategoryName(transaction.category))}</div>
                    <div style="font-size: 11px; color: #999;">${esc(transaction.date?.split('T')[0] || '')} ${method ? '• ' + esc(method) : ''}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix} R$ ${transaction.amount.toFixed(2)}
                    </div>
                    <button class="btn-small" onclick="editTransaction(${transaction.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                    <button class="btn-small btn-danger" onclick="deleteTransaction(${transaction.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                </div>
            `;
            
            transactionsList.appendChild(item);
        });
        this.refreshIcons();
    }

    filterTransactions() {
        this.loadTransactions();
    }

    onTransactionPeriodFilterChange() {
        const period = document.getElementById('filter-period')?.value || 'all';
        document.querySelectorAll('.filter-month-controls').forEach(el => {
            el.style.display = period === 'month' ? 'block' : 'none';
        });
        document.querySelectorAll('.filter-custom-controls').forEach(el => {
            el.style.display = period === 'custom' ? 'block' : 'none';
        });
        this.filterTransactions();
    }

    clearTransactionFilters() {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        };
        setValue('filter-search', '');
        setValue('filter-type', 'all');
        setValue('filter-category', 'all');
        setValue('filter-period', 'all');
        setValue('filter-month', new Date().getMonth() + 1);
        setValue('filter-year', new Date().getFullYear());
        setValue('filter-date-start', '');
        setValue('filter-date-end', '');
        this.onTransactionPeriodFilterChange();
    }

    normalizeFilterValue(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/ç/g, 'c')
            .trim();
    }

    getFilteredTransactions() {
        const type = document.getElementById('filter-type').value;
        const category = document.getElementById('filter-category').value;
        const search = this.normalizeFilterValue(document.getElementById('filter-search')?.value || '');
        const period = document.getElementById('filter-period')?.value || 'all';
        const filterMonth = parseInt(document.getElementById('filter-month')?.value || '0', 10);
        const filterYear = parseInt(document.getElementById('filter-year')?.value || '0', 10);
        const startDate = document.getElementById('filter-date-start').value;
        const endDate = document.getElementById('filter-date-end').value;

        return this.transactions.filter(transaction => {
            const transactionDate = (transaction.date || '').split('T')[0];
            const [txYear, txMonth] = transactionDate.split('-').map(Number);
            const transactionCategory = this.normalizeFilterValue(transaction.category);
            const selectedCategory = this.normalizeFilterValue(category);
            const method = transaction.payment_method || '';
            const searchable = this.normalizeFilterValue([
                transaction.description,
                this.getCategoryName(transaction.category),
                transaction.category,
                method,
                transaction.amount,
                transactionDate
            ].join(' '));

            if (type !== 'all' && transaction.type !== type) return false;
            if (category !== 'all' && transactionCategory !== selectedCategory) return false;
            if (search && !searchable.includes(search)) return false;
            if (period === 'month' && (txMonth !== filterMonth || txYear !== filterYear)) return false;
            if (period === 'custom' && startDate && transactionDate < startDate) return false;
            if (period === 'custom' && endDate && transactionDate > endDate) return false;
            return true;
        });
    }

    updateTransactionFilterSummary(transactions) {
        const summary = document.getElementById('transactions-filter-summary');
        if (!summary) return;
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        summary.textContent = `${transactions.length} transações | Receitas: R$ ${income.toFixed(2)} | Gastos: R$ ${expenses.toFixed(2)} | Saldo: R$ ${(income - expenses).toFixed(2)}`;
    }

    getCategoryName(category) {
        const names = {
            alimentacao: 'Alimentação',
            'alimentação': 'Alimentação',
            transporte: 'Transporte',
            moradia: 'Moradia',
            saude: 'Saúde',
            'saúde': 'Saúde',
            lazer: 'Lazer',
            educacao: 'Educação',
            'educação': 'Educação',
            salario: 'Salário',
            'salário': 'Salário',
            investimentos: 'Investimentos',
            servicos: 'Serviços',
            'serviços': 'Serviços',
            compras: 'Compras',
            assinatura: 'Assinatura',
            assinaturas: 'Assinaturas',
            eletronicos: 'Eletrônicos',
            'eletrônicos': 'Eletrônicos',
            outros: 'Outros'
        };
        return names[String(category || '').toLowerCase()] || category;
    }

    async addShoppingItem() {
        const item = document.getElementById('shopping-item').value;
        const category = document.getElementById('shopping-category').value;
        const estimatedPrice = parseFloat(document.getElementById('shopping-estimated-price').value) || 0;
        const editId = document.getElementById('shopping-modal').dataset.editId;

        const shoppingItem = { item, category, estimatedPrice, purchased: false };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/shopping-list/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shoppingItem)
                });
                if (response.ok) {
                    const idx = app.shoppingList.findIndex(i => i.id == editId);
                    if (idx !== -1) app.shoppingList[idx] = { ...shoppingItem, id: parseInt(editId) };
                    delete document.getElementById('shopping-modal').dataset.editId;
                    document.getElementById('shopping-modal').querySelector('h2').textContent = 'Novo Item na Lista';
                }
            } else {
                response = await fetch('/api/shopping-list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(shoppingItem)
                });
                if (response.ok) {
                    const data = await response.json();
                    this.shoppingList.push({ ...shoppingItem, id: data.data.id });
                }
            }
            this.closeShoppingItemModal();
            this.loadShoppingList();
            this.refreshIcons();
        } catch (error) {
            console.error('Erro ao salvar item:', error);
        }
    }

    loadShoppingList() {
        const shoppingListItems = document.getElementById('shopping-list-items');
        shoppingListItems.innerHTML = '';

        const filter = this.shoppingFilter || 'all';
        let filtered = [...this.shoppingList];
        if (filter === 'active') filtered = filtered.filter(i => !i.purchased);
        else if (filter === 'purchased') filtered = filtered.filter(i => i.purchased);

        filtered.sort((a, b) => {
            if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
            return 0;
        });

        filtered.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.className = 'transaction-item';
            const isPurchased = item.purchased;
            
            itemElement.innerHTML = `
                <div class="transaction-info" style="display: flex; align-items: center; gap: 10px;">
                    <div style="${isPurchased ? 'text-decoration: line-through; opacity: 0.5;' : ''} flex: 1;">
                        <div>${esc(item.item)}</div>
                        <div class="transaction-category">${esc(this.getCategoryName(item.category))}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="transaction-amount">
                        R$ ${item.estimatedPrice.toFixed(2)}
                    </div>
                    <button class="btn-small${isPurchased ? ' checked' : ''}" onclick="app.toggleShoppingItem(${item.id})" title="${esc(isPurchased ? 'Desmarcar' : 'Marcar como comprado')}">
                        <i data-lucide="${isPurchased ? 'check-circle' : 'circle'}" class="lucide-icon"></i>
                    </button>
                    <button class="btn-small" onclick="editShoppingItem(${item.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                    <button class="btn-small btn-danger" onclick="deleteShoppingItem(${item.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                </div>
            `;
            
            shoppingListItems.appendChild(itemElement);
        });
        this.refreshIcons();
    }

    async toggleShoppingItem(itemId) {
        const item = this.shoppingList.find(i => i.id == itemId);
        if (!item) return;
        try {
            const response = await fetch(`/api/shopping-list/${itemId}/toggle`, { method: 'PATCH' });
            const data = await response.json();
            if (data.success) {
                item.purchased = !item.purchased;
                this.loadShoppingList();
            }
        } catch (error) {
            console.error('Erro ao alternar item:', error);
        }
    }

    async addCreditCard() {
        const name = document.getElementById('card-name').value.trim();
        const bank = document.getElementById('card-bank').value.trim();
        const creditLimit = parseFloat(document.getElementById('card-limit').value);
        const closingDate = document.getElementById('card-closing-date').value;
        const dueDate = document.getElementById('card-due-date').value;
        const modal = document.getElementById('card-modal');
        const form = document.getElementById('card-form');
        const submitButton = form.querySelector('button[type="submit"]');
        const editId = modal.dataset.editId;

        const card = { name, bank, creditLimit, closingDate, dueDate };

        submitButton.disabled = true;
        try {
            let response;
            if (editId) {
                response = await fetch(`/api/credit-cards/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card)
                });
            } else {
                response = await fetch('/api/credit-cards', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(card)
                });
            }

            const data = await response.json();
            if (!response.ok) {
                const details = Array.isArray(data.errors) ? `\n${data.errors.join('\n')}` : '';
                throw new Error(`${data.error || 'Não foi possível salvar o cartão.'}${details}`);
            }

            if (editId) {
                const idx = this.creditCards.findIndex(c => c.id == editId);
                if (idx !== -1) this.creditCards[idx] = { ...this.creditCards[idx], ...card };
            } else {
                this.creditCards.push({ ...card, id: data.data.id });
            }

            this.closeCardModal();
            this.loadCreditCards();
        } catch (error) {
            console.error('Erro ao salvar cartão:', error);
            alert(error.message || 'Erro ao salvar cartão.');
        } finally {
            submitButton.disabled = false;
        }
    }

    loadCreditCards() {
        const cardsGrid = document.querySelector('.cards-grid');
        cardsGrid.innerHTML = '';

        this.creditCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.style.cursor = 'pointer';
            cardElement.onclick = () => this.openCardDetailModal(card.id);
            
            const limit = card.creditLimit || card.credit_limit || 0;
            const availableLimit = limit - this.calculateCardSpent(card.id);
            
            cardElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${esc(card.name)}</h3>
                        <p><strong>Banco:</strong> ${esc(card.bank)}</p>
                        <p><strong>Limite:</strong> R$ ${limit.toFixed(2)}</p>
                        <p><strong>Disponível:</strong> R$ ${availableLimit.toFixed(2)}</p>
                        <p><strong>Fechamento:</strong> ${esc(card.closingDate || card.closing_date || '')}</p>
                        <p><strong>Vencimento:</strong> ${esc(card.dueDate || card.due_date || '')}</p>
                    </div>
                    <div>
                        <button class="btn-small" onclick="event.stopPropagation(); importCardInvoice(${card.id})" title="Enviar fatura"><i data-lucide="upload" class="lucide-icon"></i></button>
                        <button class="btn-small" onclick="event.stopPropagation(); editCreditCard(${card.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteCreditCard(${card.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="background: #e0e0e0; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: #4CAF50; height: 100%; width: ${limit > 0 ? (availableLimit / limit) * 100 : 0}%;"></div>
                    </div>
                </div>
            `;
            
            cardsGrid.appendChild(cardElement);
        });
        this.refreshIcons();
    }

    calculateCardSpent(cardId) {
        return (this.transactions || [])
            .filter(t => t.type === 'expense' && t.payment_method === 'credito' && t.credit_card_id == cardId)
            .reduce((sum, t) => sum + t.amount, 0);
    }

    openCardDetailModal(cardId) {
        this.cardDetailId = cardId;
        const card = this.creditCards.find(c => c.id == cardId);
        if (!card) return;

        const modal = document.getElementById('card-detail-modal');
        const limit = card.creditLimit || card.credit_limit || 0;
        const available = limit - this.calculateCardSpent(cardId);

        document.getElementById('card-detail-name').textContent = card.name;
        document.getElementById('card-detail-bank').textContent = card.bank;
        document.getElementById('card-detail-limit').textContent = limit.toFixed(2);
        document.getElementById('card-detail-available').textContent = available.toFixed(2);
        document.getElementById('card-detail-closing').textContent = card.closingDate || card.closing_date || '';
        document.getElementById('card-detail-due').textContent = card.dueDate || card.due_date || '';

        const bar = document.getElementById('card-detail-bar');
        bar.style.width = limit > 0 ? ((available / limit) * 100) + '%' : '0%';

        this.populateCardDetailMonthYear();
        this.refreshCardDetail();
        modal.style.display = 'block';
        this.refreshIcons();
    }

    populateCardDetailMonthYear() {
        const monthSelect = document.getElementById('card-detail-month');
        const yearSelect = document.getElementById('card-detail-year');
        monthSelect.innerHTML = '';
        yearSelect.innerHTML = '';

        const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const now = new Date();
        for (let m = 0; m < 12; m++) {
            const opt = document.createElement('option');
            opt.value = m;
            opt.textContent = months[m];
            if (m === now.getMonth()) opt.selected = true;
            monthSelect.appendChild(opt);
        }
        for (let y = now.getFullYear() - 2; y <= now.getFullYear() + 1; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (y === now.getFullYear()) opt.selected = true;
            yearSelect.appendChild(opt);
        }
    }

    refreshCardDetail() {
        const cardId = this.cardDetailId;
        if (!cardId) return;

        const month = parseInt(document.getElementById('card-detail-month').value);
        const year = parseInt(document.getElementById('card-detail-year').value);
        const container = document.getElementById('card-detail-transactions');
        container.innerHTML = '';

        const cardTransactions = (this.transactions || [])
            .filter(t => {
                if (t.type !== 'expense' || t.payment_method !== 'credito' || t.credit_card_id != cardId) return false;
                const parts = (t.date || '').split('T')[0].split('-');
                const tYear = parseInt(parts[0]);
                const tMonth = parseInt(parts[1]) - 1;
                return tMonth === month && tYear === year;
            })
            .sort((a, b) => ((b.date || '') > (a.date || '') ? 1 : -1));

        if (cardTransactions.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">Nenhuma compra neste mês</p>';
            return;
        }

        const total = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
        const summary = document.createElement('div');
        summary.style.cssText = 'display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 2px solid #eee; margin-bottom: 10px; font-weight: bold;';
        summary.innerHTML = `
            <span>${cardTransactions.length} compra(s)</span>
            <span style="color: #e74c3c;">Total: R$ ${total.toFixed(2)}</span>
        `;
        container.appendChild(summary);

        cardTransactions.forEach(t => {
            const el = document.createElement('div');
            el.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;';
            el.innerHTML = `
                <div>
                    <div style="font-weight: 500;">${esc(t.description)}</div>
                    <div style="font-size: 12px; color: #999;">${esc(t.date?.split('T')[0] || '')} • ${esc(this.getCategoryName(t.category))}</div>
                </div>
                <div style="color: #e74c3c; font-weight: 600;">- R$ ${t.amount.toFixed(2)}</div>
            `;
            container.appendChild(el);
        });
    }

    async addBudget() {
        const category = document.getElementById('budget-category').value;
        const amount = parseFloat(document.getElementById('budget-amount').value);
        const period = document.getElementById('budget-period').value;
        const editId = document.getElementById('budget-modal').dataset.editId;

        const budget = { category, amount, period, spent: 0 };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/budgets/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(budget)
                });
                if (response.ok) {
                    const idx = app.budgets.findIndex(b => b.id == editId);
                    if (idx !== -1) app.budgets[idx] = { ...budget, id: parseInt(editId) };
                    delete document.getElementById('budget-modal').dataset.editId;
                    document.getElementById('budget-modal').querySelector('h2').textContent = 'Novo Orçamento';
                }
            } else {
                response = await fetch('/api/budgets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(budget)
                });
                if (response.ok) {
                    const data = await response.json();
                    this.budgets.push({ ...budget, id: data.data.id });
                }
            }
            this.closeBudgetModal();
            this.loadBudgets();
        } catch (error) {
            console.error('Erro ao salvar orçamento:', error);
        }
    }

    loadBudgets() {
        const budgetsGrid = document.querySelector('.budgets-grid');
        budgetsGrid.innerHTML = '';

        this.budgets.forEach(budget => {
            const budgetElement = document.createElement('div');
            budgetElement.className = 'card';
            
            const remaining = budget.amount - budget.spent;
            const percentage = (budget.spent / budget.amount) * 100;
            const percentageClass = percentage > 90 ? 'expense' : percentage > 70 ? 'warning' : 'income';
            
            budgetElement.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${esc(this.getCategoryName(budget.category))}</h3>
                        <p><strong>Orçamento:</strong> R$ ${budget.amount.toFixed(2)}</p>
                        <p><strong>Gasto:</strong> R$ ${budget.spent.toFixed(2)}</p>
                        <p><strong>Restante:</strong> <span class="${percentageClass}">R$ ${remaining.toFixed(2)}</span></p>
                        <p><strong>Utilizado:</strong> ${percentage.toFixed(1)}%</p>
                    </div>
                    <div>
                        <button class="btn-small" onclick="editBudget(${budget.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                        <button class="btn-small btn-danger" onclick="deleteBudget(${budget.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="background: #e0e0e0; height: 10px; border-radius: 5px; overflow: hidden;">
                        <div style="background: ${percentageClass === 'expense' ? '#e74c3c' : percentageClass === 'warning' ? '#f39c12' : '#2ecc71'}; height: 100%; width: ${Math.min(percentage, 100)}%;"></div>
                    </div>
                </div>
            `;
            
            budgetsGrid.appendChild(budgetElement);
        });
        this.refreshIcons();
    }

    parseInstallmentAmounts(inst) {
        const raw = inst?.installmentAmounts ?? inst?.installment_amounts;
        if (Array.isArray(raw)) return raw.map(Number).filter(amount => Number.isFinite(amount) && amount >= 0);
        if (typeof raw === 'string' && raw.trim()) {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(Number).filter(amount => Number.isFinite(amount) && amount >= 0);
            } catch (error) {
                return [];
            }
        }
        return [];
    }

    getInstallmentAmountAt(inst, index) {
        const amounts = this.parseInstallmentAmounts(inst);
        const amount = amounts[index];
        if (Number.isFinite(amount)) return amount;
        return Number(inst?.installmentAmount ?? inst?.installment_amount ?? 0);
    }

    sumInstallmentAmounts(inst, start, end) {
        let total = 0;
        for (let i = start; i < end; i++) {
            total += this.getInstallmentAmountAt(inst, i);
        }
        return total;
    }

    syncInstallmentTotals() {
        const totalInput = document.getElementById('installment-total');
        const countInput = document.getElementById('installment-count');
        const amountInput = document.getElementById('installment-amount');
        const customEnabled = document.getElementById('installment-custom-enabled');
        if (!totalInput || !countInput || !amountInput || customEnabled?.checked) return;

        const total = Number(totalInput.value);
        const count = Number(countInput.value);
        const amount = Number(amountInput.value);

        if (this.lastInstallmentEditedField === 'amount' && Number.isFinite(amount) && Number.isFinite(count) && count > 0) {
            totalInput.value = (Math.round((amount * count) * 100) / 100).toFixed(2);
            return;
        }

        if (Number.isFinite(total) && Number.isFinite(count) && count > 0) {
            amountInput.value = (Math.round((total / count) * 100) / 100).toFixed(2);
        }
    }

    syncDefaultInstallmentAmount() {
        this.syncInstallmentTotals();
    }

    toggleCustomInstallmentAmounts() {
        const customEnabled = document.getElementById('installment-custom-enabled');
        const customAmounts = document.getElementById('installment-custom-amounts');
        const toggleButton = document.getElementById('installment-custom-toggle-btn');
        if (!customEnabled || !customAmounts) return;

        this.updateInstallmentCalculatedFieldState();
        customAmounts.style.display = customEnabled.checked ? 'grid' : 'none';
        if (toggleButton) {
            toggleButton.classList.toggle('active', customEnabled.checked);
            toggleButton.setAttribute('aria-pressed', customEnabled.checked ? 'true' : 'false');
        }
        this.updateInstallmentDerivedFields();
        this.renderInstallmentAmountFields();
    }

    updateInstallmentCalculatedFieldState() {
        const customEnabled = document.getElementById('installment-custom-enabled');
        const amountInput = document.getElementById('installment-amount');
        if (!customEnabled || !amountInput) return;

        amountInput.readOnly = customEnabled.checked;
        amountInput.classList.toggle('calculated-field', customEnabled.checked);
        amountInput.title = customEnabled.checked ? 'Calculado pela média das parcelas diferentes' : '';
    }

    updateInstallmentDerivedFields() {
        const totalInput = document.getElementById('installment-total');
        const amountInput = document.getElementById('installment-amount');
        const countInput = document.getElementById('installment-count');
        const customAmounts = this.getCustomInstallmentAmounts();
        if (!Array.isArray(customAmounts) || !totalInput || !amountInput || !countInput) return;

        const total = customAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
        const count = customAmounts.length || Number(countInput.value) || 0;
        totalInput.value = total > 0 ? total.toFixed(2) : '';
        amountInput.value = count > 0 && total > 0 ? (Math.round((total / count) * 100) / 100).toFixed(2) : '';
    }

    renderInstallmentAmountFields(amounts = null) {
        const customEnabled = document.getElementById('installment-custom-enabled');
        const customAmounts = document.getElementById('installment-custom-amounts');
        if (!customEnabled?.checked || !customAmounts) return;

        const count = Math.max(0, parseInt(document.getElementById('installment-count')?.value || '0', 10));
        const defaultAmount = Number(document.getElementById('installment-amount')?.value || 0);
        const existingInputs = [...customAmounts.querySelectorAll('[data-installment-amount]')].map(input => Number(input.value));
        const source = Array.isArray(amounts) ? amounts : existingInputs;
        const startDateValue = document.getElementById('installment-start')?.value;
        const startDate = startDateValue ? new Date(startDateValue + 'T00:00:00') : new Date();
        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

        customAmounts.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const month = new Date(startDate);
            month.setMonth(month.getMonth() + i);
            const value = Number.isFinite(source[i]) ? source[i] : defaultAmount;
            const row = document.createElement('label');
            row.className = 'installment-custom-row';
            row.innerHTML = `
                <span>${i + 1}ª - ${monthNames[month.getMonth()]}/${month.getFullYear()}</span>
                <input type="number" step="0.01" min="0" data-installment-amount="${i}" value="${Number(value || 0).toFixed(2)}">
            `;
            row.querySelector('input').addEventListener('input', () => this.updateInstallmentDerivedFields());
            customAmounts.appendChild(row);
        }
        this.updateInstallmentDerivedFields();
    }

    getCustomInstallmentAmounts() {
        const customEnabled = document.getElementById('installment-custom-enabled');
        if (!customEnabled?.checked) return null;
        return [...document.querySelectorAll('#installment-custom-amounts [data-installment-amount]')]
            .map(input => Number(input.value || 0));
    }

    getInstallmentMonthLabel(inst, index) {
        const startDate = new Date((inst.startDate || inst.start_date || '').split('T')[0] + 'T00:00:00');
        const month = new Date(startDate);
        month.setMonth(month.getMonth() + index);
        const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return monthNames[month.getMonth()] + '/' + month.getFullYear();
    }

    getFocusedInstallmentIndex(inst, totalInstallments) {
        if (!totalInstallments || totalInstallments <= 0) return 0;

        const paid = Number(inst.currentInstallment ?? inst.current_installment ?? 0);
        return Math.max(0, Math.min(paid > 0 ? paid - 1 : 0, totalInstallments - 1));
    }

    changeInstallmentPreview(id, direction) {
        const inst = this.installments.find(item => item.id == id);
        if (!inst) return;

        const total = Number(inst.totalInstallments || inst.total_installments || 0);
        const fallbackIndex = this.getFocusedInstallmentIndex(inst, total);
        const currentIndex = this.installmentPreviewIndexes[id] ?? fallbackIndex;
        this.installmentPreviewIndexes[id] = Math.max(0, Math.min(currentIndex + direction, total - 1));
        this.loadInstallments();
    }

    loadInstallments() {
        const list = document.getElementById('installments-list');
        list.innerHTML = '';

        if (this.installments.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhum parcelamento cadastrado</p>';
            return;
        }

        this.installments.forEach(inst => {
            const totalAmount = inst.totalAmount || inst.total_amount || 0;
            const installmentAmount = inst.installmentAmount || inst.installment_amount || 0;
            const totalInstallments = inst.totalInstallments || inst.total_installments || 0;
            const currentInstallment = inst.currentInstallment ?? inst.current_installment ?? 0;
            const paidInstallments = Math.max(0, Math.min(currentInstallment, totalInstallments));
            const remaining = Math.max(totalInstallments - paidInstallments, 0);
            const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
            const currentAmount = this.getInstallmentAmountAt(inst, paidInstallments);
            const remainingAmount = this.sumInstallmentAmounts(inst, paidInstallments, totalInstallments);
            const paidAmount = this.sumInstallmentAmounts(inst, 0, paidInstallments);
            const isCompleted = paidInstallments >= totalInstallments;
            const variableAmounts = this.parseInstallmentAmounts(inst);
            const hasVariableAmounts = variableAmounts.length > 0;
            const previewFallback = this.getFocusedInstallmentIndex(inst, totalInstallments);
            const previewIndex = Math.max(0, Math.min(this.installmentPreviewIndexes[inst.id] ?? previewFallback, totalInstallments - 1));
            const previewAmount = this.getInstallmentAmountAt(inst, previewIndex);
            const previewMonthLabel = this.getInstallmentMonthLabel(inst, previewIndex);
            const previewIsPaid = previewIndex < paidInstallments;
            const previewStatusLabel = previewIsPaid ? 'Parcela paga' : (previewIndex === paidInstallments && !isCompleted ? 'Valor a pagar' : 'Parcela futura');
            this.installmentPreviewIndexes[inst.id] = previewIndex;

            // Mês de referência da próxima parcela
            const startDate = new Date((inst.startDate || inst.start_date || '').split('T')[0] + 'T00:00:00');
            const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            const currentMonthLabel = monthNames[startDate.getMonth()] + '/' + startDate.getFullYear();

            const item = document.createElement('div');
            item.className = 'card';
            item.style.marginBottom = '15px';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${esc(inst.description)}</h3>
                        <p><strong>Categoria:</strong> ${esc(inst.category)}</p>
                        <p><strong>Parcelas Pagas:</strong> ${paidInstallments} de ${totalInstallments}</p>
                        <p><strong>Início:</strong> ${currentMonthLabel}</p>
                        <p><strong>Mês em foco:</strong> ${previewMonthLabel}</p>
                        <p><strong>Valor Pago:</strong> R$ ${paidAmount.toFixed(2)}</p>
                        <p><strong>Parcelas Restantes:</strong> ${remaining}</p>
                        <p><strong>Valor Restante:</strong> R$ ${remainingAmount.toFixed(2)}</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; background: ${isCompleted ? '#2ecc71' : '#f39c12'}; color: white;">
                            ${isCompleted ? 'Concluído' : 'Em andamento'}
                        </span>
                        <div style="margin-top: 8px;">
                            <button class="btn-small" onclick="editInstallment(${inst.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                            <button class="btn-small btn-danger" onclick="deleteInstallment(${inst.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                        </div>
                        <div class="installment-focus">
                            <div class="installment-focus-label">${previewStatusLabel}</div>
                            <div class="installment-focus-row">
                                <button type="button" class="installment-preview-btn" onclick="app.changeInstallmentPreview(${inst.id}, -1)" ${previewIndex <= 0 ? 'disabled' : ''} title="Parcela anterior">
                                    <i data-lucide="chevron-left" class="lucide-icon"></i>
                                </button>
                                <div class="installment-focus-value ${previewIsPaid ? 'paid' : ''}">R$ ${previewAmount.toFixed(2)}</div>
                                <button type="button" class="installment-preview-btn" onclick="app.changeInstallmentPreview(${inst.id}, 1)" ${previewIndex >= totalInstallments - 1 ? 'disabled' : ''} title="Proxima parcela">
                                    <i data-lucide="chevron-right" class="lucide-icon"></i>
                                </button>
                            </div>
                            <div class="installment-focus-meta">Parcela ${previewIndex + 1} de ${totalInstallments} - ${previewMonthLabel}</div>
                        </div>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div style="background: #e0e0e0; height: 8px; border-radius: 4px; overflow: hidden;">
                        <div style="background: ${paidInstallments > 0 ? '#2ecc71' : '#3498db'}; height: 100%; width: ${progress}%;"></div>
                    </div>
                    <p style="font-size: 12px; color: #666; margin-top: 4px;">${progress.toFixed(0)}% pago</p>
                </div>
                ${previewIsPaid
                    ? '<span class="installment-paid-label"><i data-lucide="check-circle-2" class="lucide-icon"></i> Parcela paga</span>'
                    : !isCompleted
                        ? `<button class="btn" style="margin-top: 10px; padding: 5px 15px; font-size: 12px;" onclick="markInstallmentPaid(${inst.id})"><i data-lucide="check" class="lucide-icon"></i> Marcar Parcela como Paga</button>`
                        : ''}
            `;
            list.appendChild(item);
        });
        this.refreshIcons();
    }

    loadSubscriptions() {
        const list = document.getElementById('subscriptions-list');
        list.innerHTML = '';

        if (this.subscriptions.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma assinatura cadastrada</p>';
            return;
        }

        const totalMonthly = this.subscriptions.reduce((sum, s) => sum + (s.targetAmount || s.target_amount || 0), 0);

        const summary = document.createElement('div');
        summary.className = 'card';
        summary.style.marginBottom = '20px';
        summary.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        summary.style.color = 'white';
        summary.innerHTML = `
            <h3 style="color: white;">Total Mensal em Assinaturas</h3>
            <p style="font-size: 24px; font-weight: bold;">R$ ${totalMonthly.toFixed(2)}</p>
            <p>${this.subscriptions.length} assinatura(s) ativa(s)</p>
        `;
        list.appendChild(summary);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        this.subscriptions.forEach(sub => {
            const amount = sub.targetAmount || sub.target_amount || 0;
            const item = document.createElement('div');
            item.className = 'card';
            item.style.marginBottom = '10px';

            const alreadyPaid = (this.transactions || []).some(t => {
                const d = new Date(t.date);
                return t.description === sub.name + ' (Assinatura)'
                    && d.getMonth() === currentMonth
                    && d.getFullYear() === currentYear;
            });

            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h3>${esc(sub.name)}</h3>
                        <p><strong>Categoria:</strong> ${esc(sub.category || 'Assinatura')}</p>
                        ${alreadyPaid ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#2ecc71;color:white;margin-top:4px;">Pago este mês</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="text-align: right;">
                            <p style="font-size: 20px; font-weight: bold; color: #e74c3c;">- R$ ${amount.toFixed(2)}</p>
                            <p style="font-size: 12px; color: #666;">/mês</p>
                        </div>
                        ${!alreadyPaid ? `<button class="btn" style="padding:6px 12px;font-size:12px;" onclick="markSubscriptionPaid(${sub.id})" title="Marcar como paga"><i data-lucide="check-circle" class="lucide-icon" style="width:14px;height:14px;"></i> Pagar</button>` : ''}
                        <button class="btn-small" onclick="editSubscription(${sub.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                        <button class="btn-small btn-danger" onclick="deleteSubscription(${sub.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
        this.refreshIcons();
    }

    async addInstallment() {
        const description = document.getElementById('installment-description').value;
        let totalAmount = parseFloat(document.getElementById('installment-total').value);
        let installmentAmount = parseFloat(document.getElementById('installment-amount').value);
        const totalInstallments = parseInt(document.getElementById('installment-count').value);
        const category = document.getElementById('installment-category').value;
        const startDate = document.getElementById('installment-start').value;
        const editId = document.getElementById('installment-modal').dataset.editId;
        const currentInstallment = editId
            ? parseInt(document.getElementById('installment-current').value)
            : 0;
        const installmentAmounts = this.getCustomInstallmentAmounts();
        if (Array.isArray(installmentAmounts) && installmentAmounts.length > 0) {
            totalAmount = installmentAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
            installmentAmount = totalInstallments > 0
                ? Math.round((totalAmount / totalInstallments) * 100) / 100
                : 0;
        } else if (Number.isFinite(installmentAmount) && Number.isFinite(totalInstallments) && totalInstallments > 0 && !Number.isFinite(totalAmount)) {
            totalAmount = Math.round((installmentAmount * totalInstallments) * 100) / 100;
        } else if (Number.isFinite(totalAmount) && Number.isFinite(totalInstallments) && totalInstallments > 0 && !Number.isFinite(installmentAmount)) {
            installmentAmount = Math.round((totalAmount / totalInstallments) * 100) / 100;
        }

        if (!description || !Number.isFinite(totalAmount) || !Number.isFinite(installmentAmount) || !Number.isFinite(totalInstallments) || totalInstallments <= 0) {
            alert('Informe a descrição, a quantidade de parcelas e os valores do parcelamento.');
            return;
        }

        const installment = { description, totalAmount, installmentAmount, installmentAmounts, totalInstallments, currentInstallment, category, startDate };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/installments/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(installment)
                });
                if (response.ok) {
                    const idx = app.installments.findIndex(i => i.id == editId);
                    if (idx !== -1) app.installments[idx] = { ...installment, id: parseInt(editId) };
                    delete document.getElementById('installment-modal').dataset.editId;
                    document.getElementById('installment-modal').querySelector('h2').textContent = 'Novo Parcelamento';
                }
            } else {
                if (!startDate) installment.startDate = new Date().toISOString().split('T')[0];
                response = await fetch('/api/installments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(installment)
                });
                const data = await response.json();
                if (data.success) {
                    this.installments.push({ ...installment, id: data.data.id });
                }
            }
            this.closeInstallmentModal();
            this.loadInstallments();
        } catch (error) {
            console.error('Erro ao salvar parcelamento:', error);
        }
    }

    async addSubscription() {
        const name = document.getElementById('subscription-name').value;
        const amount = parseFloat(document.getElementById('subscription-amount').value);
        const category = document.getElementById('subscription-category').value;
        const editId = document.getElementById('subscription-modal').dataset.editId;

        const subscription = { name, targetAmount: amount, currentAmount: 0, category, targetDate: '2026-12-31' };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/goals/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                });
                if (response.ok) {
                    const idx = app.subscriptions.findIndex(s => s.id == editId);
                    if (idx !== -1) app.subscriptions[idx] = { ...subscription, id: parseInt(editId) };
                    delete document.getElementById('subscription-modal').dataset.editId;
                    document.getElementById('subscription-modal').querySelector('h2').textContent = 'Nova Assinatura';
                }
            } else {
                response = await fetch('/api/goals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subscription)
                });
                const data = await response.json();
                if (data.success) {
                    this.subscriptions.push({ ...subscription, id: data.data.id });
                }
            }
            this.closeSubscriptionModal();
            this.loadSubscriptions();
        } catch (error) {
            console.error('Erro ao salvar assinatura:', error);
        }
    }

    updateReports() {
        // Atualizar relatórios mensais
        const monthlyCtx = document.getElementById('monthly-report-chart').getContext('2d');
        
        // Simplificado - na implementação real, você buscaria dados históricos
        const monthlyData = {
            labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
            datasets: [{
                label: 'Receitas',
                data: [3000, 3000, 3000, 3000, 3000, 3000],
                borderColor: '#2ecc71',
                backgroundColor: 'rgba(46, 204, 113, 0.1)'
            }, {
                label: 'Despesas',
                data: [2500, 2700, 2600, 2800, 2650, 2750],
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)'
            }]
        };

        if (this.charts.monthly) {
            this.charts.monthly.destroy();
        }

        this.charts.monthly = new Chart(monthlyCtx, {
            type: 'line',
            data: monthlyData,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Receitas vs Despesas Mensais'
                    }
                }
            }
        });
    }

    // Modal functions
    openTransactionModal() {
        document.getElementById('transaction-modal').style.display = 'block';
        this.populateCardSelector();
        onPaymentMethodChange();
    }

    closeTransactionModal() {
        document.getElementById('transaction-modal').style.display = 'none';
        document.getElementById('transaction-form').reset();
        document.getElementById('recurrence-fields').style.display = 'none';
        document.getElementById('transaction-card-group').style.display = 'none';
        delete document.getElementById('transaction-modal').dataset.editId;
        document.getElementById('transaction-modal').querySelector('h2').textContent = 'Nova Transação';
    }

    populateCardSelector() {
        const select = document.getElementById('transaction-card');
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um cartão...</option>';
        (this.creditCards || []).forEach(card => {
            const opt = document.createElement('option');
            opt.value = card.id;
            opt.textContent = `${card.name} (${card.bank})`;
            select.appendChild(opt);
        });
        if (currentValue) select.value = currentValue;
    }

    openShoppingItemModal() {
        document.getElementById('shopping-modal').style.display = 'block';
    }

    closeShoppingItemModal() {
        document.getElementById('shopping-modal').style.display = 'none';
        document.getElementById('shopping-form').reset();
        delete document.getElementById('shopping-modal').dataset.editId;
        document.getElementById('shopping-modal').querySelector('h2').textContent = 'Novo Item na Lista';
    }

    openCardModal() {
        document.getElementById('card-modal').style.display = 'block';
    }

    closeCardModal() {
        document.getElementById('card-modal').style.display = 'none';
        document.getElementById('card-form').reset();
        delete document.getElementById('card-modal').dataset.editId;
        document.getElementById('card-modal').querySelector('h2').textContent = 'Novo Cartão';
    }

    openBudgetModal() {
        document.getElementById('budget-modal').style.display = 'block';
    }

    closeBudgetModal() {
        document.getElementById('budget-modal').style.display = 'none';
        document.getElementById('budget-form').reset();
        delete document.getElementById('budget-modal').dataset.editId;
        document.getElementById('budget-modal').querySelector('h2').textContent = 'Novo Orçamento';
    }

    openInstallmentModal() {
        document.getElementById('installment-modal').style.display = 'block';
    }

    closeInstallmentModal() {
        document.getElementById('installment-modal').style.display = 'none';
        document.getElementById('installment-form').reset();
        const customEnabled = document.getElementById('installment-custom-enabled');
        const customAmounts = document.getElementById('installment-custom-amounts');
        const toggleButton = document.getElementById('installment-custom-toggle-btn');
        if (customEnabled) customEnabled.checked = false;
        this.updateInstallmentCalculatedFieldState();
        if (toggleButton) {
            toggleButton.classList.remove('active');
            toggleButton.setAttribute('aria-pressed', 'false');
        }
        if (customAmounts) {
            customAmounts.innerHTML = '';
            customAmounts.style.display = 'none';
        }
        delete document.getElementById('installment-modal').dataset.editId;
        document.getElementById('installment-modal').querySelector('h2').textContent = 'Novo Parcelamento';
    }

    openSubscriptionModal() {
        document.getElementById('subscription-modal').style.display = 'block';
    }

    closeSubscriptionModal() {
        document.getElementById('subscription-modal').style.display = 'none';
        document.getElementById('subscription-form').reset();
        delete document.getElementById('subscription-modal').dataset.editId;
        document.getElementById('subscription-modal').querySelector('h2').textContent = 'Nova Assinatura';
    }

    async loadIncomes() {
        const list = document.getElementById('incomes-list');
        list.innerHTML = '';

        if (this.incomes.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma receita cadastrada</p>';
            return;
        }

        this.incomes.forEach(inc => {
            const dateStr = (inc.date || '').split('T')[0];
            const item = document.createElement('div');
            item.className = 'card';
            item.style.marginBottom = '15px';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${esc(inc.description)}</h3>
                        <p><strong>Categoria:</strong> ${esc(inc.category)}</p>
                        <p><strong>Valor:</strong> R$ ${inc.amount.toFixed(2)}</p>
                        <p><strong>Data:</strong> ${dateStr}</p>
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-top: 8px;">
                            <button class="btn-small" onclick="editIncome(${inc.id})" title="Editar"><i data-lucide="pencil" class="lucide-icon"></i></button>
                            <button class="btn-small btn-danger" onclick="deleteIncome(${inc.id})" title="Excluir"><i data-lucide="trash-2" class="lucide-icon"></i></button>
                        </div>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
        this.refreshIcons();
    }

    async addIncome() {
        const description = document.getElementById('income-description').value;
        const amount = parseFloat(document.getElementById('income-amount').value);
        const category = document.getElementById('income-category').value;
        const date = document.getElementById('income-date').value;
        const editId = document.getElementById('income-modal').dataset.editId;

        const income = { description, amount, category, date };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/incomes/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(income)
                });
                if (response.ok) {
                    const idx = this.incomes.findIndex(i => i.id == editId);
                    if (idx !== -1) this.incomes[idx] = { ...income, id: parseInt(editId) };
                    delete document.getElementById('income-modal').dataset.editId;
                    document.getElementById('income-modal').querySelector('h2').textContent = 'Nova Receita';
                }
            } else {
                response = await fetch('/api/incomes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(income)
                });
                const data = await response.json();
                if (data.success) {
                    this.incomes.push({ ...income, id: data.data.id });
                }
            }
            this.closeIncomeModal();
            this.loadIncomes();
            this.updateDashboard();
        } catch (error) {
            console.error('Erro ao salvar receita:', error);
        }
    }

    openIncomeModal() {
        document.getElementById('income-modal').style.display = 'block';
    }

    closeIncomeModal() {
        document.getElementById('income-modal').style.display = 'none';
        document.getElementById('income-form').reset();
        delete document.getElementById('income-modal').dataset.editId;
        document.getElementById('income-modal').querySelector('h2').textContent = 'Nova Receita';
    }
}

function toggleRecurrenceFields() {
    const checked = document.getElementById('transaction-recurring').checked;
    document.getElementById('recurrence-fields').style.display = checked ? 'block' : 'none';
}

function onPaymentMethodChange() {
    const method = document.getElementById('transaction-method').value;
    const group = document.getElementById('transaction-card-group');
    group.style.display = method === 'credito' ? 'block' : 'none';
}

// Funções globais para os botões
function openTransactionModal() {
    app.openTransactionModal();
}

function closeTransactionModal() {
    app.closeTransactionModal();
}

function editSavingsGoal() {
    const current = parseFloat(localStorage.getItem('savingsGoal')) || 1000;
    const value = prompt('Nova meta de economia (R$):', current);
    if (value !== null) {
        const num = parseFloat(value);
        if (!isNaN(num) && num > 0) {
            localStorage.setItem('savingsGoal', num.toString());
            app.updateDashboard();
        }
    }
}

function openIncomeModal() {
    app.openIncomeModal();
}

function closeIncomeModal() {
    app.closeIncomeModal();
}

function editIncome(id) {
    const inc = app.incomes.find(i => i.id == id);
    if (!inc) return;
    document.getElementById('income-description').value = inc.description;
    document.getElementById('income-amount').value = inc.amount;
    document.getElementById('income-category').value = inc.category;
    document.getElementById('income-date').value = (inc.date || '').split('T')[0];
    document.getElementById('income-modal').dataset.editId = id;
    document.getElementById('income-modal').querySelector('h2').textContent = 'Editar Receita';
    openIncomeModal();
}

async function deleteIncome(id) {
    if (!confirm('Excluir esta receita?')) return;
    try {
        const response = await fetch(`/api/incomes/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.incomes = app.incomes.filter(i => i.id != id);
            app.loadIncomes();
            app.updateDashboard();
        }
    } catch (error) {
        console.error('Erro ao excluir receita:', error);
    }
}

function openShoppingItemModal() {
    app.openShoppingItemModal();
}

function closeShoppingItemModal() {
    app.closeShoppingItemModal();
}

function openCardModal() {
    app.openCardModal();
}

function closeCardModal() {
    app.closeCardModal();
}

function closeCardDetailModal() {
    document.getElementById('card-detail-modal').style.display = 'none';
}

function openBudgetModal() {
    app.openBudgetModal();
}

function closeBudgetModal() {
    app.closeBudgetModal();
}

function openInstallmentModal() {
    app.openInstallmentModal();
}

function closeInstallmentModal() {
    app.closeInstallmentModal();
}

function openSubscriptionModal() {
    app.openSubscriptionModal();
}

function closeSubscriptionModal() {
    app.closeSubscriptionModal();
}

async function markInstallmentPaid(id) {
    try {
        const response = await fetch(`/api/installments/${id}/mark-paid`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            const inst = app.installments.find(i => i.id == id);
            if (inst) {
                const previousCurrentInstallment = inst.currentInstallment ?? inst.current_installment ?? 0;
                const currentInstallment = data.data?.currentInstallment ?? ((inst.currentInstallment ?? inst.current_installment ?? 0) + 1);
                inst.currentInstallment = currentInstallment;
                inst.current_installment = currentInstallment;
                app.installmentPreviewIndexes[id] = Math.max(0, previousCurrentInstallment);
            }
            app.loadInstallments();
        } else {
            alert(data.error || 'Erro ao marcar parcela como paga');
        }
    } catch (error) {
        console.error('Erro ao marcar parcela como paga:', error);
    }
}

async function deleteTransaction(id) {
    if (!confirm('Excluir esta transação?')) return;
    try {
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
        app.transactions = app.transactions.filter(t => t.id != id);
        app.loadTransactions();
        app.updateDashboard();
    } catch (error) {
        console.error('Erro ao excluir transação:', error);
    }
}

async function editTransaction(id) {
    const t = app.transactions.find(tx => tx.id == id);
    if (!t) return;
    document.getElementById('transaction-type').value = t.type;
    document.getElementById('transaction-amount').value = t.amount;
    document.getElementById('transaction-category').value = t.category;
    document.getElementById('transaction-description').value = t.description;
    document.getElementById('transaction-date').value = t.date?.split('T')[0] || '';
    document.getElementById('transaction-method').value = t.payment_method || 'pix';
    onPaymentMethodChange();
    if (t.payment_method === 'credito' && t.credit_card_id) {
        document.getElementById('transaction-card').value = t.credit_card_id;
    }
    const isRecurring = !!t.recurrence;
    document.getElementById('transaction-recurring').checked = isRecurring;
    if (isRecurring) {
        document.getElementById('transaction-recurrence-period').value = t.recurrence;
        document.getElementById('transaction-recurrence-end').value = t.recurrence_end_date?.split('T')[0] || '';
    }
    document.getElementById('recurrence-fields').style.display = isRecurring ? 'block' : 'none';
    document.getElementById('transaction-modal').dataset.editId = id;
    document.getElementById('transaction-modal').querySelector('h2').textContent = 'Editar Transação';
    openTransactionModal();
}

async function deleteInstallment(id) {
    if (!confirm('Excluir este parcelamento?')) return;
    try {
        const response = await fetch(`/api/installments/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.installments = app.installments.filter(i => i.id != id);
            app.loadInstallments();
        }
    } catch (error) {
        console.error('Erro ao excluir parcelamento:', error);
    }
}

async function editInstallment(id) {
    const inst = app.installments.find(i => i.id == id);
    if (!inst) return;
    document.getElementById('installment-description').value = inst.description;
    document.getElementById('installment-total').value = inst.totalAmount || inst.total_amount || 0;
    document.getElementById('installment-amount').value = inst.installmentAmount || inst.installment_amount || 0;
    document.getElementById('installment-count').value = inst.totalInstallments || inst.total_installments || 0;
    document.getElementById('installment-current').value = inst.currentInstallment || inst.current_installment || 0;
    document.getElementById('installment-category').value = inst.category || 'Compras';
    document.getElementById('installment-start').value = (inst.startDate || inst.start_date || '').split('T')[0];
    const amounts = app.parseInstallmentAmounts(inst);
    const customEnabled = document.getElementById('installment-custom-enabled');
    const customAmounts = document.getElementById('installment-custom-amounts');
    const toggleButton = document.getElementById('installment-custom-toggle-btn');
    if (customEnabled) customEnabled.checked = amounts.length > 0;
    app.updateInstallmentCalculatedFieldState();
    if (toggleButton) {
        toggleButton.classList.toggle('active', amounts.length > 0);
        toggleButton.setAttribute('aria-pressed', amounts.length > 0 ? 'true' : 'false');
    }
    if (customAmounts) customAmounts.style.display = amounts.length > 0 ? 'grid' : 'none';
    if (amounts.length > 0) app.renderInstallmentAmountFields(amounts);
    document.getElementById('installment-modal').dataset.editId = id;
    document.getElementById('installment-modal').querySelector('h2').textContent = 'Editar Parcelamento';
    openInstallmentModal();
}

async function markSubscriptionPaid(id) {
    try {
        const response = await fetch(`/api/goals/${id}/mark-paid`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            // Recarregar transações e assinaturas
            const txRes = await fetch('/api/transactions');
            const txData = await txRes.json();
            app.transactions = txData.data || [];
            app.loadSubscriptions();
            app.updateDashboard();
            app.refreshIcons();
        } else {
            alert(data.error || 'Erro ao marcar assinatura como paga');
        }
    } catch (error) {
        console.error('Erro ao marcar assinatura como paga:', error);
        alert('Erro ao marcar assinatura como paga');
    }
}

async function deleteSubscription(id) {
    if (!confirm('Excluir esta assinatura?')) return;
    try {
        const response = await fetch(`/api/goals/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.subscriptions = app.subscriptions.filter(s => s.id != id);
            app.loadSubscriptions();
        }
    } catch (error) {
        console.error('Erro ao excluir assinatura:', error);
    }
}

async function editSubscription(id) {
    const sub = app.subscriptions.find(s => s.id == id);
    if (!sub) return;
    document.getElementById('subscription-name').value = sub.name;
    document.getElementById('subscription-amount').value = sub.targetAmount || sub.target_amount || 0;
    document.getElementById('subscription-category').value = sub.category || 'Streaming';
    document.getElementById('subscription-modal').dataset.editId = id;
    document.getElementById('subscription-modal').querySelector('h2').textContent = 'Editar Assinatura';
    openSubscriptionModal();
}

async function deleteShoppingItem(id) {
    if (!confirm('Excluir este item?')) return;
    try {
        const response = await fetch(`/api/shopping-list/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.shoppingList = app.shoppingList.filter(i => i.id != id);
            app.loadShoppingList();
        }
    } catch (error) {
        console.error('Erro ao excluir item:', error);
    }
}

async function editShoppingItem(id) {
    const item = app.shoppingList.find(i => i.id == id);
    if (!item) return;
    document.getElementById('shopping-item').value = item.item;
    document.getElementById('shopping-category').value = item.category;
    document.getElementById('shopping-estimated-price').value = item.estimatedPrice || item.estimated_price || 0;
    document.getElementById('shopping-modal').dataset.editId = id;
    document.getElementById('shopping-modal').querySelector('h2').textContent = 'Editar Item';
    openShoppingItemModal();
}

async function deleteCreditCard(id) {
    if (!confirm('Excluir este cartão?')) return;
    try {
        const response = await fetch(`/api/credit-cards/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.creditCards = app.creditCards.filter(c => c.id != id);
            app.loadCreditCards();
        }
    } catch (error) {
        console.error('Erro ao excluir cartão:', error);
    }
}

async function editCreditCard(id) {
    const card = app.creditCards.find(c => c.id == id);
    if (!card) return;
    document.getElementById('card-name').value = card.name;
    document.getElementById('card-bank').value = card.bank;
    document.getElementById('card-limit').value = card.creditLimit || card.credit_limit || 0;
    document.getElementById('card-closing-date').value = card.closingDate || card.closing_date || '';
    document.getElementById('card-due-date').value = card.dueDate || card.due_date || '';
    document.getElementById('card-modal').dataset.editId = id;
    document.getElementById('card-modal').querySelector('h2').textContent = 'Editar Cartão';
    openCardModal();
}

async function deleteBudget(id) {
    if (!confirm('Excluir este orçamento?')) return;
    try {
        const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.budgets = app.budgets.filter(b => b.id != id);
            app.loadBudgets();
        }
    } catch (error) {
        console.error('Erro ao excluir orçamento:', error);
    }
}

async function editBudget(id) {
    const budget = app.budgets.find(b => b.id == id);
    if (!budget) return;
    document.getElementById('budget-category').value = budget.category;
    document.getElementById('budget-amount').value = budget.amount;
    document.getElementById('budget-period').value = budget.period;
    document.getElementById('budget-modal').dataset.editId = id;
    document.getElementById('budget-modal').querySelector('h2').textContent = 'Editar Orçamento';
    openBudgetModal();
}

async function importStatement(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch('/api/import/statement', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            const preview = (data.transactions || [])
                .slice(0, 5)
                .map(t => `${t.date} - ${t.description} - ${t.type === 'expense' ? '-' : '+'}R$ ${Number(t.amount).toFixed(2)}`)
                .join('\n');
            alert(`${data.recognized || data.imported} transações reconhecidas.\n${data.imported} importadas, ${data.skipped || 0} duplicadas ignoradas.${preview ? `\n\nPrimeiras importadas:\n${preview}` : ''}`);
            app.transactions = await fetch('/api/transactions').then(r => r.json()).then(d => d.data || []);
            app.loadTransactions();
            app.updateDashboard();
        } else {
            alert('Erro: ' + (data.error || 'Falha ao importar'));
        }
    } catch (error) {
        console.error('Erro ao importar extrato:', error);
        alert('Erro ao importar extrato');
    }
    input.value = '';
}

function importCardInvoice(cardId) {
    if (!cardId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.pdf,text/csv,application/pdf';
    input.onchange = () => uploadCardInvoice(cardId, input.files[0]);
    input.click();
}

async function uploadCardInvoice(cardId, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/api/credit-cards/${cardId}/import-invoice`, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            const preview = (data.transactions || [])
                .slice(0, 5)
                .map(t => `${t.date} - ${t.description} - R$ ${Number(t.amount).toFixed(2)}`)
                .join('\n');
            alert(`${data.recognized || data.imported} compras reconhecidas.\n${data.imported} importadas, ${data.skipped || 0} duplicadas ignoradas.${preview ? `\n\nPrimeiras importadas:\n${preview}` : ''}`);
            app.transactions = await fetch('/api/transactions').then(r => r.json()).then(d => d.data || []);
            app.loadCreditCards();
            if (app.cardDetailId == cardId) app.refreshCardDetail();
            app.updateDashboard();
        } else {
            alert('Erro: ' + (data.error || 'Falha ao importar fatura'));
        }
    } catch (error) {
        console.error('Erro ao importar fatura:', error);
        alert('Erro ao importar fatura');
    }
}

async function downloadStatement() {
    const year = app?.selectedYear || new Date().getFullYear();
    const month = (app?.selectedMonth ?? new Date().getMonth()) + 1;
    
    const url = `/api/report/statement?year=${year}&month=${month}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao gerar PDF');
        
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `extrato-${year}-${String(month).padStart(2, '0')}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Erro ao baixar extrato:', error);
        alert('Erro ao gerar extrato PDF');
    }
}

async function downloadSelectedReport() {
    const year = document.getElementById('report-year')?.value || new Date().getFullYear();
    const month = document.getElementById('report-month')?.value || (new Date().getMonth() + 1);
    const selectedSections = Array.from(document.querySelectorAll('input[name="report-section"]:checked'))
        .map(input => input.value);

    if (selectedSections.length === 0) {
        alert('Selecione pelo menos uma seção para baixar.');
        return;
    }

    const params = new URLSearchParams({
        year,
        month,
        sections: selectedSections.join(',')
    });

    try {
        const response = await fetch(`/api/report/statement?${params.toString()}`);
        if (!response.ok) throw new Error('Erro ao gerar PDF');

        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `relatorio-${year}-${String(month).padStart(2, '0')}.pdf`;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('Erro ao baixar relatório:', error);
        alert('Erro ao gerar relatório PDF');
    }
}
