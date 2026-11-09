// Temas Pugotilab (PQA-286): cor de um token do tema (--pt-*), ou a cor antiga quando o menu da conta não carregou.
const pugotiCorTema = (nome, padrao) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao;
// Wrapper de fetch com autenticação
const origFetch = window.fetch;
window.fetch = async function(url, options = {}) {
    const target = new URL(typeof url === 'string' ? url : url.url, location.href);
    const localApi = target.origin === location.origin && target.pathname.startsWith('/api/');
    const token = localStorage.getItem('authToken');
    if (token && localApi) options = { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${token}` } };
    try {
        const response = await origFetch.call(this, url, options);
        if (localApi && !['GET', 'HEAD'].includes((options.method || 'GET').toUpperCase()) && !response.ok) {
            const payload = await response.clone().json().catch(() => ({}));
            throw new Error(payload.errors?.join(' · ') || payload.error || 'Não foi possível salvar. Tente novamente.');
        }
        return response;
    } catch (error) {
        if (localApi && options.method && options.method !== 'GET') {
            document.getElementById('request-error')?.remove();
            const notice = document.createElement('div'); notice.id = 'request-error'; notice.className = 'load-error'; notice.setAttribute('role', 'alert');
            notice.textContent = error.message || 'Falha de conexão. Os dados não foram confirmados.';
            const close = document.createElement('button'); close.textContent = 'Fechar'; close.onclick = () => notice.remove(); notice.append(close);
            document.body.append(notice);
        }
        throw error;
    }
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
    if (icon) {
        icon.removeAttribute('data-lucide');
        icon.textContent = isDark ? 'light_mode' : 'dark_mode';
    }
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    applyTheme(nextTheme);
    document.getElementById('profile-menu')?.classList.remove('open'); document.querySelector('.pa-trigger')?.setAttribute('aria-expanded','false');
    window.app?.refreshIcons();
}

function isMobileNavigation() {
    return window.matchMedia('(max-width: 768px)').matches;
}

function toggleMobileMenu() {
    const sidebar = document.getElementById('sidebar-nav');
    const backdrop = document.getElementById('mobile-menu-backdrop');
    const button = document.getElementById('mobile-menu-button');

    if (!isMobileNavigation()) {
        const isExpanded = document.body.classList.toggle('sidebar-expanded');
        sidebar?.classList.remove('open');
        backdrop?.classList.remove('open');
        button?.setAttribute('aria-expanded', String(isExpanded));
        return;
    }

    const isOpen = sidebar?.classList.toggle('open') ?? false;
    backdrop?.classList.toggle('open', isOpen);
    button?.setAttribute('aria-expanded', String(isOpen));
}

function closeMobileMenu() {
    document.getElementById('sidebar-nav')?.classList.remove('open');
    document.getElementById('mobile-menu-backdrop')?.classList.remove('open');
    if (isMobileNavigation()) {
        document.getElementById('mobile-menu-button')?.setAttribute('aria-expanded', 'false');
    }
}

function closeSidebarFromOutside(target) {
    const element = target instanceof Element ? target : null;
    const sidebar = document.getElementById('sidebar-nav');
    const button = document.getElementById('mobile-menu-button');
    if (element?.closest('#sidebar-nav, #mobile-menu-button')) return;

    const desktopExpanded = document.body.classList.contains('sidebar-expanded');
    const mobileOpen = sidebar?.classList.contains('open');
    if (!desktopExpanded && !mobileOpen) return;

    document.body.classList.remove('sidebar-expanded');
    sidebar?.classList.remove('open');
    document.getElementById('mobile-menu-backdrop')?.classList.remove('open');
    button?.setAttribute('aria-expanded', 'false');
}

document.addEventListener('click', (event) => closeSidebarFromOutside(event.target));

// Tema da conta Pugotilab (menu da conta / Pugoti Profile).
window.pugotiAplicarTema = (tema) => { applyTheme(tema === 'claro' ? 'light' : 'dark'); window.app?.refreshIcons?.(); };
applyTheme(document.documentElement.dataset.pugotiTema === 'claro' ? 'light' : 'dark');

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

window.addEventListener('resize', () => {
    if (!isMobileNavigation()) {
        document.getElementById('sidebar-nav')?.classList.remove('open');
        document.getElementById('mobile-menu-backdrop')?.classList.remove('open');
    }
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
    element.textContent = label.trim().split(/\s+/).filter((_,i,a)=>i===0||i===a.length-1).map(x=>x[0]).join('').toUpperCase();
    element.style.backgroundImage = '';
    const avatarUrl = user.avatarUrl || user.avatar_url || user.avatar || '';
    element.dataset.avatarUrl = avatarUrl;
    if (avatarUrl) {
        element.textContent = '';
        element.style.backgroundImage = `url("${String(avatarUrl).replaceAll('"', '%22')}")`;
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
    // O menu da conta agora é o <pugoti-conta> (mesmo de todos os serviços); estes campos só existem em telas antigas.
    const nome = document.getElementById('user-name');
    if (nome) nome.textContent = profileLabel(user);
    const papel = document.getElementById('user-role');
    if (papel) papel.textContent = profileRoleLabel(user.role);
    setProfileAvatar(document.getElementById('user-avatar'), user);
    setProfileAvatar(document.getElementById('profile-menu-avatar'), user);
}

function toggleProfileMenu() {
    const menu = document.getElementById('profile-menu');
    if (!menu) return;
    menu.classList.toggle('open');
    document.querySelector('.pa-trigger')?.setAttribute('aria-expanded', String(menu.classList.contains('open')));
}

document.addEventListener('click', function(e) {
    const area = document.querySelector('.profile-area');
    if (area && !area.contains(e.target)) {
        document.getElementById('profile-menu')?.classList.remove('open'); document.querySelector('.pa-trigger')?.setAttribute('aria-expanded','false');
    }
});

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    window.location.href = `https://pugotilab.com/auth/logout?return=${encodeURIComponent(window.location.origin)}`;
}

async function startApp() {
    window.app?.router?.dispose();
    window.app = new FinanceApp();
}

// Perfil
async function openProfileModal() {
    window.location.href = `https://pugotilab.com/auth/profile?return=${encodeURIComponent(window.location.href)}`;
    return;
    document.getElementById('profile-menu')?.classList.remove('open'); document.querySelector('.pa-trigger')?.setAttribute('aria-expanded','false');
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
let authRetryTimer = null;

function pauseAuthenticationRetry() {
    showLogin();
    showAuthError('Muitas tentativas de autenticação. Aguarde alguns segundos; a conexão será retomada automaticamente.');
    clearTimeout(authRetryTimer);
    authRetryTimer = setTimeout(initializeAuthentication, 30000);
}

async function initializeAuthentication() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const res = await origFetch('/api/auth/me');
            if (res.status === 429) {
                pauseAuthenticationRetry();
                return;
            }
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
        if (response.status === 429) {
            pauseAuthenticationRetry();
            return;
        }
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
}

initializeAuthentication();

const categoriaPt = (categoria) => FinanceCore.pluggyCategory(categoria);

const moneyRoutes = {
    dashboard: '/', transactions: '/transacoes', incomes: '/receitas', expenses: '/despesas',
    installments: '/parcelamentos', subscriptions: '/assinaturas', 'shopping-list': '/compras',
    'credit-cards': '/cartoes', 'connected-accounts': '/contas-conectadas', budgets: '/orcamentos', reports: '/relatorios'
};
document.addEventListener("auxclick", (event) => {
    if (event.button !== 1 || !(event.target instanceof Element) || event.target.closest("a[href]")) return;
    const target = event.target.closest("[data-page]");
    const route = target && moneyRoutes[target.dataset.page];
    if (!route) return;
    event.preventDefault();
    window.open(route, "_blank", "noopener");
});

class FinanceApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.transactions = [];
        this.shoppingList = [];
        this.creditCards = [];
        this.budgets = [];
        this.installments = [];
        this.installmentGroups = [];
        this.subscriptionGroups = [];
        this.subscriptionViewMode = 'list';
        this.subscriptions = [];
        this.goals = [];
        this.incomes = [];
        this.expenses = [];
        this.charts = {};
        this.selectedMonth = new Date().getMonth();
        this.selectedYear = new Date().getFullYear();
        this.installmentViewMonth = this.selectedMonth;
        this.installmentViewYear = this.selectedYear;
        this.installmentViewMode = 'full';
        this.installmentSortMode = localStorage.getItem('installmentSortMode') || 'completion';
        this.installmentGroupFilter = localStorage.getItem('installmentGroupFilter') || 'all';
        this.subscriptionGroupFilter = localStorage.getItem('subscriptionGroupFilter') || 'all';
        this.subscriptionStatusFilter = 'all';
        this.subscriptionViewMonth = this.selectedMonth;
        this.subscriptionViewYear = this.selectedYear;
        this.hiddenInstallmentEntries = this.loadHiddenInstallmentEntries();
        this.shoppingFilter = 'active';
        this.installmentPreviewIndexes = {};
        
        this.router = PugotiRouter.createRouter(moneyRoutes, route => this.showPage(route.name));
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.populateYearDropdown();
        this.setDefaultMonthYear();
        updateIncomeDateLabel();
        updateReportSelectionState();
        document.getElementById("report-year").addEventListener("change", () => this.updateReports());
        document.getElementById("report-month").addEventListener("change", () => this.updateReports());
        if (!await this.loadInitialData()) return;

        const usuarioAtual = JSON.parse(localStorage.getItem('authUser') || '{}');
        if (usuarioAtual.username?.toLowerCase() === 'sekiro') document.getElementById('pluggy-nav').style.display = '';

        this.refreshIcons();
        this.router.start();
    }

    populateYearDropdown() {
        const yearSelect = document.getElementById('dashboard-year');
        const reportYearSelect = document.getElementById('report-year');
        const filterYearSelect = document.getElementById('filter-year');
        const installmentYearSelect = document.getElementById('installment-view-year');
        const subscriptionYearSelect = document.getElementById('subscription-view-year');
        const currentYear = new Date().getFullYear();
        for (let y = currentYear - 5; y <= currentYear + 1; y++) {
            const opt = document.createElement('option');
            opt.value = y;
            opt.textContent = y;
            if (yearSelect) yearSelect.appendChild(opt.cloneNode(true));
            if (reportYearSelect) reportYearSelect.appendChild(opt.cloneNode(true));
            if (filterYearSelect) filterYearSelect.appendChild(opt.cloneNode(true));
            if (installmentYearSelect) installmentYearSelect.appendChild(opt.cloneNode(true));
            if (subscriptionYearSelect) subscriptionYearSelect.appendChild(opt.cloneNode(true));
        }
    }

    setDefaultMonthYear() {
        const monthSelect = document.getElementById('dashboard-month');
        const yearSelect = document.getElementById('dashboard-year');
        const reportMonthSelect = document.getElementById('report-month');
        const reportYearSelect = document.getElementById('report-year');
        const filterMonthSelect = document.getElementById('filter-month');
        const filterYearSelect = document.getElementById('filter-year');
        const installmentMonthSelect = document.getElementById('installment-view-month');
        const installmentYearSelect = document.getElementById('installment-view-year');
        const installmentSortSelect = document.getElementById('installment-sort');
        const installmentGroupFilter = document.getElementById('installment-group-filter');
        if (monthSelect) monthSelect.value = this.selectedMonth;
        if (yearSelect) yearSelect.value = this.selectedYear;
        if (reportMonthSelect) reportMonthSelect.value = this.selectedMonth + 1;
        if (reportYearSelect) reportYearSelect.value = this.selectedYear;
        if (filterMonthSelect) filterMonthSelect.value = this.selectedMonth + 1;
        if (filterYearSelect) filterYearSelect.value = this.selectedYear;
        if (installmentMonthSelect) installmentMonthSelect.value = this.installmentViewMonth;
        if (installmentYearSelect) installmentYearSelect.value = this.installmentViewYear;
        if (installmentSortSelect) installmentSortSelect.value = this.installmentSortMode;
        if (installmentGroupFilter) installmentGroupFilter.value = this.installmentGroupFilter;
        const subscriptionGroupFilter = document.getElementById('subscription-group-filter');
        if (subscriptionGroupFilter) subscriptionGroupFilter.value = this.subscriptionGroupFilter;
        const subscriptionViewMonth = document.getElementById('subscription-view-month');
        const subscriptionViewYear = document.getElementById('subscription-view-year');
        if (subscriptionViewMonth) subscriptionViewMonth.value = this.subscriptionViewMonth;
        if (subscriptionViewYear) subscriptionViewYear.value = this.subscriptionViewYear;
        const subscriptionStatusFilter = document.getElementById('subscription-status-filter');
        if (subscriptionStatusFilter) subscriptionStatusFilter.value = this.subscriptionStatusFilter;
        this.updateInstallmentViewButtons();
    }

    onDashboardPeriodChange() {
        const monthSelect = document.getElementById('dashboard-month');
        const yearSelect = document.getElementById('dashboard-year');
        if (monthSelect) this.selectedMonth = parseInt(monthSelect.value);
        if (yearSelect) this.selectedYear = parseInt(yearSelect.value);
        this.updateDashboard();
    }

    onInstallmentViewChange() {
        const monthSelect = document.getElementById('installment-view-month');
        const yearSelect = document.getElementById('installment-view-year');
        if (monthSelect) this.installmentViewMonth = parseInt(monthSelect.value, 10);
        if (yearSelect) this.installmentViewYear = parseInt(yearSelect.value, 10);
        this.updateInstallmentViewButtons();
        this.loadInstallments();
    }

    onInstallmentSortChange() {
        const sortSelect = document.getElementById('installment-sort');
        this.installmentSortMode = sortSelect?.value || 'completion';
        localStorage.setItem('installmentSortMode', this.installmentSortMode);
        this.loadInstallments();
    }

    onInstallmentGroupFilterChange() {
        const groupSelect = document.getElementById('installment-group-filter');
        this.installmentGroupFilter = groupSelect?.value || 'all';
        localStorage.setItem('installmentGroupFilter', this.installmentGroupFilter);
        this.loadInstallments();
    }

    setInstallmentViewMode(mode) {
        this.installmentViewMode = ['summary', 'groups'].includes(mode) ? mode : 'full';
        this.updateInstallmentViewButtons();
        this.loadInstallments();
    }

    updateInstallmentViewButtons() {
        document.querySelectorAll('[data-installment-mode]').forEach(button => {
            const isActive = button.dataset.installmentMode === this.installmentViewMode;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target.closest('.nav-btn');
                if (button?.dataset.page) this.navigateTo(button.dataset.page);
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
        addListener('installment-count', 'input', () => { this.syncInstallmentTotals(); this.renderInstallmentAmountFields(); });
        addListener('installment-amount', 'input', () => { this.lastInstallmentEditedField = 'amount'; this.syncInstallmentTotals(); this.renderInstallmentAmountFields(); });
        addListener('installment-reference-month', 'change', () => { this.updateInstallmentStartFromReference(); this.renderInstallmentAmountFields(); });
        addListener('installment-payment-day', 'input', () => { this.updateInstallmentStartFromReference(); this.renderInstallmentAmountFields(); });
        addListener('installment-current', 'input', () => { this.updateInstallmentStartFromReference(); this.renderInstallmentAmountFields(); });
        addListener('installment-custom-enabled', 'change', () => { this.toggleCustomInstallmentAmounts(); });
        addListener('installment-custom-toggle-btn', 'click', () => {
            const customEnabled = document.getElementById('installment-custom-enabled');
            if (!customEnabled) return;
            customEnabled.checked = !customEnabled.checked;
            this.toggleCustomInstallmentAmounts();
        });
        addListener('subscription-form', 'submit', (e) => { e.preventDefault(); this.addSubscription(); });
        addListener('income-form', 'submit', (e) => { e.preventDefault(); this.addIncome(); });
        addListener('income-recurrence', 'change', updateIncomeDateLabel);
        addListener('expense-form', 'submit', (e) => { e.preventDefault(); this.addExpense(); });
        addListener('expense-recurrence', 'change', updateExpenseDateLabel);

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
        addListener('installment-view-month', 'change', () => { this.onInstallmentViewChange(); });
        addListener('installment-view-year', 'change', () => { this.onInstallmentViewChange(); });
        addListener('installment-sort', 'change', () => { this.onInstallmentSortChange(); });
        addListener('installment-group-filter', 'change', () => { this.onInstallmentGroupFilterChange(); });
        addListener('subscription-group-filter', 'change', () => { this.onSubscriptionGroupFilterChange(); });
        addListener('subscription-status-filter', 'change', () => { this.onSubscriptionStatusFilterChange(); });
        addListener('subscription-view-month', 'change', () => { this.onSubscriptionViewChange(); });
        addListener('subscription-view-year', 'change', () => { this.onSubscriptionViewChange(); });
        document.querySelectorAll('[data-installment-mode]').forEach(button => {
            button.addEventListener('click', () => this.setInstallmentViewMode(button.dataset.installmentMode));
        });
        document.querySelectorAll('[data-subscription-mode]').forEach(button => {
            button.addEventListener('click', () => this.setSubscriptionViewMode(button.dataset.subscriptionMode));
        });
        addListener('shopping-filter', 'change', () => {
            this.shoppingFilter = document.getElementById('shopping-filter').value;
            this.loadShoppingList();
        });
    }

    navigateTo(page) {
        this.router.navigate({ name: page });
    }

    async ensureCharts() {
        if (!window.Chart) {
            this.chartLoading ||= new Promise((resolve,reject) => {
                const script=document.createElement('script'); script.src='/js/chart.umd.min.js';
                script.onload=resolve; script.onerror=()=>{this.chartLoading=null;script.remove();reject(new Error('Não foi possível carregar os gráficos.'));};
                document.head.appendChild(script);
            });
            await this.chartLoading;
        }
        // Temas Pugotilab (PQA-286): texto, grade e linha dos gráficos nas cores do tema (sem o menu, as antigas).
        Chart.defaults.color=pugotiCorTema('--pt-suave','#aabacc'); Chart.defaults.borderColor=pugotiCorTema('--pt-borda','#263646');
        if (!this.temaDosGraficos) {
            this.temaDosGraficos = true;
            document.addEventListener('pugoti:paleta', () => {
                Chart.defaults.color=pugotiCorTema('--pt-suave','#aabacc'); Chart.defaults.borderColor=pugotiCorTema('--pt-borda','#263646');
                for (const grafico of Object.values(this.charts || {})) {
                    if (!grafico?.options) continue;
                    for (const eixo of Object.values(grafico.options.scales || {})) { if (eixo.grid) eixo.grid.color = Chart.defaults.borderColor; if (eixo.ticks) eixo.ticks.color = Chart.defaults.color; }
                    if (grafico === this.charts.cashFlow) { const d = grafico.data.datasets[0]; d.borderColor = pugotiCorTema('--pt-destaque','#36A2EB'); d.backgroundColor = `color-mix(in srgb, ${d.borderColor} 12%, transparent)`; }
                    grafico.update();
                }
            });
        }
        if (!this.charts.category) this.initCharts();
    }

    async showPage(page) {
        if (!Object.hasOwn(moneyRoutes, page) || !document.getElementById(page)) return;
        document.querySelectorAll('.modal').forEach(modal => { modal.style.display = 'none'; });
        // Atualizar navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

        // Mostrar página
        document.querySelectorAll('.page').forEach(p => {
            p.style.display = 'none';
        });
        document.getElementById(page).style.display = 'block';

        this.currentPage = page;
        this.renderBankFilter();
        closeMobileMenu();
        if (page === 'dashboard' || page === 'reports') {
            try { await this.ensureCharts(); } catch(error) { console.error(error); }
            if (this.currentPage !== page) return;
        }
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
            case 'connected-accounts':
                this.loadPluggyView();
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
            case 'expenses':
                this.loadExpenses();
                break;
        }
    }

    async loadPluggyView() {
        const status = document.getElementById('pluggy-status');
        const contas = document.getElementById('pluggy-accounts');
        const lancamentos = document.getElementById('pluggy-transactions');
        status.textContent = 'Carregando dados...';
        contas.replaceChildren();
        lancamentos.replaceChildren();
        try {
            const resposta = await fetch('/api/pluggy/visao?limite=100', { cache: 'no-store' });
            if (!resposta.ok) throw new Error('Dados ainda indisponíveis.');
            const dados = await resposta.json();
            if (this.currentPage !== 'connected-accounts') return;
            const itens = dados.itens || [];
            const data = (texto) => texto ? texto.split('-').reverse().join('/') : '—';
            const avisos = [];
            const desatualizados = itens.filter(item => item.desatualizado).length;
            if (desatualizados) avisos.push(`${desatualizados} ${desatualizados === 1 ? 'banco não respondeu e mostra' : 'bancos não responderam e mostram'} os dados da sincronização anterior.`);
            // A autorização do Meu Pluggy vale um ano; avisa com 30 dias de antecedência.
            const vencendo = itens.filter(item => item.consentimentoExpiraEm && Date.parse(item.consentimentoExpiraEm) - Date.now() < 30 * 86400000);
            if (vencendo.length) avisos.push(`Autorização vencendo em ${vencendo.map(item => data(item.consentimentoExpiraEm)).join(', ')}: renove no Dashboard Pluggy (Conectar Conta → MeuPluggy).`);
            status.textContent = [`Atualizado em ${new Date(dados.atualizadoEm).toLocaleString('pt-BR')}. ${itens.length || 1} ${(itens.length || 1) === 1 ? 'conexão' : 'conexões'}, ${dados.totalLancamentos} lançamentos disponíveis.`, ...avisos].join(' ');
            const contasVisiveis = dados.contas.filter(conta => this.inSelectedBank(conta));
            const refsVisiveis = new Set(contasVisiveis.map(conta => conta.ref));
            for (const conta of contasVisiveis) {
                const cartao = document.createElement('div'); cartao.className = 'card';
                const titulo = document.createElement('h3'); titulo.textContent = conta.nome;
                const detalhe = document.createElement('p'); detalhe.textContent = conta.tipo === 'CREDIT' ? 'Cartão de crédito · limite usado' : 'Conta corrente · saldo';
                const saldo = document.createElement('strong'); saldo.textContent = FinanceCore.money(conta.saldo);
                cartao.append(titulo, detalhe, saldo);
                if (conta.cartao) {
                    const c = conta.cartao, extra = document.createElement('small');
                    extra.textContent = [c.disponivel !== null && c.limite !== null ? `Disponível ${FinanceCore.money(c.disponivel)} de ${FinanceCore.money(c.limite)}` : null, c.fechamento ? `fecha ${data(c.fechamento)}` : null, c.vencimento ? `vence ${data(c.vencimento)}` : null, c.minimo !== null ? `mínimo ${FinanceCore.money(c.minimo)}` : null].filter(Boolean).join(' · ');
                    if (extra.textContent) { cartao.append(document.createElement('br'), extra); }
                }
                contas.append(cartao);
            }
            const investimentos = (dados.investimentos || []).filter(item => this.inSelectedBank(item));
            const caixaInvestimentos = document.getElementById('pluggy-investments-card');
            caixaInvestimentos.hidden = !investimentos.length;
            document.getElementById('pluggy-investments-total').textContent = `Total: ${FinanceCore.money(investimentos.reduce((soma, item) => soma + item.saldo, 0))}`;
            document.getElementById('pluggy-investments').replaceChildren(...investimentos.map(item => {
                const linha = document.createElement('div'); linha.className = 'recent-row';
                const nome = document.createElement('div'); const titulo = document.createElement('strong'); titulo.textContent = item.nome;
                const tipo = document.createElement('small'); tipo.textContent = [({ FIXED_INCOME: 'Renda fixa', MUTUAL_FUND: 'Fundo', EQUITY: 'Ações', ETF: 'ETF', COE: 'COE', SECURITY: 'Previdência', OTHER: 'Outros' })[item.tipo] || item.tipo, item.subtipo].filter(Boolean).join(' · ');
                nome.append(titulo, tipo);
                const valor = document.createElement('span'); valor.textContent = FinanceCore.money(item.saldo);
                linha.append(nome, valor); return linha;
            }));
            const movimentos = dados.lancamentos.filter(movimento => !movimento.contaRef || refsVisiveis.has(movimento.contaRef));
            if (!movimentos.length) {
                const vazio = document.createElement('p'); vazio.textContent = 'Nenhum lançamento disponível.'; lancamentos.append(vazio);
            }
            for (const movimento of movimentos) {
                const linha = document.createElement('div'); linha.className = 'recent-row';
                const descricao = document.createElement('div');
                const nome = document.createElement('strong'); nome.textContent = movimento.descricao;
                const data = document.createElement('small'); data.textContent = `${movimento.data.split('-').reverse().join('/')} · ${movimento.status === 'PENDING' ? 'Pendente' : 'Confirmado'}`;
                descricao.append(nome, data);
                const valor = document.createElement('span'); valor.textContent = FinanceCore.money(Math.abs(movimento.valor));
                valor.className = movimento.tipo === 'CREDIT' ? 'income' : 'expense';
                linha.append(descricao, valor); lancamentos.append(linha);
            }
        } catch {
            status.textContent = 'Dados ainda indisponíveis. A sincronização precisa ser concluída no servidor.';
        }
    }

    // Hoje só o sekiro tem contas conectadas (MeuPluggy); os outros usuários seguem no modo manual.
    hasConnectedAccounts() {
        return JSON.parse(localStorage.getItem('authUser') || '{}').username?.toLowerCase() === 'sekiro';
    }

    // Filtro por banco (cada banco é uma conexão do Meu Pluggy): null = todos. Fica salvo neste navegador.
    bankSelection() {
        if (this.bankSelectionCache === undefined) {
            try { const salvo = JSON.parse(localStorage.getItem('pugotimoney.bancos') || 'null'); this.bankSelectionCache = Array.isArray(salvo) && salvo.length ? new Set(salvo) : null; }
            catch { this.bankSelectionCache = null; }
        }
        return this.bankSelectionCache;
    }

    setBankSelection(selecao) {
        this.bankSelectionCache = selecao && selecao.size ? selecao : null;
        try { localStorage.setItem('pugotimoney.bancos', JSON.stringify(this.bankSelectionCache ? [...this.bankSelectionCache] : null)); } catch { /* navegador sem armazenamento: vale só nesta visita */ }
        this.connectedMonthCache = new Map();
        this.renderBankFilter();
        this.updatePageContent(this.currentPage);
    }

    /** A conta pertence a um banco escolhido no filtro (contas antigas, sem banco, sempre aparecem). */
    inSelectedBank(conta) {
        const selecao = this.bankSelection();
        return !selecao || !conta?.itemRef || selecao.has(conta.itemRef);
    }

    async renderBankFilter() {
        const barra = document.getElementById('bank-filter');
        const paginas = ['dashboard', 'transactions', 'incomes', 'expenses', 'credit-cards', 'connected-accounts', 'reports'];
        if (!barra || !this.hasConnectedAccounts() || !paginas.includes(this.currentPage)) { if (barra) barra.hidden = true; return; }
        const dados = await this.connectedData();
        const itens = (dados?.itens || []).map(item => {
            const contas = (dados.contas || []).filter(conta => conta.itemRef === item.ref);
            return { ref: item.ref, nome: item.banco || (contas.find(conta => conta.tipo === 'BANK') || contas[0])?.nome?.split(/\s+/)[0] || 'Banco' };
        });
        // Com um banco só, não há o que filtrar.
        if (itens.length < 2 || !paginas.includes(this.currentPage)) { barra.hidden = true; return; }
        const selecao = this.bankSelection();
        const todos = !selecao || itens.every(item => selecao.has(item.ref));
        barra.replaceChildren();
        const rotulo = document.createElement('span'); rotulo.textContent = 'Bancos:';
        const botao = (texto, ativo, aoClicar) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = texto; b.setAttribute('aria-pressed', String(ativo)); b.className = ativo ? 'on' : ''; b.onclick = aoClicar; return b; };
        barra.append(rotulo, botao('Todos', todos, () => this.setBankSelection(null)));
        for (const item of itens) {
            const ativo = !todos && selecao.has(item.ref);
            barra.append(botao(item.nome, ativo, () => {
                // Clicar com "Todos" ativo mostra só aquele banco; depois, cada clique liga ou desliga um banco.
                const nova = todos ? new Set() : new Set(selecao);
                if (nova.has(item.ref)) nova.delete(item.ref); else nova.add(item.ref);
                // Ligar o último banco que faltava equivaleria a "Todos": nesse caso o clique troca para só o banco clicado.
                this.setBankSelection(nova.size === itens.length ? new Set([item.ref]) : nova);
            }));
        }
        barra.hidden = false;
    }

    // Contas conectadas não mudam com o mês escolhido: uma leitura vale por 5 minutos (falha não fica guardada).
    connectedData() {
        if (!this.connectedCache || Date.now() - this.connectedCache.em > 5 * 60 * 1000) {
            const dados = fetch('/api/pluggy/visao?limite=1', { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
            this.connectedCache = { em: Date.now(), dados };
            dados.then(resultado => { if (!resultado && this.connectedCache?.dados === dados) this.connectedCache = null; });
        }
        return this.connectedCache.dados;
    }

    // Saldo atual: só as contas conectadas (Pluggy). Contas correntes somam; a fatura do cartão aparece à parte.
    async renderConnectedBalance() {
        const valor = document.getElementById('current-balance');
        const nota = document.getElementById('current-balance-note');
        if (!valor || !nota) return;
        const linhas = (...textos) => nota.replaceChildren(...textos.flatMap((texto, i) => i ? [document.createElement('br'), texto] : [texto]));
        if (!this.hasConnectedAccounts()) { valor.textContent = '—'; linhas('Nenhuma conta conectada'); return; }
        const dados = await this.connectedData();
        if (!dados?.contas?.length) { valor.textContent = '—'; linhas('Contas conectadas indisponíveis no momento'); return; }
        const bancos = dados.contas.filter(conta => conta.tipo === 'BANK' && this.inSelectedBank(conta));
        const cartoes = dados.contas.filter(conta => conta.tipo === 'CREDIT' && this.inSelectedBank(conta));
        valor.textContent = FinanceCore.money(bancos.reduce((soma, conta) => soma + conta.saldo, 0));
        const quando = new Date(dados.atualizadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        const textos = [`${bancos.length} ${bancos.length === 1 ? 'conta conectada' : 'contas conectadas'} · atualizado em ${quando}`];
        if (cartoes.length) textos.push(`Limite usado no cartão: ${FinanceCore.money(cartoes.reduce((soma, conta) => soma + conta.saldo, 0))} (fora do saldo)`);
        linhas(...textos);
    }

    async loadInitialData() {
        try {
            const response = await fetch('/api/initial-data?ts=' + Date.now(), { cache: 'no-store' });
            if (!response.ok) throw new Error('Não foi possível carregar os dados. Sua informação não foi alterada.');
            const data = await response.json();
            this.transactions = data.transactions || [];
            this.shoppingList = data.shoppingList || [];
            this.creditCards = data.creditCards || [];
            this.budgets = data.budgets || [];
            this.installments = data.installments || [];
            this.installmentGroups = data.installmentGroups || [];
            this.subscriptionGroups = data.subscriptionGroups || [];
            this.subscriptions = data.goals ? data.goals.filter(g => g.category !== 'Dívida') : [];
            this.goals = data.goals ? data.goals.filter(g => g.category === 'Dívida') : [];
            this.incomes = data.incomes || [];
            this.expenses = data.expenses || [];
            document.getElementById('data-load-error')?.remove();
            return true;
        } catch (error) {
            document.getElementById('data-load-error')?.remove();
            const message = document.createElement('div');
            message.id = 'data-load-error'; message.className = 'load-error'; message.setAttribute('role', 'alert');
            message.innerHTML = '<strong>Não foi possível carregar seus dados.</strong><p>Os valores não estão disponíveis. Tente novamente.</p><button class="btn" type="button">Tentar novamente</button>';
            document.querySelector('.app-main').prepend(message);
            message.querySelector('button').onclick = () => location.reload();
            return false;
        }
    }

    updateDashboard() {
        const totals = FinanceCore.summary(this, this.selectedYear, this.selectedMonth + 1);
        this.renderConnectedBalance();
        const receita = document.getElementById('monthly-income');
        if (this.hasConnectedAccounts()) {
            // Com contas conectadas, a receita do mês é o dinheiro que entrou nelas; receitas manuais são só lembretes.
            const ano = this.selectedYear, mes = this.selectedMonth;
            receita.textContent = '…';
            this.connectedIncome(ano, mes + 1).then(dados => {
                if (this.selectedYear === ano && this.selectedMonth === mes) receita.textContent = dados ? FinanceCore.money(dados.total) : '—';
            });
        } else receita.textContent = FinanceCore.money(totals.income);
        const despesa = document.getElementById('monthly-expenses');
        if (this.hasConnectedAccounts()) {
            // Despesas do mês: saídas das contas e compras no cartão; despesas manuais são só lembretes.
            const ano = this.selectedYear, mes = this.selectedMonth;
            despesa.textContent = '…';
            this.connectedMonth('despesas', ano, mes + 1).then(dados => {
                if (this.selectedYear === ano && this.selectedMonth === mes) despesa.textContent = dados ? FinanceCore.money(dados.total) : '—';
            });
        } else despesa.textContent = FinanceCore.money(totals.expenses);

        const recent = document.getElementById('dashboard-recent');
        if (recent && !this.hasConnectedAccounts()) {
            const entries = [...totals.entries].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
            recent.innerHTML = entries.length ? entries.map(entry => `<div class="recent-row"><div><strong>${esc(entry.description)}</strong><small>${esc(String(entry.date).slice(0,10).split('-').reverse().join('/'))} · ${esc(this.getCategoryName(entry.category))}</small></div><span class="${entry.type==='income'?'income':'expense'}">${entry.type==='income'?'+':'−'} ${FinanceCore.money(entry.amount)}</span></div>`).join('') : '<p class="empty-state">Nenhum lançamento neste mês. Comece adicionando uma receita ou despesa.</p>';
        }
        this.updateDashboardCommitments();
        this.updateCharts();
        this.refreshIcons();
    }

    incomeOccursInMonth(income, month, year) {
        const [startYear, startMonth] = String(income?.date || '')
            .split('T')[0]
            .split('-')
            .map(Number);
        if (!startYear || !startMonth) return false;

        const targetKey = year * 12 + month;
        const startKey = startYear * 12 + (startMonth - 1);
        if (targetKey < startKey) return false;

        const recurrence = ['monthly', 'yearly'].includes(income.recurrence)
            ? income.recurrence
            : 'specific';
        if (recurrence === 'monthly') return true;
        if (recurrence === 'yearly') return startMonth - 1 === month;
        return startYear === year && startMonth - 1 === month;
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

        const subscriptions = (this.subscriptions || []).filter(sub => this.isSubscriptionActiveInMonth(sub, this.selectedYear, this.selectedMonth));
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
        }).join('') || '<p style="color:#666;font-size:13px;">Nenhuma assinatura ativa neste mês.</p>';
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
        const totals = FinanceCore.summary(this, year ?? this.selectedYear, (month ?? this.selectedMonth) + 1);
        return type === 'income' ? totals.income : totals.expenses;
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
                        '#FF9F40',
                        '#8BC34A',
                        '#9AA5B1'
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
                    borderColor: pugotiCorTema('--pt-destaque', '#36A2EB'),
                    backgroundColor: pugotiCorTema('--pt-destaque', '') ? `color-mix(in srgb, ${pugotiCorTema('--pt-destaque', '')} 12%, transparent)` : 'rgba(54, 162, 235, 0.1)',
                    cubicInterpolationMode: 'monotone'
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
        if (this.hasConnectedAccounts()) return this.updateConnectedDashboard();
        if (!this.charts.category || !this.charts.cashFlow) return;
        this.charts.category.options.plugins.title.text = 'Gastos por Categoria';
        this.charts.cashFlow.options.plugins.title.text = 'Fluxo de Caixa';
        this.charts.cashFlow.data.datasets[0].label = 'Saldo';
        try {
            const { selectedMonth, selectedYear } = this;

            // Gráfico de categorias — filtrar pelo mês selecionado
            const totals = FinanceCore.summary(this, selectedYear, selectedMonth + 1);
            const categoryTotals = totals.categoryTotals;
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
                const dayTransactions = totals.entries.filter(t => {
                    const tDate = (t.date || '').split('T')[0];
                    return tDate === dateStr;
                });
                const dayBalance = dayTransactions.reduce((total, t) => {
                    return total + (t.type === 'income' ? t.amount : -t.amount);
                }, 0);
                cumulativeBalance = FinanceCore.sum([cumulativeBalance, dayBalance]);
                dailyBalances.push(cumulativeBalance);
            }

            this.charts.cashFlow.data.labels = labels;
            this.charts.cashFlow.data.datasets[0].data = dailyBalances;
            this.charts.cashFlow.update();
        } catch (e) {
            console.warn('Erro ao atualizar gráficos:', e);
        }
    }

    // Com contas conectadas, os gráficos e os últimos lançamentos do Dashboard usam as receitas e despesas reais do mês (as mesmas dos cards).
    async updateConnectedDashboard() {
        const ano = this.selectedYear, mes = this.selectedMonth;
        const recent = document.getElementById('dashboard-recent');
        const [receitas, despesas] = await Promise.all([this.connectedMonth('receitas', ano, mes + 1), this.connectedMonth('despesas', ano, mes + 1)]);
        if (this.selectedYear !== ano || this.selectedMonth !== mes || this.currentPage !== 'dashboard') return;
        const entradas = receitas?.lancamentos || [], saidas = despesas?.lancamentos || [];
        const centavos = (valor) => Math.round(valor * 100);

        // Despesas por categoria: as 7 maiores e o resto em "Outras".
        const porCategoria = new Map();
        for (const item of saidas) { const nome = categoriaPt(item.categoria); porCategoria.set(nome, (porCategoria.get(nome) || 0) + centavos(item.valor)); }
        let grupos = [...porCategoria].sort((a, b) => b[1] - a[1]);
        if (grupos.length > 8) grupos = [...grupos.slice(0, 7), ['Outras', grupos.slice(7).reduce((soma, grupo) => soma + grupo[1], 0)]];
        const categorias = this.charts.category, fluxo = this.charts.cashFlow;
        if (categorias && fluxo) {
            categorias.data.labels = grupos.map(grupo => grupo[0]);
            categorias.data.datasets[0].data = grupos.map(grupo => grupo[1] / 100);
            categorias.options.plugins.title.text = !despesas ? 'Despesas indisponíveis no momento' : grupos.length ? 'Despesas do mês por categoria' : 'Nenhuma despesa neste mês';
            categorias.update();

            // Entradas − saídas acumuladas, dia a dia; dias que ainda não chegaram ficam sem ponto.
            const dias = new Date(ano, mes + 1, 0).getDate(), hoje = new Date();
            const ultimoDia = ano === hoje.getFullYear() && mes === hoje.getMonth() ? hoje.getDate() : new Date(ano, mes, 1) > hoje ? 0 : dias;
            const movimento = new Array(dias + 1).fill(0);
            for (const item of entradas) movimento[Number(item.data.slice(8, 10))] += centavos(item.valor);
            for (const item of saidas) movimento[Number(item.data.slice(8, 10))] -= centavos(item.valor);
            let acumulado = 0;
            fluxo.data.labels = Array.from({ length: dias }, (_, i) => String(i + 1));
            fluxo.data.datasets[0].data = Array.from({ length: dias }, (_, i) => { if (i + 1 > ultimoDia) return null; acumulado += movimento[i + 1]; return acumulado / 100; });
            fluxo.data.datasets[0].label = 'Entradas − saídas acumuladas';
            fluxo.options.plugins.title.text = receitas && despesas ? 'Fluxo do mês nas contas conectadas' : 'Fluxo indisponível no momento';
            fluxo.update();
        }

        if (!recent) return;
        if (!receitas || !despesas) { recent.innerHTML = '<p class="empty-state">Lançamentos indisponíveis no momento.</p>'; return; }
        const ultimos = [...entradas.map(item => ({ ...item, entrada: true })), ...saidas.map(item => ({ ...item, entrada: false }))]
            .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
        recent.innerHTML = ultimos.length ? ultimos.map(item => `<div class="recent-row"><div><strong>${esc(item.descricao || 'Lançamento')}</strong>${item.contraparte ? `<span class="real-tx-party">${item.entrada ? 'De' : 'Para'}: ${esc(item.contraparte)}</span>` : ''}<small>${esc(item.data.split('-').reverse().join('/'))} · ${esc(item.conta)}${item.pendente ? ' · Pendente' : ''}</small></div><span class="${item.entrada ? 'income' : 'expense'}">${item.entrada ? '+' : '−'} ${FinanceCore.money(item.valor)}</span></div>`).join('') : '<p class="empty-state">Nenhum lançamento nas contas neste mês.</p>';
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

    loadTransactions(requestedPage = 1) {
        const conectado = this.hasConnectedAccounts();
        document.getElementById('real-transactions').hidden = !conectado;
        document.getElementById('manual-transactions').hidden = conectado;
        // Com contas conectadas, a aba mostra só os lançamentos reais; as transações manuais ficam guardadas, fora da tela.
        if (conectado) return void this.loadRealTransactions();
        const transactionsList = document.getElementById('transactions-list');
        transactionsList.innerHTML = '';

        const filteredTransactions = this.getFilteredTransactions();
        this.updateTransactionFilterSummary(filteredTransactions);

        if (filteredTransactions.length === 0) {
            transactionsList.innerHTML = '<div class="empty-state">Nenhuma transação encontrada para os filtros selecionados.</div>';
            return;
        }

        const pageSize=25, pages=Math.max(1,Math.ceil(filteredTransactions.length/pageSize));
        const page=Math.min(Math.max(requestedPage,1),pages);
        filteredTransactions.slice((page-1)*pageSize,page*pageSize).forEach(transaction => {
            const item = document.createElement('div');
            item.className = 'transaction-item';
            
            const amountClass = transaction.type === 'income' ? 'income' : 'expense';
            const amountPrefix = transaction.type === 'income' ? '+' : '-';
            
            const methodNames = { pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Débito', credito: 'Crédito' };
            const method = methodNames[transaction.payment_method] || transaction.payment_method || '';
            const recurringLabel = transaction.recurrence ? `<span class="recurring-badge" title="Recorrente ${esc(transaction.recurrence)}"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">refresh</span></span> ` : '';
            item.innerHTML = `
                <div class="transaction-info">
                    <div>${recurringLabel}${esc(transaction.description)}</div>
                    <div class="transaction-category">${esc(this.getCategoryName(transaction.category))}</div>
                    <div style="font-size: 11px; color: #999;">${esc(transaction.date?.split('T')[0] || '')} ${method ? '• ' + esc(method) : ''}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="transaction-amount ${amountClass}">
                        ${amountPrefix} ${FinanceCore.money(transaction.amount)}
                    </div>
                    <button class="btn-small" onclick="editTransaction(${transaction.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                    <button class="btn-small btn-danger" onclick="deleteTransaction(${transaction.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
                </div>
            `;
            
            transactionsList.appendChild(item);
        });
        if (pages>1) {
            const controls=document.createElement('nav');controls.className='history-pagination';controls.setAttribute('aria-label','Páginas de transações');
            controls.innerHTML=`<button class="btn-small" ${page===1?'disabled':''}>Anterior</button><span>${page} de ${pages}</span><button class="btn-small" ${page===pages?'disabled':''}>Próxima</button>`;
            controls.firstElementChild.onclick=()=>this.loadTransactions(page-1);
            controls.lastElementChild.onclick=()=>this.loadTransactions(page+1);
            transactionsList.appendChild(controls);
        }
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
        const purchaseUrl = document.getElementById('shopping-purchase-url').value.trim() || null;
        const editId = document.getElementById('shopping-modal').dataset.editId;

        const currentItem = editId ? this.shoppingList.find(i => i.id == editId) : null;
        const shoppingItem = { item, category, estimatedPrice, purchaseUrl, purchased: currentItem?.purchased || false };

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
        if (!shoppingListItems) return;
        shoppingListItems.innerHTML = '';

        const filter = this.shoppingFilter || 'all';
        let filtered = [...this.shoppingList];
        if (filter === 'active') filtered = filtered.filter(item => !item.purchased);
        else if (filter === 'purchased') filtered = filtered.filter(item => item.purchased);

        filtered.sort((a, b) => Number(a.purchased) - Number(b.purchased));
        filtered.forEach(item => {
            const itemElement = document.createElement('div');
            const isPurchased = Boolean(item.purchased);
            const purchaseUrl = item.purchaseUrl || item.purchase_url;
            const purchaseLink = purchaseUrl ? `<a class="btn-small shopping-link" href="${esc(purchaseUrl)}" target="_blank" rel="noopener noreferrer" title="Abrir link de compra"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">open_in_new</span></a>` : '';

            itemElement.className = 'transaction-item shopping-sortable';
            itemElement.dataset.itemId = String(item.id);
            itemElement.dataset.purchased = String(isPurchased);
            itemElement.draggable = window.matchMedia?.('(pointer: coarse)').matches !== true;
            itemElement.innerHTML = `
                <div class="transaction-info" style="display: flex; align-items: center; gap: 10px;">
                    <div style="${isPurchased ? 'text-decoration: line-through; opacity: 0.5;' : ''} flex: 1;">
                        <div>${esc(item.item)}</div>
                        <div class="transaction-category">${esc(this.getCategoryName(item.category))}</div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div class="transaction-amount">R$ ${Number(item.estimatedPrice || item.estimated_price || 0).toFixed(2)}</div>
                    ${purchaseLink}
                    <button class="btn-small${isPurchased ? ' checked' : ''}" data-shopping-toggle-id="${item.id}" onclick="app.toggleShoppingItem(${item.id})" title="${esc(isPurchased ? 'Desmarcar' : 'Marcar como comprado')}">
                        <span class="material-symbols-rounded lucide-icon" aria-hidden="true">${isPurchased ? 'check_circle' : 'circle'}</span>
                    </button>
                    <button class="btn-small" onclick="editShoppingItem(${item.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                    <button class="btn-small btn-danger" onclick="deleteShoppingItem(${item.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
                </div>
            `;
            shoppingListItems.appendChild(itemElement);
        });
        this.setupShoppingDragAndDrop(shoppingListItems);
        this.refreshIcons();
    }

    setupShoppingDragAndDrop(container) {
        let dragged = null;
        let dragOver = null;
        const coarsePointer = () => window.matchMedia?.('(pointer: coarse)').matches === true;
        const clearFeedback = () => {
            container.querySelectorAll('.shopping-sortable.dragging, .shopping-sortable.drag-over').forEach(item => {
                item.classList.remove('dragging', 'drag-over');
            });
            dragOver = null;
        };
        const placeDraggedAt = (clientX, clientY) => {
            const target = document.elementFromPoint(clientX, clientY)?.closest('.shopping-sortable');
            if (!dragged || !target || target === dragged || !container.contains(target) || dragged.dataset.purchased !== target.dataset.purchased) return false;
            if (dragOver && dragOver !== target) dragOver.classList.remove('drag-over');
            dragOver = target;
            target.classList.add('drag-over');
            const rect = target.getBoundingClientRect();
            container.insertBefore(dragged, clientY < rect.top + rect.height / 2 ? target : target.nextSibling);
            return true;
        };

        container.querySelectorAll('.shopping-sortable').forEach(element => {
            let touch = null;

            element.addEventListener('dragstart', event => {
                if (coarsePointer()) { event.preventDefault(); return; }
                if (event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) { event.preventDefault(); return; }
                dragged = element;
                element.classList.add('dragging');
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', element.dataset.itemId);
            });
            element.addEventListener('dragend', () => {
                clearFeedback();
                dragged = null;
            });
            element.addEventListener('dragover', event => {
                if (!dragged || dragged === element || dragged.dataset.purchased !== element.dataset.purchased) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                placeDraggedAt(event.clientX, event.clientY);
            });
            element.addEventListener('dragleave', event => {
                if (!element.contains(event.relatedTarget)) element.classList.remove('drag-over');
            });
            element.addEventListener('drop', event => {
                if (!dragged || dragged.dataset.purchased !== element.dataset.purchased) return;
                event.preventDefault();
                placeDraggedAt(event.clientX, event.clientY);
                void this.saveShoppingOrder(container);
            });

            const cancelTouch = (restore = false) => {
                if (!touch) return;
                clearTimeout(touch.timer);
                const wasActive = touch.active;
                const moved = touch.moved;
                touch = null;
                clearFeedback();
                dragged = null;
                if (restore && wasActive && moved) this.loadShoppingList();
            };
            element.addEventListener('pointerdown', event => {
                if (event.pointerType !== 'touch' || event.button !== 0) return;
                if (event.target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;
                touch = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false, moved: false, timer: null };
                touch.timer = window.setTimeout(() => {
                    if (!touch || touch.id !== event.pointerId) return;
                    touch.active = true;
                    dragged = element;
                    element.classList.add('dragging');
                    element.setPointerCapture?.(event.pointerId);
                }, 450);
            }, { passive: true });
            element.addEventListener('pointermove', event => {
                if (!touch || touch.id !== event.pointerId) return;
                if (!touch.active) {
                    if (Math.hypot(event.clientX - touch.x, event.clientY - touch.y) > 10) cancelTouch();
                    return;
                }
                event.preventDefault();
                touch.moved = placeDraggedAt(event.clientX, event.clientY) || touch.moved;
            }, { passive: false });
            element.addEventListener('pointerup', event => {
                if (!touch || touch.id !== event.pointerId) return;
                const shouldSave = touch.active && touch.moved;
                if (touch.active) event.preventDefault();
                cancelTouch();
                if (shouldSave) void this.saveShoppingOrder(container);
            }, { passive: false });
            element.addEventListener('pointercancel', () => {
                cancelTouch(true);
            });
        });
    }

    async saveShoppingOrder(container) {
        const visibleIds = [...container.querySelectorAll('.shopping-sortable')].map(item => Number(item.dataset.itemId));
        const visibleSet = new Set(visibleIds);
        let visibleIndex = 0;
        const itemIds = this.shoppingList.map(item => visibleSet.has(Number(item.id)) ? visibleIds[visibleIndex++] : Number(item.id));
        const previous = [...this.shoppingList];
        const byId = new Map(this.shoppingList.map(item => [Number(item.id), item]));
        this.shoppingList = itemIds.map(id => byId.get(id));
        try {
            const response = await fetch('/api/shopping-list/reorder', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemIds })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao salvar prioridades');
            this.loadShoppingList();
        } catch (error) {
            this.shoppingList = previous;
            this.loadShoppingList();
            console.error('Erro ao reordenar itens:', error);
            alert(error.message || 'Não foi possível salvar a nova ordem.');
        }
    }

    async toggleShoppingItem(itemId) {
        const item = this.shoppingList.find(item => Number(item.id) === Number(itemId));
        if (!item) return;
        const button = document.querySelector(`[data-shopping-toggle-id="${itemId}"]`);
        if (button) button.disabled = true;
        try {
            const response = await fetch(`/api/shopping-list/${itemId}/toggle`, { method: 'PATCH' });
            const data = await response.json();
            if (!response.ok || !data.success || typeof data.data?.purchased !== 'boolean') {
                throw new Error(data.error || 'Não foi possível atualizar o item');
            }
            item.purchased = data.data.purchased;
            this.loadShoppingList();
            this.updateDashboard();
        } catch (error) {
            console.error('Erro ao alternar item:', error);
            alert(error.message || 'Não foi possível atualizar o item.');
        } finally {
            if (button && button.isConnected) button.disabled = false;
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

    async loadRealCreditCards(cardsGrid) {
        document.getElementById('new-card-button').hidden = true;
        cardsGrid.innerHTML = '<p class="empty-state">Carregando cartões conectados…</p>';
        const dados = await this.connectedData();
        if (this.currentPage !== 'credit-cards') return;
        const cartoes = (dados?.contas || []).filter(conta => conta.tipo === 'CREDIT' && this.inSelectedBank(conta));
        if (!dados) { cardsGrid.innerHTML = '<p class="empty-state">Cartões conectados indisponíveis no momento.</p>'; return; }
        if (!cartoes.length) { cardsGrid.innerHTML = `<p class="empty-state">${this.bankSelection() ? 'Nenhum cartão de crédito nos bancos escolhidos.' : 'Nenhum cartão de crédito nas contas conectadas.'}</p>`; return; }
        cardsGrid.innerHTML = cartoes.map(cartao => this.realCardHtml(cartao)).join('');
        this.realTxBanks = new Map((dados.itens || []).map(item => [item.ref, item.banco]));
        cardsGrid.querySelectorAll('.real-card').forEach(elemento => {
            const cartao = cartoes.find(conta => conta.ref === elemento.dataset.conta);
            elemento.onclick = () => this.openRealCardModal(cartao, elemento);
            elemento.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.openRealCardModal(cartao, elemento); } };
        });
    }

    // Janela com as transações de um cartão conectado, mês a mês: compras, parcelas, estornos e pagamento da fatura.
    openRealCardModal(cartao, origem) {
        const hoje = new Date();
        this.realCard = { cartao, origem, ano: hoje.getFullYear(), mes: hoje.getMonth() };
        const modal = document.getElementById('real-card-modal');
        document.getElementById('real-card-title').textContent = `Transações · ${cartao.nome}`;
        const mudarMes = (delta) => { const d = new Date(this.realCard.ano, this.realCard.mes + delta, 1); this.realCard.ano = d.getFullYear(); this.realCard.mes = d.getMonth(); this.loadRealCardTransactions(); };
        document.getElementById('real-card-prev').onclick = () => mudarMes(-1);
        document.getElementById('real-card-next').onclick = () => mudarMes(1);
        document.getElementById('real-card-close').onclick = () => this.closeRealCardModal();
        modal.onclick = (event) => { if (event.target === modal) this.closeRealCardModal(); };
        modal.onkeydown = (event) => { if (event.key === 'Escape') this.closeRealCardModal(); };
        modal.style.display = 'block';
        document.getElementById('real-card-close').focus();
        this.loadRealCardTransactions();
    }

    closeRealCardModal() {
        document.getElementById('real-card-modal').style.display = 'none';
        this.realCard?.origem?.focus();
        this.realCard = null;
    }

    async loadRealCardTransactions() {
        const estado = this.realCard;
        if (!estado) return;
        const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const de = iso(new Date(estado.ano, estado.mes, 1)), ate = iso(new Date(estado.ano, estado.mes + 1, 0));
        const mes = new Date(estado.ano, estado.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        document.getElementById('real-card-month').textContent = mes.charAt(0).toUpperCase() + mes.slice(1);
        const lista = document.getElementById('real-card-list'), totais = document.getElementById('real-card-totals');
        lista.innerHTML = '<p class="empty-state">Carregando transações…</p>';
        totais.textContent = '';
        const chave = `${estado.cartao.ref}|${de}`;
        estado.chave = chave;
        const resposta = await fetch(`/api/pluggy/lancamentos?${new URLSearchParams({ de, ate, conta: estado.cartao.ref })}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
        if (this.realCard?.chave !== chave) return;
        const itens = resposta?.lancamentos;
        if (!itens) { lista.innerHTML = '<p class="empty-state">Transações indisponíveis no momento.</p>'; return; }
        const soma = (lista) => lista.reduce((total, item) => total + Math.round(item.valor * 100), 0) / 100;
        const compras = itens.filter(item => item.tipo === 'DEBIT' && !item.pagamentoFatura), creditos = itens.filter(item => item.tipo === 'CREDIT');
        totais.innerHTML = `<span>${compras.length} ${compras.length === 1 ? 'compra' : 'compras'}</span><span class="expense">Compras ${esc(FinanceCore.money(soma(compras)))}</span>${creditos.length ? `<span class="income">Pagamentos e estornos ${esc(FinanceCore.money(soma(creditos)))}</span>` : ''}`;
        if (!itens.length) { lista.innerHTML = '<p class="empty-state">Nenhuma transação neste mês.</p>'; return; }
        let html = '', diaAtual = '';
        for (const item of itens) {
            if (item.data !== diaAtual) { diaAtual = item.data; html += this.realTxDayHtml(item.data); }
            html += this.realTxRowHtml(item);
        }
        lista.innerHTML = html;
    }

    /** Próximo vencimento e fechamento do cartão: o dia do vencimento vem das faturas; o fechamento, da estimativa da sincronização. */
    cardCycle(c, hoje = new Date()) {
        const base = (c.faturas && c.faturas[0]?.vencimento) || c.vencimento;
        if (!base) return null;
        const diaVencimento = Number(base.slice(8, 10));
        const meiaNoite = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const vencimentoEm = (ano, mes) => new Date(ano, mes, Math.min(diaVencimento, new Date(ano, mes + 1, 0).getDate()));
        let vencimento = vencimentoEm(meiaNoite.getFullYear(), meiaNoite.getMonth());
        if (vencimento < meiaNoite) vencimento = vencimentoEm(meiaNoite.getFullYear(), meiaNoite.getMonth() + 1);
        const ciclo = { vencimento, diasRestantes: Math.round((vencimento - meiaNoite) / 86400000), fechamento: null, melhorDia: null, comprasDeHojeVencem: null, estimado: false };
        const dias = c.ciclo?.diasAntesDoVencimento;
        if (dias) {
            // Fechamento mais tarde possível (o intervalo vem das datas das compras); o melhor dia é o seguinte.
            const fechamentoDe = (data) => new Date(data.getFullYear(), data.getMonth(), data.getDate() - dias[0]);
            let fechamento = fechamentoDe(vencimento), vencimentoDaCompra = vencimento;
            if (fechamento < meiaNoite) { vencimentoDaCompra = vencimentoEm(vencimento.getFullYear(), vencimento.getMonth() + 1); fechamento = fechamentoDe(vencimentoDaCompra); }
            ciclo.fechamento = fechamento;
            ciclo.melhorDia = new Date(fechamento.getFullYear(), fechamento.getMonth(), fechamento.getDate() + 1).getDate();
            ciclo.comprasDeHojeVencem = vencimentoDaCompra;
            ciclo.estimado = dias[0] !== dias[1];
        }
        return ciclo;
    }

    realCardHtml(cartao) {
        const c = cartao.cartao || {};
        const dinheiro = (valor) => valor === null || valor === undefined ? '—' : esc(FinanceCore.money(valor));
        const dataCurta = (data) => data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const usadoValor = c.limite !== null && c.disponivel !== null ? c.limite - c.disponivel : cartao.saldo;
        const percentual = c.limite > 0 ? Math.min(100, Math.max(0, usadoValor / c.limite * 100)) : null;
        const nivel = percentual === null ? '' : percentual > 80 ? 'alto' : percentual > 50 ? 'medio' : 'baixo';
        const ciclo = this.cardCycle(c);
        const datas = ciclo ? `<div class="card-dates">
                <div><span>Próximo vencimento</span><strong>${dataCurta(ciclo.vencimento)}</strong><small>${ciclo.diasRestantes === 0 ? 'hoje' : ciclo.diasRestantes === 1 ? 'amanhã' : `em ${ciclo.diasRestantes} dias`}</small></div>
                <div><span>Melhor dia de compra</span>${ciclo.melhorDia ? `<strong>dia ${ciclo.melhorDia}</strong><small>fecha ${dataCurta(ciclo.fechamento)}${ciclo.estimado ? ' (estimado)' : ''} · compras de hoje vencem ${dataCurta(ciclo.comprasDeHojeVencem)}</small>` : '<strong>—</strong><small>o banco não informa o fechamento</small>'}</div>
            </div>` : '';
        return `<div class="card real-card" data-conta="${esc(cartao.ref)}" role="button" tabindex="0" aria-label="Ver transações de ${esc(cartao.nome)}">
            <div class="real-card-head"><h3>${esc(cartao.nome)}</h3>${this.lastBillHtml(c.faturas, dinheiro)}</div>
            <div class="card-limits">
                <div><span>Limite total</span><strong>${dinheiro(c.limite)}</strong></div>
                <div><span>Usado</span><strong>${dinheiro(usadoValor)}</strong></div>
                <div class="disponivel ${nivel}"><span>Disponível</span><strong>${dinheiro(c.disponivel)}</strong></div>
            </div>
            ${percentual === null ? '' : `<div class="card-usage ${nivel}" role="progressbar" aria-label="Limite usado" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(percentual)}"><div style="width:${percentual.toFixed(1)}%"></div></div><small class="card-usage-label">${Math.round(percentual)}% do limite usado</small>`}
            ${datas}
        </div>`;
    }

    // Selo da última fatura informada pelo banco (Open Finance), com a situação calculada na sincronização.
    lastBillHtml(faturas, dinheiro) {
        if (faturas === null || faturas === undefined) return '<span class="bill-badge neutro">Faturas não informadas</span>';
        if (!faturas.length) return '<span class="bill-badge neutro">Sem faturas</span>';
        const fatura = faturas[0];
        const vence = esc(fatura.vencimento.split('-').reverse().slice(0, 2).join('/'));
        const rotulo = { paga: '✓ Última fatura paga', parcial: 'Fatura paga em parte', vencida: 'Fatura vencida', em_aberto: 'Fatura em aberto' }[fatura.situacao] || 'Última fatura';
        const detalhe = fatura.situacao === 'parcial' ? `${dinheiro(fatura.pago)} de ${dinheiro(fatura.total)}` : `${dinheiro(fatura.total)} · ${vence}`;
        return `<span class="bill-badge ${esc(fatura.situacao || 'neutro')}" title="Mínimo ${fatura.minimo !== null ? dinheiro(fatura.minimo) : '—'}">${rotulo}<small>${detalhe}</small></span>`;
    }

    loadCreditCards() {
        const cardsGrid = document.querySelector('.cards-grid');
        if (this.hasConnectedAccounts()) return void this.loadRealCreditCards(cardsGrid);
        document.getElementById('new-card-button').hidden = false;
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
                        <button class="btn-small" onclick="event.stopPropagation(); importCardInvoice(${card.id})" title="Enviar fatura"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">upload</span></button>
                        <button class="btn-small" onclick="event.stopPropagation(); editCreditCard(${card.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                        <button class="btn-small btn-danger" onclick="event.stopPropagation(); deleteCreditCard(${card.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
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

        const budget = { category, amount, period };

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

        this.budgets.forEach(record => {
            const now = new Date();
            const budget = FinanceCore.budget(this, record, now.getFullYear(), now.getMonth()+1, now.getDate());
            const budgetElement = document.createElement('div');
            budgetElement.className = 'card';
            
            const remaining = budget.amount - budget.spent;
            const percentage = budget.percentage;
            const percentageClass = percentage > 100 ? 'expense' : percentage > 80 ? 'warning' : 'income';
            
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
                        <button class="btn-small" onclick="editBudget(${budget.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                        <button class="btn-small btn-danger" onclick="deleteBudget(${budget.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
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

    formatCurrency(value) {
        return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    getInstallmentDateAt(inst, index) {
        const rawStartDate = (inst.startDate || inst.start_date || '').split('T')[0];
        const startDate = rawStartDate ? new Date(rawStartDate + 'T00:00:00') : new Date();
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + index);
        return date;
    }

    formatMonthInputValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    formatDateInputValue(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    getDefaultInstallmentReferenceMonth() {
        return this.formatMonthInputValue(new Date(this.installmentViewYear, this.installmentViewMonth, 1));
    }

    calculateInstallmentStartDate(referenceMonthValue, referenceInstallment, paymentDay = 1) {
        if (!referenceMonthValue || !Number.isFinite(referenceInstallment) || referenceInstallment < 1) return '';
        const [year, month] = referenceMonthValue.split('-').map(Number);
        if (!Number.isFinite(year) || !Number.isFinite(month)) return '';

        const safeDay = Math.max(1, Math.min(Number(paymentDay) || 1, 31));
        const referenceDate = new Date(year, month - 1, 1);
        const maxReferenceDay = new Date(year, month, 0).getDate();
        referenceDate.setDate(Math.min(safeDay, maxReferenceDay));

        const startDate = new Date(referenceDate);
        startDate.setMonth(startDate.getMonth() - (referenceInstallment - 1));
        const maxStartDay = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        startDate.setDate(Math.min(safeDay, maxStartDay));
        return this.formatDateInputValue(startDate);
    }

    updateInstallmentStartFromReference() {
        const referenceMonthInput = document.getElementById('installment-reference-month');
        const paymentDayInput = document.getElementById('installment-payment-day');
        const currentInput = document.getElementById('installment-current');
        const startInput = document.getElementById('installment-start');
        if (!referenceMonthInput || !currentInput || !startInput) return;

        const referenceInstallment = parseInt(currentInput.value || '1', 10);
        const paymentDay = parseInt(paymentDayInput?.value || '1', 10);
        const startDate = this.calculateInstallmentStartDate(referenceMonthInput.value, referenceInstallment, paymentDay);
        if (startDate) startInput.value = startDate;
    }

    getInstallmentEntryForMonth(inst, month = this.installmentViewMonth, year = this.installmentViewYear) {
        const totalInstallments = Number(inst.totalInstallments || inst.total_installments || 0);
        const paidInstallments = Math.max(0, Math.min(Number(inst.currentInstallment ?? inst.current_installment ?? 0), totalInstallments));

        for (let index = 0; index < totalInstallments; index++) {
            const installmentDate = this.getInstallmentDateAt(inst, index);
            if (installmentDate.getMonth() !== month || installmentDate.getFullYear() !== year) continue;

            return {
                index,
                amount: this.getInstallmentAmountAt(inst, index),
                isPaid: index < paidInstallments,
                totalInstallments,
                paidInstallments,
                monthLabel: this.getInstallmentMonthLabel(inst, index)
            };
        }

        return null;
    }

    getInstallmentEntryKey(inst, entry, month = this.installmentViewMonth, year = this.installmentViewYear) {
        return `${inst.id}:${year}:${month}:${entry.index}`;
    }

    loadHiddenInstallmentEntries() {
        try {
            const parsed = JSON.parse(localStorage.getItem('hiddenInstallmentEntries') || '{}');
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    saveHiddenInstallmentEntries() {
        localStorage.setItem('hiddenInstallmentEntries', JSON.stringify(this.hiddenInstallmentEntries || {}));
    }

    isInstallmentEntryHidden(inst, entry, month = this.installmentViewMonth, year = this.installmentViewYear) {
        return Boolean(this.hiddenInstallmentEntries?.[this.getInstallmentEntryKey(inst, entry, month, year)]);
    }

    toggleInstallmentEntryHidden(id, index) {
        const inst = this.installments.find(item => Number(item.id) === Number(id));
        if (!inst) return;

        const entry = this.getInstallmentEntryForMonth(inst);
        if (!entry || Number(entry.index) !== Number(index)) return;

        const key = this.getInstallmentEntryKey(inst, entry);
        if (this.hiddenInstallmentEntries[key]) {
            delete this.hiddenInstallmentEntries[key];
        } else {
            this.hiddenInstallmentEntries[key] = true;
        }

        this.saveHiddenInstallmentEntries();
        this.loadInstallments();
    }

    sortInstallmentEntries(entries) {
        const byDescription = (a, b) => String(a.inst.description || '').localeCompare(String(b.inst.description || ''));
        const byCompletion = (a, b) => {
            const remainingA = Math.max(a.entry.totalInstallments - a.entry.paidInstallments, 0);
            const remainingB = Math.max(b.entry.totalInstallments - b.entry.paidInstallments, 0);
            return remainingA - remainingB || b.entry.paidInstallments - a.entry.paidInstallments || byDescription(a, b);
        };

        return entries.sort((a, b) => {
            switch (this.installmentSortMode) {
                case 'value-desc':
                    return b.entry.amount - a.entry.amount || byCompletion(a, b);
                case 'value-asc':
                    return a.entry.amount - b.entry.amount || byCompletion(a, b);
                case 'date-asc':
                    return this.getInstallmentDateAt(a.inst, a.entry.index) - this.getInstallmentDateAt(b.inst, b.entry.index) || byCompletion(a, b);
                case 'date-desc':
                    return this.getInstallmentDateAt(b.inst, b.entry.index) - this.getInstallmentDateAt(a.inst, a.entry.index) || byCompletion(a, b);
                case 'completion':
                default:
                    return byCompletion(a, b);
            }
        });
    }

    getInstallmentMonthSummary(month = this.installmentViewMonth, year = this.installmentViewYear) {
        const summary = { total: 0, paid: 0, pending: 0, count: 0, paidCount: 0, pendingCount: 0 };

        (this.installments || []).forEach(inst => {
            const entry = this.getInstallmentEntryForMonth(inst, month, year);
            if (!entry) return;
            if (this.isInstallmentEntryHidden(inst, entry, month, year)) return;

            summary.total += entry.amount;
            summary.count += 1;

            if (entry.isPaid) {
                summary.paid += entry.amount;
                summary.paidCount += 1;
            } else {
                summary.pending += entry.amount;
                summary.pendingCount += 1;
            }
        });

        return summary;
    }

    renderInstallmentMonthSummary() {
        const summaryElement = document.getElementById('installments-month-summary');
        if (!summaryElement) return;

        const summary = this.getInstallmentMonthSummary(this.installmentViewMonth, this.installmentViewYear);
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

        summaryElement.innerHTML = `
            <div class="installment-month-summary">
                <div>
                    <span class="summary-label">Total de parcelas em ${monthNames[this.installmentViewMonth]}/${this.installmentViewYear}</span>
                    <strong>${this.formatCurrency(summary.total)}</strong>
                    <small>${summary.count} parcela(s) no mês</small>
                </div>
                <div>
                    <span class="summary-label">Pago</span>
                    <strong class="summary-paid">${this.formatCurrency(summary.paid)}</strong>
                    <small>${summary.paidCount} parcela(s)</small>
                </div>
                <div>
                    <span class="summary-label">Pendente</span>
                    <strong class="summary-pending">${this.formatCurrency(summary.pending)}</strong>
                    <small>${summary.pendingCount} parcela(s)</small>
                </div>
            </div>
        `;
    }

    syncInstallmentTotals() {
        const countInput = document.getElementById('installment-count');
        const amountInput = document.getElementById('installment-amount');
        const customEnabled = document.getElementById('installment-custom-enabled');
        if (!countInput || !amountInput || customEnabled?.checked) return;

        const count = Number(countInput.value);
        const amount = Number(amountInput.value);
        if (!Number.isFinite(amount) || !Number.isFinite(count) || count <= 0) return;
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
        const amountInput = document.getElementById('installment-amount');
        const countInput = document.getElementById('installment-count');
        const customAmounts = this.getCustomInstallmentAmounts();
        if (!Array.isArray(customAmounts) || !amountInput || !countInput) return;

        const total = customAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
        const count = customAmounts.length || Number(countInput.value) || 0;
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

    getInstallmentGroupFor(inst) {
        const groupId = inst.installmentGroupId ?? inst.installment_group_id;
        if (!groupId) return null;
        return (this.installmentGroups || []).find(group => String(group.id) === String(groupId)) || {
            id: groupId,
            name: inst.groupName || inst.group_name || 'Grupo removido',
            dueDay: inst.groupDueDay ?? inst.group_due_day ?? null
        };
    }

    getInstallmentGroupLabel(group) {
        if (!group) return 'Sem grupo';
        const dueDay = group.dueDay ?? group.due_day;
        return dueDay ? `${group.name} · vence dia ${dueDay}` : group.name;
    }

    populateInstallmentGroupSelect(selectedId = '') {
        const select = document.getElementById('installment-group');
        if (!select) return;

        select.innerHTML = '<option value="">Sem grupo</option>';
        (this.installmentGroups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = this.getInstallmentGroupLabel(group);
            select.appendChild(option);
        });
        // Seleção explícita após montar as opções
        select.value = String(selectedId ?? '');
        if (select.value !== String(selectedId ?? '')) select.value = '';
    }

    populateInstallmentGroupFilter() {
        const select = document.getElementById('installment-group-filter');
        if (!select) return;

        const currentValue = this.installmentGroupFilter || 'all';
        select.innerHTML = `
            <option value="all">Todos os grupos</option>
            <option value="none">Sem grupo</option>
        `;

        (this.installmentGroups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = String(group.id);
            option.textContent = this.getInstallmentGroupLabel(group);
            select.appendChild(option);
        });

        const hasValue = Array.from(select.options).some(option => option.value === currentValue);
        this.installmentGroupFilter = hasValue ? currentValue : 'all';
        select.value = this.installmentGroupFilter;
        localStorage.setItem('installmentGroupFilter', this.installmentGroupFilter);
    }

    filterInstallmentEntriesByGroup(entries) {
        const selectedGroup = this.installmentGroupFilter || 'all';
        if (selectedGroup === 'all') return entries;

        return (entries || []).filter(({ inst }) => {
            const groupId = inst.installmentGroupId ?? inst.installment_group_id ?? '';
            if (selectedGroup === 'none') return !groupId;
            return String(groupId) === String(selectedGroup);
        });
    }

    renderInstallmentGroupsManager() {
        const container = document.getElementById('installment-groups-manager');
        if (!container) return;
        container.innerHTML = '';
    }

    renderInstallmentGroupsView(list) {
        const groups = this.installmentGroups || [];
        const wrapper = document.createElement('div');
        wrapper.className = 'installment-groups-manager';

        const header = document.createElement('div');
        header.className = 'installment-groups-header';
        header.innerHTML = `
            <div>
                <h3>Grupos de Parcelamento</h3>
                <p>Edite os grupos desta conta sem misturar com a lista de parcelamentos.</p>
            </div>
            <button class="btn" onclick="createInstallmentGroup()"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">add</span> Novo grupo</button>
        `;
        wrapper.appendChild(header);

        if (groups.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'installment-groups-empty';
            empty.textContent = 'Nenhum grupo nesta conta.';
            wrapper.appendChild(empty);
            list.appendChild(wrapper);
            this.refreshIcons();
            return;
        }

        groups.forEach(group => {
            const dueDay = group.dueDay ?? group.due_day ?? '';
            const description = group.description ?? '';
            const count = (this.installments || []).filter(inst => String(inst.installmentGroupId ?? inst.installment_group_id ?? '') === String(group.id)).length;
            const card = document.createElement('div');
            card.className = 'installment-group-editor';
            card.dataset.groupId = group.id;
            card.innerHTML = `
                <div class="installment-group-editor-header">
                    <div class="installment-group-title-block">
                        <span class="installment-group-icon"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">folder_managed</span></span>
                        <div>
                            <h3>${esc(group.name || 'Grupo sem nome')}</h3>
                            <p>${count} parcelamento(s) neste grupo</p>
                        </div>
                    </div>
                    <div class="installment-group-badges">
                        <span class="installment-group-due-badge">${dueDay ? `Vence dia ${dueDay}` : 'Sem vencimento'}</span>
                    </div>
                </div>
                <div class="installment-group-form-grid">
                    <label class="installment-group-field">Nome
                        <input type="text" data-group-field="name" value="${esc(group.name || '')}">
                    </label>
                    <label class="installment-group-field installment-group-field-small">Vencimento
                        <input type="number" data-group-field="dueDay" min="1" max="31" value="${dueDay}" placeholder="1-31">
                    </label>
                    <label class="installment-group-field">Descrição
                        <input type="text" data-group-field="description" value="${esc(description)}">
                    </label>
                </div>
                <div class="installment-group-actions">
                    <button class="btn-small" onclick="saveInstallmentGroup(${group.id})" title="Salvar grupo"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">save</span> Salvar alterações</button>
                    <button class="btn-small btn-danger" onclick="deleteInstallmentGroup(${group.id})" title="Excluir grupo"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span> Excluir</button>
                </div>
            `;
            wrapper.appendChild(card);
        });

        list.appendChild(wrapper);
        this.refreshIcons();
    }

    getInstallmentGroupFormData(groupId) {
        const row = document.querySelector(`.installment-group-editor[data-group-id="${groupId}"]`);
        if (!row) return null;
        const name = row.querySelector('[data-group-field="name"]')?.value.trim() || '';
        const dueValue = row.querySelector('[data-group-field="dueDay"]')?.value.trim() || '';
        const description = row.querySelector('[data-group-field="description"]')?.value.trim() || '';
        const dueDay = dueValue ? parseInt(dueValue, 10) : null;
        if (!name) {
            alert('Nome do grupo é obrigatório.');
            return null;
        }
        if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
            alert('Dia de vencimento inválido. Use um número de 1 a 31.');
            return null;
        }
        return { name, dueDay, description };
    }

    groupInstallmentEntries(entries) {
        const groupMap = new Map();
        entries.forEach(item => {
            const group = this.getInstallmentGroupFor(item.inst);
            const key = group ? String(group.id) : 'none';
            if (!groupMap.has(key)) groupMap.set(key, { group, entries: [] });
            groupMap.get(key).entries.push(item);
        });

        return Array.from(groupMap.values()).sort((a, b) => {
            const dueA = a.group?.dueDay ?? a.group?.due_day ?? 99;
            const dueB = b.group?.dueDay ?? b.group?.due_day ?? 99;
            if (dueA !== dueB) return dueA - dueB;
            return this.getInstallmentGroupLabel(a.group).localeCompare(this.getInstallmentGroupLabel(b.group));
        });
    }

    getPayableInstallmentEntries(entries) {
        return (entries || []).filter(({ inst, entry }) => {
            if (!inst || !entry || entry.isPaid) return false;
            const total = Number(inst.totalInstallments || inst.total_installments || 0);
            const paid = Math.max(0, Math.min(Number(inst.currentInstallment ?? inst.current_installment ?? 0), total));
            return paid < total && entry.index === paid;
        });
    }

    renderInstallmentGroupHeader(group, entries) {
        const visibleEntries = entries.filter(({ inst, entry }) => !this.isInstallmentEntryHidden(inst, entry));
        const monthTotal = visibleEntries.reduce((sum, { entry }) => sum + Number(entry.amount || 0), 0);
        const activeCount = entries.filter(({ inst }) => {
            const total = Number(inst.totalInstallments || inst.total_installments || 0);
            const paid = Number(inst.currentInstallment ?? inst.current_installment ?? 0);
            return paid < total;
        }).length;
        const payableCount = this.getPayableInstallmentEntries(entries).length;
        const groupKey = group ? String(group.id) : 'none';
        const header = document.createElement('div');
        header.className = 'installment-group-header';
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin:16px 0 12px;padding:12px;border-radius:12px;background:rgba(102,126,234,.10);';
        header.innerHTML = `
            <div>
                <h3 style="margin:0;">${esc(this.getInstallmentGroupLabel(group))}</h3>
                <p style="margin:4px 0 0;color:var(--muted);font-size:13px;">${entries.length} parcela(s) no mês · ${activeCount} parcelamento(s) ativo(s)</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                <div style="text-align:right;">
                    <strong>${this.formatCurrency(monthTotal)}</strong><br>
                    <span style="font-size:12px;color:var(--muted);">Total visível do mês</span>
                </div>
                <button class="btn-small" onclick="markInstallmentGroupPaid('${groupKey}')" ${payableCount === 0 ? 'disabled' : ''} title="Marcar parcelas pendentes deste grupo como pagas no mês selecionado">
                    <span class="material-symbols-rounded lucide-icon" aria-hidden="true">done_all</span> Pagar grupo${payableCount ? ` (${payableCount})` : ''}
                </button>
            </div>
        `;
        return header;
    }

    renderInstallmentsSummaryView(list) {
        const entries = this.filterInstallmentEntriesByGroup((this.installments || [])
            .map(inst => ({ inst, entry: this.getInstallmentEntryForMonth(inst) }))
            .filter(item => item.entry));

        if (entries.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhum parcelamento para o mês selecionado</p>';
            return;
        }

        this.sortInstallmentEntries(entries);

        this.groupInstallmentEntries(entries).forEach(({ group, entries }) => {
            list.appendChild(this.renderInstallmentGroupHeader(group, entries));
            entries.forEach(({ inst, entry }) => {
            const isHidden = this.isInstallmentEntryHidden(inst, entry);
            const item = document.createElement('div');
            item.className = `installment-summary-row ${isHidden ? 'is-hidden-from-total' : ''}`;
            item.innerHTML = `
                <div>
                    <h4>${esc(inst.description)}</h4>
                    <small>Parcela ${entry.index + 1} de ${entry.totalInstallments} - ${entry.monthLabel}</small>
                </div>
                <div class="installment-summary-actions">
                    <div class="installment-summary-value">
                        <strong>${this.formatCurrency(entry.amount)}</strong>
                        <span class="${entry.isPaid ? 'paid' : 'pending'}">${entry.isPaid ? 'Paga' : 'Pendente'}</span>
                    </div>
                    <div class="installment-summary-buttons">
                        ${!entry.isPaid && entry.index === Math.max(0, Math.min(Number(inst.currentInstallment ?? inst.current_installment ?? 0), Number(inst.totalInstallments || inst.total_installments || 0))) ? `<button class="btn-small" onclick="markInstallmentPaid(${inst.id}, ${entry.index})" title="Marcar parcela como paga" aria-label="Marcar parcela como paga"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">check</span></button>` : ''}
                        <button class="btn-small installment-visibility-btn ${isHidden ? 'muted' : ''}" onclick="toggleInstallmentEntryHidden(${inst.id}, ${entry.index})" title="${isHidden ? 'Incluir na soma do mês' : 'Remover da soma do mês'}" aria-label="${isHidden ? 'Incluir na soma do mês' : 'Remover da soma do mês'}">
                            <span class="material-symbols-rounded lucide-icon" aria-hidden="true">${isHidden ? 'visibility_off' : 'visibility'}</span>
                        </button>
                        <button class="btn-small" onclick="editInstallment(${inst.id})" title="Editar" aria-label="Editar parcelamento">
                            <span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span>
                        </button>
                        <button class="btn-small btn-danger" onclick="deleteInstallment(${inst.id})" title="Excluir" aria-label="Excluir parcelamento">
                            <span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span>
                        </button>
                    </div>
                </div>
            `;
            list.appendChild(item);
            });
        });
        this.refreshIcons();
    }

    loadInstallments() {
        const list = document.getElementById('installments-list');
        list.innerHTML = '';
        this.populateInstallmentGroupFilter();
        this.renderInstallmentGroupsManager();
        this.renderInstallmentMonthSummary();

        if (this.installments.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhum parcelamento cadastrado</p>';
            return;
        }

        if (this.installmentViewMode === 'groups') {
            this.renderInstallmentGroupsView(list);
            return;
        }

        if (this.installmentViewMode === 'summary') {
            this.renderInstallmentsSummaryView(list);
            return;
        }

        const entries = this.filterInstallmentEntriesByGroup([...this.installments]
            .map(inst => ({ inst, entry: this.getInstallmentEntryForMonth(inst) }))
            .filter(item => item.entry));

        if (entries.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhum parcelamento para o mês selecionado</p>';
            return;
        }

        const sortedEntries = this.sortInstallmentEntries(entries);

        this.groupInstallmentEntries(sortedEntries).forEach(({ group, entries }) => {
            list.appendChild(this.renderInstallmentGroupHeader(group, entries));
            entries.forEach(({ inst, entry }) => {
            const totalInstallments = inst.totalInstallments || inst.total_installments || 0;
            const currentInstallment = Number(inst.currentInstallment ?? inst.current_installment ?? 0);
            const paidInstallments = Math.max(0, Math.min(currentInstallment, totalInstallments));
            const remaining = Math.max(totalInstallments - paidInstallments, 0);
            const progress = totalInstallments > 0 ? (paidInstallments / totalInstallments) * 100 : 0;
            const remainingAmount = this.sumInstallmentAmounts(inst, paidInstallments, totalInstallments);
            const paidAmount = this.sumInstallmentAmounts(inst, 0, paidInstallments);
            const isCompleted = paidInstallments >= totalInstallments;
            const selectedIndex = entry.index;
            const selectedMonthLabel = entry.monthLabel;
            const rawDisplayIndex = this.installmentPreviewIndexes[inst.id] ?? selectedIndex;
            const displayIndex = Math.max(0, Math.min(Number(rawDisplayIndex), totalInstallments - 1));
            const displayAmount = this.getInstallmentAmountAt(inst, displayIndex);
            const displayMonthLabel = this.getInstallmentMonthLabel(inst, displayIndex);
            const displayIsPaid = displayIndex < paidInstallments;
            const displayIsNextPayable = !isCompleted && displayIndex === paidInstallments;
            const displayStatusLabel = displayIsPaid ? 'Parcela paga' : (displayIsNextPayable ? 'Valor a pagar' : 'Valor da parcela');
            const displayProgress = displayIsPaid
                ? Math.max(progress, totalInstallments > 0 ? ((displayIndex + 1) / totalInstallments) * 100 : 0)
                : progress;
            const paymentAction = displayIsPaid
                ? '<span class="installment-paid-label"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">check_circle</span> Parcela paga</span>'
                : displayIsNextPayable
                    ? `<button class="btn installment-pay-button" onclick="markInstallmentPaid(${inst.id}, ${displayIndex})"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">check</span> Marcar Parcela como Paga</button>`
                    : !isCompleted
                        ? '<span class="installment-paid-label installment-waiting-label">Pague as parcelas anteriores primeiro</span>'
                        : '';
            const isHidden = this.isInstallmentEntryHidden(inst, entry);

            // Mês de referência da próxima parcela
            const startDate = new Date((inst.startDate || inst.start_date || '').split('T')[0] + 'T00:00:00');
            const monthNames = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
            const currentMonthLabel = monthNames[startDate.getMonth()] + '/' + startDate.getFullYear();

            const item = document.createElement('div');
            item.className = `card installment-card ${isHidden ? 'is-hidden-from-total' : ''}`;
            item.innerHTML = `
                <div class="installment-card-header">
                    <div>
                        <h3>${esc(inst.description)}</h3>
                        <span class="installment-card-category">${esc(inst.category)}</span>
                    </div>
                    <div class="installment-card-top-actions">
                        <span class="installment-status-badge ${isCompleted ? 'completed' : 'active'}">
                            ${isCompleted ? 'Concluído' : 'Em andamento'}
                        </span>
                        <div class="installment-action-buttons">
                            <button class="btn-small installment-visibility-btn ${isHidden ? 'muted' : ''}" onclick="toggleInstallmentEntryHidden(${inst.id}, ${entry.index})" title="${isHidden ? 'Incluir na soma do mês' : 'Remover da soma do mês'}" aria-label="${isHidden ? 'Incluir na soma do mês' : 'Remover da soma do mês'}"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">${isHidden ? 'visibility_off' : 'visibility'}</span></button>
                            <button class="btn-small" onclick="editInstallment(${inst.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                            <button class="btn-small btn-danger" onclick="deleteInstallment(${inst.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
                        </div>
                    </div>
                </div>
                <div class="installment-card-main">
                    <div class="installment-card-details">
                        <div class="installment-info-grid">
                            <span><strong>Pagas</strong>${paidInstallments} de ${totalInstallments}</span>
                            <span><strong>Restantes</strong>${remaining}</span>
                            <span><strong>Início</strong>${currentMonthLabel}</span>
                            <span><strong>Mês em foco</strong>${selectedMonthLabel}</span>
                            <span><strong>Valor pago</strong>R$ ${paidAmount.toFixed(2)}</span>
                            <span><strong>Valor restante</strong>R$ ${remainingAmount.toFixed(2)}</span>
                        </div>
                    </div>
                    <div class="installment-card-actions">
                        <div class="installment-focus">
                            <div class="installment-focus-label">${displayStatusLabel}</div>
                            <div class="installment-focus-row">
                                <button class="installment-preview-btn" onclick="app.changeInstallmentPreview(${inst.id}, -1)" ${displayIndex <= 0 ? 'disabled' : ''} aria-label="Parcela anterior">
                                    <span class="material-symbols-rounded lucide-icon" aria-hidden="true">chevron_left</span>
                                </button>
                                <div class="installment-focus-value ${displayIsPaid ? 'paid' : ''}">R$ ${displayAmount.toFixed(2)}</div>
                                <button class="installment-preview-btn" onclick="app.changeInstallmentPreview(${inst.id}, 1)" ${displayIndex >= totalInstallments - 1 ? 'disabled' : ''} aria-label="Próxima parcela">
                                    <span class="material-symbols-rounded lucide-icon" aria-hidden="true">chevron_right</span>
                                </button>
                            </div>
                            <div class="installment-focus-meta">Parcela ${displayIndex + 1} de ${totalInstallments} - ${displayMonthLabel}</div>
                        </div>
                    </div>
                </div>
                <div class="installment-progress-block">
                    <div class="installment-progress-track">
                        <div class="installment-progress-fill ${displayIsPaid ? 'has-paid' : 'pending-month'}" style="width: ${displayProgress}%;"></div>
                    </div>
                    <p>${displayIsPaid ? 'Parcela visualizada paga' : `${progress.toFixed(0)}% pago até o momento`}</p>
                </div>
                ${paymentAction}
            `;
            list.appendChild(item);
            });
        });
        this.refreshIcons();
    }

    onSubscriptionGroupFilterChange() {
        const groupSelect = document.getElementById('subscription-group-filter');
        this.subscriptionGroupFilter = groupSelect?.value || 'all';
        localStorage.setItem('subscriptionGroupFilter', this.subscriptionGroupFilter);
        this.loadSubscriptions();
    }

    onSubscriptionStatusFilterChange() {
        const statusSelect = document.getElementById('subscription-status-filter');
        this.subscriptionStatusFilter = statusSelect?.value || 'all';
        this.loadSubscriptions();
    }

    onSubscriptionViewChange() {
        const monthSelect = document.getElementById('subscription-view-month');
        const yearSelect = document.getElementById('subscription-view-year');
        if (monthSelect) this.subscriptionViewMonth = parseInt(monthSelect.value);
        if (yearSelect) this.subscriptionViewYear = parseInt(yearSelect.value);

        // Filtro de status é específico do mês visualizado: nunca atravessa meses
        this.subscriptionStatusFilter = 'all';
        const statusSelect = document.getElementById('subscription-status-filter');
        if (statusSelect) statusSelect.value = 'all';

        this.loadSubscriptions();
    }

    getSubscriptionGroupsFor() {
        return this.subscriptionGroups || [];
    }

    getSubscriptionGroupFor(sub) {
        const groupId = sub.subscriptionGroupId ?? sub.subscription_group_id;
        if (!groupId) return null;
        return (this.subscriptionGroups || []).find(group => String(group.id) === String(groupId)) || {
            id: groupId,
            name: 'Grupo removido'
        };
    }

    filterSubscriptionsByGroup(subs) {
        const selectedGroup = this.subscriptionGroupFilter || 'all';
        if (selectedGroup === 'all') return subs;
        return subs.filter(sub => {
            const groupId = sub.subscriptionGroupId ?? sub.subscription_group_id ?? '';
            if (selectedGroup === 'none') return !groupId;
            return String(groupId) === String(selectedGroup);
        });
    }

    filterSubscriptionsByStatus(subs) {
        const selectedStatus = this.subscriptionStatusFilter || 'all';
        if (selectedStatus === 'all') return subs;
        return subs.filter(sub => {
            const paid = this.isSubscriptionPaidInMonth(sub, this.subscriptionViewYear, this.subscriptionViewMonth);
            return selectedStatus === 'paid' ? paid : !paid;
        });
    }

    populateSubscriptionGroupFilter() {
        const select = document.getElementById('subscription-group-filter');
        if (!select) return;
        const currentValue = this.subscriptionGroupFilter || 'all';

        select.innerHTML = '<option value="all">Todos os grupos</option><option value="none">Sem grupo</option>';
        (this.subscriptionGroups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = String(group.id);
            option.textContent = group.name || `Grupo ${group.id}`;
            select.appendChild(option);
        });

        const hasValue = Array.from(select.options).some(option => option.value === currentValue);
        this.subscriptionGroupFilter = hasValue ? currentValue : 'all';
        select.value = this.subscriptionGroupFilter;
        localStorage.setItem('subscriptionGroupFilter', this.subscriptionGroupFilter);
    }

    populateSubscriptionGroupSelect(selectedId = '') {
        const select = document.getElementById('subscription-group');
        if (!select) return;

        select.innerHTML = '<option value="">Sem grupo</option>';
        (this.subscriptionGroups || []).forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name || `Grupo ${group.id}`;
            select.appendChild(option);
        });
        // Seleção explícita após montar as opções
        select.value = String(selectedId ?? '');
        if (select.value !== String(selectedId ?? '')) select.value = '';
    }

    setSubscriptionViewMode(mode) {
        this.subscriptionViewMode = mode === 'groups' ? 'groups' : 'list';
        this.updateSubscriptionViewButtons();
        this.loadSubscriptions();
    }

    updateSubscriptionViewButtons() {
        document.querySelectorAll('[data-subscription-mode]').forEach(button => {
            const isActive = button.dataset.subscriptionMode === this.subscriptionViewMode;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
    }

    renderSubscriptionGroupsView(list) {
        const groups = this.subscriptionGroups || [];
        const wrapper = document.createElement('div');
        wrapper.className = 'installment-groups-manager';

        const header = document.createElement('div');
        header.className = 'installment-groups-header';
        header.innerHTML = `
            <div>
                <h3>Grupos de Assinaturas</h3>
                <p>Edite os grupos desta conta sem misturar com a lista de assinaturas.</p>
            </div>
            <button class="btn" onclick="createSubscriptionGroup()"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">add</span> Novo grupo</button>
        `;
        wrapper.appendChild(header);

        if (groups.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'installment-groups-empty';
            empty.textContent = 'Nenhum grupo nesta conta.';
            wrapper.appendChild(empty);
            list.appendChild(wrapper);
            this.refreshIcons();
            return;
        }

        groups.forEach(group => {
            const description = group.description ?? '';
            const count = (this.subscriptions || []).filter(sub => String(sub.subscriptionGroupId ?? sub.subscription_group_id ?? '') === String(group.id)).length;
            const card = document.createElement('div');
            card.className = 'installment-group-editor';
            card.dataset.groupId = group.id;
            card.innerHTML = `
                <div class="installment-group-editor-header">
                    <div class="installment-group-title-block">
                        <span class="installment-group-icon"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">folder_managed</span></span>
                        <div>
                            <h3>${esc(group.name || 'Grupo sem nome')}</h3>
                            <p>${count} assinatura(s) neste grupo</p>
                        </div>
                    </div>
                    <div class="installment-group-badges">
                        ${description ? `<span class="installment-group-due-badge">${esc(description)}</span>` : ''}
                    </div>
                </div>
                <div class="installment-group-form-grid">
                    <label class="installment-group-field">Nome
                        <input type="text" data-subscription-group-field="name" value="${esc(group.name || '')}">
                    </label>
                    <label class="installment-group-field">Descrição
                        <input type="text" data-subscription-group-field="description" value="${esc(description)}">
                    </label>
                </div>
                <div class="installment-group-actions">
                    <button class="btn-small" onclick="saveSubscriptionGroup(${group.id})" title="Salvar grupo"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">save</span> Salvar alterações</button>
                    <button class="btn-small btn-danger" onclick="deleteSubscriptionGroup(${group.id})" title="Excluir grupo"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span> Excluir</button>
                </div>
            `;
            wrapper.appendChild(card);
        });

        list.appendChild(wrapper);
        this.refreshIcons();
    }

    getSubscriptionGroupFormData(groupId) {
        const row = document.querySelector(`.installment-group-editor[data-group-id="${groupId}"]`);
        if (!row) return null;
        const name = row.querySelector('[data-subscription-group-field="name"]')?.value.trim() || '';
        const description = row.querySelector('[data-subscription-group-field="description"]')?.value.trim() || '';
        if (!name) {
            alert('Nome do grupo é obrigatório.');
            return null;
        }
        return { name, description };
    }

    async reloadSubscriptionsAndGroups() {
        const [subsResponse, groupsResponse] = await Promise.all([
            fetch('/api/goals'),
            fetch('/api/goals/groups')
        ]);
        const subsData = await subsResponse.json();
        const groupsData = await groupsResponse.json();
        if (subsData.success) this.subscriptions = (subsData.data || []).filter(g => g.category !== 'Dívida');
        if (groupsData.success) this.subscriptionGroups = groupsData.data || [];
    }

    async createSubscriptionGroup() {
        const name = prompt('Nome do grupo de assinaturas:', '');
        if (!name || !name.trim()) return;
        const description = prompt('Descrição do grupo (opcional). Pode deixar vazio:', '');

        try {
            const response = await fetch('/api/goals/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), description: description?.trim() || null })
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao criar grupo');
                return;
            }
            await this.reloadSubscriptionsAndGroups();
            this.populateSubscriptionGroupSelect(data.data?.id);
            this.populateSubscriptionGroupFilter();
            this.loadSubscriptions();
        } catch (error) {
            console.error('Erro ao criar grupo:', error);
        }
    }

    async saveSubscriptionGroup(groupId) {
        const payload = this.getSubscriptionGroupFormData(groupId);
        if (!payload) return;

        try {
            const response = await fetch(`/api/goals/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao atualizar grupo');
                return;
            }
            await this.reloadSubscriptionsAndGroups();
            this.populateSubscriptionGroupFilter();
            this.loadSubscriptions();
        } catch (error) {
            console.error('Erro ao atualizar grupo:', error);
            alert('Erro ao atualizar grupo');
        }
    }

    async deleteSubscriptionGroup(groupId) {
        const group = (this.subscriptionGroups || []).find(item => String(item.id) === String(groupId));
        const label = group ? group.name : 'este grupo';
        if (!confirm(`Excluir o grupo "${label}"? As assinaturas dele serão movidas para Sem grupo.`)) return;

        try {
            const response = await fetch(`/api/goals/groups/${groupId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao excluir grupo');
                return;
            }
            await this.reloadSubscriptionsAndGroups();
            this.populateSubscriptionGroupSelect();
            this.populateSubscriptionGroupFilter();
            this.loadSubscriptions();
        } catch (error) {
            console.error('Erro ao excluir grupo:', error);
            alert('Erro ao excluir grupo');
        }
    }

    getSubscriptionGroupLabel(group) {
        if (!group) return 'Sem grupo';
        return group.name || `Grupo ${group.id}`;
    }

    isSubscriptionPaidInMonth(sub, year, month) {
        return (this.transactions || []).some(t => {
            const d = new Date(t.date);
            return t.description === sub.name + ' (Assinatura)'
                && d.getMonth() === month
                && d.getFullYear() === year;
        });
    }

    isSubscriptionPaidThisMonth(sub) {
        const now = new Date();
        return this.isSubscriptionPaidInMonth(sub, now.getFullYear(), now.getMonth());
    }

    // Datas "YYYY-MM-DD" devem ser interpretadas como dia civil local,
    // nunca via new Date() direto (que aplica fuso UTC e pula um dia/mês)
    parseSubscriptionDate(value) {
        if (typeof value === 'string') {
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        }
        const date = new Date(value);
        return date;
    }

    isSubscriptionActiveInMonth(sub, year, month) {
        const targetIndex = year * 12 + month;
        const startValue = sub.startDate ?? sub.start_date;
        const endValue = sub.endDate ?? sub.end_date;

        if (startValue) {
            const start = this.parseSubscriptionDate(startValue);
            if (!Number.isNaN(start.getTime()) && (start.getFullYear() * 12 + start.getMonth()) > targetIndex) return false;
        }
        if (endValue) {
            const end = this.parseSubscriptionDate(endValue);
            if (!Number.isNaN(end.getTime()) && (end.getFullYear() * 12 + end.getMonth()) < targetIndex) return false;
        }
        return true;
    }

    formatSubscriptionDate(value) {
        const date = this.parseSubscriptionDate(value);
        if (!date || Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleDateString('pt-BR');
    }

    groupSubscriptions(subs) {
        const groupMap = new Map();
        (subs || []).forEach(sub => {
            const group = this.getSubscriptionGroupFor(sub);
            const key = group ? String(group.id) : 'none';
            if (!groupMap.has(key)) groupMap.set(key, { group, subs: [] });
            groupMap.get(key).subs.push(sub);
        });

        return Array.from(groupMap.values()).sort((a, b) => (
            this.getSubscriptionGroupLabel(a.group).localeCompare(this.getSubscriptionGroupLabel(b.group))
        ));
    }

    renderSubscriptionGroupHeader(group, subs) {
        const viewMonth = this.subscriptionViewMonth;
        const viewYear = this.subscriptionViewYear;
        const monthTotal = subs.reduce((sum, sub) => sum + Number(sub.targetAmount || sub.target_amount || 0), 0);
        const paidCount = subs.filter(sub => this.isSubscriptionPaidInMonth(sub, viewYear, viewMonth)).length;
        const pendingCount = subs.length - paidCount;
        const groupKey = group ? String(group.id) : 'none';
        const header = document.createElement('div');
        header.className = 'installment-group-header';
        header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:12px;margin:16px 0 12px;padding:12px;border-radius:12px;background:rgba(102,126,234,.10);';
        header.innerHTML = `
            <div>
                <h3 style="margin:0;">${esc(this.getSubscriptionGroupLabel(group))}</h3>
                <p style="margin:4px 0 0;color:var(--muted);font-size:13px;">${subs.length} assinatura(s) · ${paidCount} paga(s) em ${String(viewMonth + 1).padStart(2, '0')}/${viewYear}</p>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                <div style="text-align:right;">
                    <strong>${this.formatCurrency(monthTotal)}</strong><br>
                    <span style="font-size:12px;color:var(--muted);">Total mensal do grupo</span>
                </div>
                <button class="btn-small" onclick="paySubscriptionGroup('${groupKey}')" ${pendingCount === 0 ? 'disabled' : ''} title="Marcar as assinaturas pendentes deste grupo como pagas no mês selecionado">
                    <span class="material-symbols-rounded lucide-icon" aria-hidden="true">done_all</span> Pagar grupo${pendingCount ? ` (${pendingCount})` : ''}
                </button>
            </div>
        `;
        return header;
    }

    async paySubscriptionGroup(groupKey) {
        const viewMonth = this.subscriptionViewMonth;
        const viewYear = this.subscriptionViewYear;
        const now = new Date();
        const isCurrentViewMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
        const payDate = isCurrentViewMonth ? '' : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;

        const pending = (this.subscriptions || []).filter(sub => {
            const group = this.getSubscriptionGroupFor(sub);
            const inGroup = groupKey === 'none' ? !group : (!!group && String(group.id) === groupKey);
            return inGroup
                && this.isSubscriptionActiveInMonth(sub, viewYear, viewMonth)
                && !this.isSubscriptionPaidInMonth(sub, viewYear, viewMonth);
        });
        if (pending.length === 0) return;
        if (!confirm(`Marcar ${pending.length} assinatura(s) deste grupo como pagas em ${String(viewMonth + 1).padStart(2, '0')}/${viewYear}?`)) return;

        let failures = 0;
        for (const sub of pending) {
            try {
                const response = await fetch(`/api/goals/${sub.id}/mark-paid`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payDate ? { date: payDate } : {})
                });
                const data = await response.json();
                if (!data.success) failures++;
            } catch (error) {
                console.error('Erro ao marcar assinatura como paga:', error);
                failures++;
            }
        }

        const txResponse = await fetch('/api/transactions');
        const txData = await txResponse.json();
        this.transactions = txData.data || [];
        this.loadSubscriptions();
        this.updateDashboard();

        if (failures > 0) alert(`${failures} assinatura(s) não puderam ser marcadas como pagas.`);
    }

    async cancelSubscription(id) {
        const sub = (this.subscriptions || []).find(s => s.id == id);
        if (!sub) return;

        const currentEnd = sub.endDate ?? sub.end_date ?? null;
        const cancelling = !currentEnd;
        const actionLabel = cancelling ? 'cancelar' : 'reativar';
        if (!confirm(`Deseja ${actionLabel} a assinatura "${sub.name}"?`)) return;

        const payload = {
            name: sub.name,
            targetAmount: sub.targetAmount || sub.target_amount || 0,
            currentAmount: sub.currentAmount ?? sub.current_amount ?? 0,
            category: sub.category,
            targetDate: sub.targetDate || sub.target_date || '2026-12-31',
            subscriptionGroupId: sub.subscriptionGroupId ?? sub.subscription_group_id ?? null,
            paymentDay: sub.paymentDay ?? sub.payment_day ?? null,
            startDate: sub.startDate ?? sub.start_date ?? null,
            // Cancelar encerra na data de hoje; reativar remove o término
            endDate: cancelling ? new Date().toISOString().split('T')[0] : null
        };

        try {
            const response = await fetch(`/api/goals/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || `Erro ao ${actionLabel} assinatura`);
                return;
            }
            const idx = this.subscriptions.findIndex(s => s.id == id);
            if (idx !== -1) this.subscriptions[idx] = { ...this.subscriptions[idx], ...payload };
            this.loadSubscriptions();
        } catch (error) {
            console.error(`Erro ao ${actionLabel} assinatura:`, error);
            alert(`Erro ao ${actionLabel} assinatura`);
        }
    }

    loadSubscriptions() {
        const list = document.getElementById('subscriptions-list');
        list.innerHTML = '';

        this.populateSubscriptionGroupFilter();

        if (this.subscriptions.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma assinatura cadastrada</p>';
            return;
        }

        if (this.subscriptionViewMode === 'groups') {
            this.renderSubscriptionGroupsView(list);
            return;
        }

        const viewMonth = this.subscriptionViewMonth;
        const viewYear = this.subscriptionViewYear;
        const monthLabel = `${String(viewMonth + 1).padStart(2, '0')}/${viewYear}`;

        const activeInMonth = (this.subscriptions || []).filter(sub => this.isSubscriptionActiveInMonth(sub, viewYear, viewMonth));
        const visibleSubs = this.filterSubscriptionsByStatus(this.filterSubscriptionsByGroup(activeInMonth));

        if (visibleSubs.length === 0) {
            const filterMessage = activeInMonth.length === 0
                ? `Nenhuma assinatura ativa em ${monthLabel}`
                : `Nenhuma assinatura ativa em ${monthLabel} para os filtros aplicados`;
            list.innerHTML = `<p style="text-align: center; color: #666;">${filterMessage}</p>`;
            return;
        }

        const totalMonthly = visibleSubs.reduce((sum, s) => sum + (s.targetAmount || s.target_amount || 0), 0);

        const summary = document.createElement('div');
        summary.className = 'card';
        summary.style.marginBottom = '20px';
        summary.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        summary.style.color = 'white';
        summary.innerHTML = `
            <h3 style="color: white;">Total Mensal em Assinaturas</h3>
            <p style="font-size: 24px; font-weight: bold;">R$ ${totalMonthly.toFixed(2)}</p>
            <p>${visibleSubs.length} assinatura(s) ativa(s) em ${monthLabel}${this.subscriptionStatusFilter !== 'all' ? ` · ${this.subscriptionStatusFilter === 'paid' ? 'pagas' : 'pendentes'}` : ''}</p>
        `;
        list.appendChild(summary);

        const now = new Date();
        const isCurrentViewMonth = viewYear === now.getFullYear() && viewMonth === now.getMonth();
        const payDate = isCurrentViewMonth ? '' : `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`;

        this.groupSubscriptions(visibleSubs).forEach(({ group, subs }) => {
            list.appendChild(this.renderSubscriptionGroupHeader(group, subs));

            subs.forEach(sub => {
                const amount = sub.targetAmount || sub.target_amount || 0;
                const item = document.createElement('div');
                item.className = 'card';
                item.style.marginBottom = '10px';

                const alreadyPaid = this.isSubscriptionPaidInMonth(sub, viewYear, viewMonth);
                const paymentDay = sub.paymentDay ?? sub.payment_day;
                const startValue = sub.startDate ?? sub.start_date;
                const endValue = sub.endDate ?? sub.end_date;

                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h3>${esc(sub.name)}</h3>
                            <p><strong>Categoria:</strong> ${esc(sub.category || 'Assinatura')}${paymentDay ? ` · <strong>Desconto dia:</strong> ${esc(String(paymentDay))}` : ''}${startValue ? ` · <strong>Início:</strong> ${esc(this.formatSubscriptionDate(startValue))}` : ''}${endValue ? ` · <strong>Fim:</strong> ${esc(this.formatSubscriptionDate(endValue))}` : ''}</p>
                            ${endValue ? '<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#e74c3c;color:white;margin-top:4px;">Cancelada</span>' : ''}
                            ${alreadyPaid ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#2ecc71;color:white;margin-top:4px;margin-left:${endValue ? '6px' : '0'};">Pago neste mês</span>` : ''}
                            ${!isCurrentViewMonth && !endValue ? `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;background:#667eea;color:white;margin-top:4px;margin-left:${alreadyPaid ? '6px' : '0'};">Referência ${monthLabel}</span>` : ''}
                        </div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="text-align: right;">
                                <p style="font-size: 20px; font-weight: bold; color: #e74c3c;">- R$ ${amount.toFixed(2)}</p>
                                <p style="font-size: 12px; color: #666;">/mês</p>
                            </div>
                            ${!alreadyPaid && !endValue ? `<button class="btn-small" onclick="markSubscriptionPaid(${sub.id}${payDate ? `, '${payDate}'` : ''})" title="Marcar como paga"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">check_circle</span></button>` : ''}
                            <button class="btn-small" onclick="cancelSubscription(${sub.id})" title="${endValue ? 'Reativar assinatura' : 'Cancelar assinatura'}"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">${endValue ? 'undo' : 'money_off'}</span></button>
                            <button class="btn-small" onclick="editSubscription(${sub.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                            <button class="btn-small btn-danger" onclick="deleteSubscription(${sub.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        });
        this.refreshIcons();
    }

    async addInstallment() {
        const description = document.getElementById('installment-description').value;
        let installmentAmount = parseFloat(document.getElementById('installment-amount').value);
        const totalInstallments = parseInt(document.getElementById('installment-count').value);
        const category = document.getElementById('installment-category')?.value || 'compras';
        this.updateInstallmentStartFromReference();
        const startDate = document.getElementById('installment-start').value;
        const installmentGroupId = document.getElementById('installment-group')?.value || null;
        const editId = document.getElementById('installment-modal').dataset.editId;
        const referenceInstallment = parseInt(document.getElementById('installment-current').value || '1', 10);
        const previousPaid = document.getElementById('installment-previous-paid')?.checked;
        const currentInstallment = previousPaid ? Math.max(0, referenceInstallment - 1) : 0;
        let installmentAmounts = this.getCustomInstallmentAmounts();
        if (Array.isArray(installmentAmounts) && installmentAmounts.length > 0) {
            installmentAmounts = installmentAmounts.slice(0, totalInstallments);
            const customTotal = installmentAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0);
            installmentAmount = totalInstallments > 0 ? Math.round((customTotal / totalInstallments) * 100) / 100 : 0;
        } else {
            installmentAmounts = null;
        }
        const totalAmount = Array.isArray(installmentAmounts)
            ? Math.round(installmentAmounts.reduce((sum, amount) => sum + Number(amount || 0), 0) * 100) / 100
            : Number.isFinite(installmentAmount) && Number.isFinite(totalInstallments)
            ? Math.round((installmentAmount * totalInstallments) * 100) / 100
            : NaN;

        if (!description || !Number.isFinite(totalAmount) || !Number.isFinite(installmentAmount) || !Number.isFinite(totalInstallments) || totalInstallments <= 0) {
            alert('Informe a descrição, a quantidade de parcelas e os valores do parcelamento.');
            return;
        }

        if (!Number.isFinite(referenceInstallment) || referenceInstallment < 1 || referenceInstallment > totalInstallments) {
            alert('A parcela do mês selecionado precisa estar entre 1 e o número total de parcelas.');
            return;
        }

        if (!startDate) {
            alert('Informe o mês da parcela atual para calcular a data de início.');
            return;
        }

        const installment = { description, totalAmount, installmentAmount, installmentAmounts, totalInstallments, currentInstallment, category, startDate, installmentGroupId };

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
            await this.reloadInstallmentsAndGroups();
            this.closeInstallmentModal();
            this.loadInstallments();
        } catch (error) {
            console.error('Erro ao salvar parcelamento:', error);
        }
    }

    async reloadInstallmentsAndGroups() {
        const [installmentsResponse, groupsResponse] = await Promise.all([
            fetch('/api/installments'),
            fetch('/api/installments/groups')
        ]);
        const installmentsData = await installmentsResponse.json();
        const groupsData = await groupsResponse.json();
        if (installmentsData.success) this.installments = installmentsData.data || [];
        if (groupsData.success) this.installmentGroups = groupsData.data || [];
    }

    async createInstallmentGroup() {
        const name = prompt('Nome do grupo de parcelamento:', 'CARTÃO - DIA ');
        if (!name || !name.trim()) return;

        const dueInput = prompt('Dia de vencimento desse grupo (1 a 31). Pode deixar vazio:', '');
        const dueDay = dueInput && dueInput.trim() ? parseInt(dueInput, 10) : null;
        if (dueDay !== null && (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)) {
            alert('Dia de vencimento inválido. Use um número de 1 a 31.');
            return;
        }

        try {
            const response = await fetch('/api/installments/groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), dueDay })
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao criar grupo');
                return;
            }
            await this.reloadInstallmentsAndGroups();
            this.populateInstallmentGroupSelect(data.data?.id);
            this.loadInstallments();
        } catch (error) {
            console.error('Erro ao criar grupo:', error);
        }
    }

    async updateInstallmentGroup(groupId) {
        const payload = this.getInstallmentGroupFormData(groupId);
        if (!payload) return;

        try {
            const response = await fetch(`/api/installments/groups/${groupId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao atualizar grupo');
                return;
            }
            await this.reloadInstallmentsAndGroups();
            this.loadInstallments();
        } catch (error) {
            console.error('Erro ao atualizar grupo:', error);
            alert('Erro ao atualizar grupo');
        }
    }

    async deleteInstallmentGroup(groupId) {
        const group = (this.installmentGroups || []).find(item => String(item.id) === String(groupId));
        const label = group ? this.getInstallmentGroupLabel(group) : 'este grupo';
        if (!confirm(`Excluir ${label}? Os parcelamentos dele serão movidos para Sem grupo.`)) return;

        try {
            const response = await fetch(`/api/installments/groups/${groupId}`, { method: 'DELETE' });
            const data = await response.json();
            if (!data.success) {
                alert(data.error || 'Erro ao excluir grupo');
                return;
            }
            await this.reloadInstallmentsAndGroups();
            this.loadInstallments();
        } catch (error) {
            console.error('Erro ao excluir grupo:', error);
            alert('Erro ao excluir grupo');
        }
    }

    async addSubscription() {
        const name = document.getElementById('subscription-name')?.value || '';
        const amount = parseFloat(document.getElementById('subscription-amount')?.value);
        const category = document.getElementById('subscription-category')?.value || 'assinaturas';
        const groupValue = document.getElementById('subscription-group')?.value || '';
        const paymentDayValue = document.getElementById('subscription-payment-day')?.value.trim() || '';
        const paymentDay = paymentDayValue ? parseInt(paymentDayValue, 10) : null;
        if (paymentDay !== null && (!Number.isInteger(paymentDay) || paymentDay < 1 || paymentDay > 31)) {
            alert('Dia de pagamento inválido. Use um número de 1 a 31.');
            return;
        }
        const startValue = document.getElementById('subscription-start')?.value || '';
        const endValue = document.getElementById('subscription-end')?.value || '';
        const editId = document.getElementById('subscription-modal').dataset.editId;

        const subscription = { name, targetAmount: amount, currentAmount: 0, category, targetDate: '2026-12-31', subscriptionGroupId: groupValue ? parseInt(groupValue, 10) : null, paymentDay, startDate: startValue || null, endDate: endValue || null };

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
                    if (idx !== -1) app.subscriptions[idx] = { ...app.subscriptions[idx], ...subscription, id: parseInt(editId) };
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

            // Se a assinatura começa em outro mês, levar o usuário até ele
            if (subscription.startDate) {
                const startDateObj = this.parseSubscriptionDate(subscription.startDate);
                if (!Number.isNaN(startDateObj.getTime())) {
                    const startMonth = startDateObj.getMonth();
                    const startYear = startDateObj.getFullYear();
                    if (startMonth !== this.subscriptionViewMonth || startYear !== this.subscriptionViewYear) {
                        this.subscriptionViewMonth = startMonth;
                        this.subscriptionViewYear = startYear;
                        const monthSelect = document.getElementById('subscription-view-month');
                        const yearSelect = document.getElementById('subscription-view-year');
                        if (monthSelect) monthSelect.value = startMonth;
                        if (yearSelect) yearSelect.value = startYear;
                    }
                }
            }

            this.closeSubscriptionModal();
            this.loadSubscriptions();
        } catch (error) {
            console.error('Erro ao salvar assinatura:', error);
        }
    }

    // Relatórios: com contas conectadas, receitas e despesas reais do ano e, do mês escolhido, categorias e para quem foi/de quem veio o dinheiro.
    async updateReports() {
        if (!window.Chart) return;
        const reportYear = Number(document.getElementById('report-year').value);
        const reportMonth = Number(document.getElementById('report-month').value) || this.selectedMonth + 1;
        const real = document.getElementById('real-report');
        const conectado = this.hasConnectedAccounts();
        real.hidden = !conectado;
        let meses, cobertura = null;
        if (conectado) {
            document.getElementById('real-report-title').textContent = `Suas contas em ${new Date(reportYear, reportMonth - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
            document.getElementById('real-report-status').textContent = 'Carregando...';
            const dados = await this.connectedMonth('relatorio', reportYear, reportMonth);
            if (Number(document.getElementById('report-year').value) !== reportYear || (Number(document.getElementById('report-month').value) || this.selectedMonth + 1) !== reportMonth || this.currentPage !== 'reports') return;
            this.renderRealReport(dados, reportMonth);
            meses = dados ? dados.meses : null;
            cobertura = dados ? dados.cobertura : null;
        }
        if (!meses) meses = Array.from({ length: 12 }, (_, i) => { const t = FinanceCore.summary(this, reportYear, i + 1); return { mes: i + 1, receitas: t.income, despesas: t.expenses }; });

        const labels = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(reportYear, i, 1)));
        // Mês fora do histórico do banco (ou que ainda não chegou) não é zero: fica sem ponto. Mês incompleto fica tracejado/claro.
        const semDados = (i) => meses[i].situacao === 'sem-dados';
        const parcial = (i) => meses[i].situacao === 'parcial';
        const valores = (campo) => meses.map((m, i) => semDados(i) ? null : m[campo]);
        const tracejado = { borderDash: (ctx) => parcial(ctx.p0DataIndex) || parcial(ctx.p1DataIndex) ? [6, 4] : undefined };
        if (this.charts.monthly) this.charts.monthly.destroy();
        this.charts.monthly = new Chart(document.getElementById('monthly-report-chart').getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [
                { label: 'Receitas', data: valores('receitas'), borderColor: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)', segment: tracejado, pointStyle: meses.map((m, i) => parcial(i) ? 'triangle' : 'circle') },
                { label: 'Despesas', data: valores('despesas'), borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', segment: tracejado, pointStyle: meses.map((m, i) => parcial(i) ? 'triangle' : 'circle') }
            ] },
            options: { responsive: true, spanGaps: false, plugins: { title: { display: true, text: conectado ? 'Receitas vs Despesas (contas conectadas)' : 'Receitas vs Despesas Mensais' } } }
        });
        // Resultado de cada mês: verde quando sobrou dinheiro, vermelho quando saiu mais do que entrou; mês incompleto mais claro.
        const resultado = meses.map((m, i) => semDados(i) ? null : Math.round((m.receitas - m.despesas) * 100) / 100);
        const tom = (v) => v >= 0 ? '46, 204, 113' : '231, 76, 60';
        if (this.charts.yearly) this.charts.yearly.destroy();
        this.charts.yearly = new Chart(document.getElementById('yearly-comparison-chart').getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Receitas − Despesas', data: resultado, backgroundColor: resultado.map((v, i) => `rgba(${tom(v)}, ${parcial(i) ? 0.3 : 0.75})`), borderColor: resultado.map((v, i) => parcial(i) ? `rgb(${tom(v)})` : 'transparent'), borderWidth: 1, borderSkipped: false }] },
            options: { responsive: true, plugins: { legend: { display: false }, title: { display: true, text: `Resultado de cada mês em ${reportYear}` } } }
        });
        document.getElementById('report-chart-note').textContent = conectado && meses.some(m => m.situacao !== 'completo') ? this.reportCoverageNote(meses, cobertura) : '';
    }

    /** Explica os meses sem ponto e os incompletos (tracejados) do gráfico. */
    reportCoverageNote(meses, cobertura) {
        const nome = (m) => new Date(2000, m.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const data = (d) => d ? d.split('-').reverse().join('/') : '';
        const partes = [];
        const sem = meses.filter(m => m.situacao === 'sem-dados'), parciais = meses.filter(m => m.situacao === 'parcial');
        if (sem.length) partes.push(`Sem dados (fora do histórico do banco${cobertura?.fim ? `, que vai até ${data(cobertura.fim)}` : ''}): ${sem.map(nome).join(', ')}.`);
        if (parciais.length) {
            const motivos = [];
            if (cobertura?.inicio) motivos.push(`as contas têm lançamentos desde ${data(cobertura.inicio)}`);
            if (cobertura?.inicioCartao && cobertura.inicioCartao > (cobertura.inicio || '')) motivos.push(`o cartão só desde ${data(cobertura.inicioCartao)}, então as compras no cartão antes disso não aparecem`);
            partes.push(`Incompletos (tracejado): ${parciais.map(nome).join(', ')}, porque ${motivos.join(' e ')}.`);
        }
        return partes.join(' ');
    }

    renderRealReport(dados, reportMonth) {
        const status = document.getElementById('real-report-status');
        const blocos = ['real-report-categories', 'real-report-destinations', 'real-report-origins'].map(id => document.getElementById(id));
        blocos.forEach(bloco => bloco.replaceChildren());
        if (!dados) { status.textContent = 'Dados das contas indisponíveis no momento.'; ['real-report-income', 'real-report-expenses', 'real-report-result'].forEach(id => { document.getElementById(id).textContent = '—'; }); return; }
        status.textContent = '';
        const mes = dados.meses[reportMonth - 1] || { receitas: 0, despesas: 0 };
        const saldo = Math.round((mes.receitas - mes.despesas) * 100) / 100;
        document.getElementById('real-report-income').textContent = FinanceCore.money(mes.receitas);
        document.getElementById('real-report-expenses').textContent = FinanceCore.money(mes.despesas);
        const resultado = document.getElementById('real-report-result');
        resultado.textContent = FinanceCore.money(saldo);
        resultado.className = saldo >= 0 ? 'income' : 'expense';
        // Barras proporcionais ao maior valor de cada lista.
        const lista = (alvo, itens, nome, vazio) => {
            if (!itens.length) { const p = document.createElement('p'); p.className = 'empty-state'; p.textContent = vazio; alvo.append(p); return; }
            const maior = Math.max(...itens.map(item => item.total)) || 1;
            for (const item of itens) {
                const linha = document.createElement('div'); linha.className = 'report-bar';
                const topo = document.createElement('div');
                const rotulo = document.createElement('span'); rotulo.textContent = nome(item);
                const valor = document.createElement('strong'); valor.textContent = FinanceCore.money(item.total);
                const vezes = document.createElement('small'); vezes.textContent = ` · ${item.quantidade}×`;
                rotulo.append(vezes); topo.append(rotulo, valor);
                const barra = document.createElement('div'); barra.className = 'report-bar-track';
                const cheio = document.createElement('i'); cheio.style.width = `${Math.max(2, item.total / maior * 100)}%`;
                barra.append(cheio); linha.append(topo, barra); alvo.append(linha);
            }
        };
        lista(blocos[0], dados.categorias.slice(0, 10), item => categoriaPt(item.categoria), 'Nenhuma despesa neste mês.');
        lista(blocos[1], dados.destinos, item => item.nome, 'Nenhum destinatário identificado neste mês.');
        lista(blocos[2], dados.origens, item => item.nome, 'Nenhum pagador identificado neste mês.');
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
        const modal = document.getElementById('installment-modal');
        const isEditing = Boolean(modal?.dataset.editId);
        this.populateInstallmentGroupSelect(document.getElementById('installment-group')?.value || '');
        if (!isEditing) {
            const referenceMonthInput = document.getElementById('installment-reference-month');
            const paymentDayInput = document.getElementById('installment-payment-day');
            const currentInput = document.getElementById('installment-current');
            if (referenceMonthInput) referenceMonthInput.value = this.getDefaultInstallmentReferenceMonth();
            if (paymentDayInput && !paymentDayInput.value) paymentDayInput.value = String(new Date().getDate());
            if (currentInput && (!currentInput.value || Number(currentInput.value) < 1)) currentInput.value = '1';
            this.updateInstallmentStartFromReference();
        }
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
        const referenceMonthInput = document.getElementById('installment-reference-month');
        const paymentDayInput = document.getElementById('installment-payment-day');
        const currentInput = document.getElementById('installment-current');
        const startInput = document.getElementById('installment-start');
        const previousPaidInput = document.getElementById('installment-previous-paid');
        if (referenceMonthInput) referenceMonthInput.value = '';
        if (paymentDayInput) paymentDayInput.value = '1';
        if (currentInput) currentInput.value = '1';
        if (startInput) startInput.value = '';
        if (previousPaidInput) previousPaidInput.checked = false;
        delete document.getElementById('installment-modal').dataset.editId;
        document.getElementById('installment-modal').querySelector('h2').textContent = 'Novo Parcelamento';
    }

    openSubscriptionModal() {
        // Preserva o grupo já selecionado (fluxo de edição popula antes de abrir)
        this.populateSubscriptionGroupSelect(document.getElementById('subscription-group')?.value || '');
        document.getElementById('subscription-modal').style.display = 'block';
    }

    closeSubscriptionModal() {
        document.getElementById('subscription-modal').style.display = 'none';
        document.getElementById('subscription-form').reset();
        delete document.getElementById('subscription-modal').dataset.editId;
        document.getElementById('subscription-modal').querySelector('h2').textContent = 'Nova Assinatura';
    }

    // Receitas reais do mês (dinheiro que entrou nas contas, sem transferências entre contas próprias); cache de 5 minutos por mês.
    // Receitas, despesas e relatório reais de um mês (com o filtro de bancos): uma leitura vale por 5 minutos (falha não fica guardada).
    connectedMonth(recurso, year, month) {
        this.connectedMonthCache = this.connectedMonthCache || new Map();
        const selecao = this.bankSelection();
        const bancos = selecao ? [...selecao].sort().join(',') : '';
        const chave = `${recurso}-${year}-${month}-${bancos}`, guardado = this.connectedMonthCache.get(chave);
        if (guardado && Date.now() - guardado.em < 5 * 60 * 1000) return guardado.dados;
        const dados = fetch(`/api/pluggy/${recurso}?ano=${year}&mes=${month}${bancos ? `&bancos=${bancos}` : ''}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null);
        this.connectedMonthCache.set(chave, { em: Date.now(), dados });
        dados.then(resultado => { if (!resultado) this.connectedMonthCache.delete(chave); });
        return dados;
    }

    connectedIncome(year, month) { return this.connectedMonth('receitas', year, month); }

    // Transações reais: período, tipo (receitas/gastos), forma de pagamento, categoria, busca e transferências próprias.
    realTxState() {
        if (!this.realTx) this.realTx = { periodo: 'month', ano: this.selectedYear, mes: this.selectedMonth, tipo: 'todos', forma: '', categoria: '', busca: '', esconderProprias: false, mostrar: 50 };
        return this.realTx;
    }

    realTxRange() {
        const estado = this.realTxState(), iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (estado.periodo === 'all') return { de: '', ate: '' };
        if (estado.periodo === 'custom') return { de: document.getElementById('real-tx-start').value, ate: document.getElementById('real-tx-end').value };
        return { de: iso(new Date(estado.ano, estado.mes, 1)), ate: iso(new Date(estado.ano, estado.mes + 1, 0)) };
    }

    bindRealTransactions() {
        if (this.realTxBound) return;
        this.realTxBound = true;
        const estado = this.realTxState(), recarregar = () => { estado.mostrar = 50; this.loadRealTransactions(); }, redesenhar = () => { estado.mostrar = 50; this.renderRealTransactions(); };
        const mudarMes = (delta) => { const d = new Date(estado.ano, estado.mes + delta, 1); estado.ano = d.getFullYear(); estado.mes = d.getMonth(); recarregar(); };
        document.getElementById('real-tx-prev').onclick = () => mudarMes(-1);
        document.getElementById('real-tx-next').onclick = () => mudarMes(1);
        document.getElementById('real-tx-period').onchange = (event) => {
            estado.periodo = event.target.value;
            if (estado.periodo === 'custom') {
                const inicio = document.getElementById('real-tx-start'), fim = document.getElementById('real-tx-end');
                const { de, ate } = this.realTxRange.call({ realTxState: () => ({ ...estado, periodo: 'month' }) });
                if (!inicio.value) inicio.value = de;
                if (!fim.value) fim.value = ate;
            }
            recarregar();
        };
        for (const id of ['real-tx-start', 'real-tx-end']) document.getElementById(id).onchange = recarregar;
        document.querySelectorAll('.real-tx-type button').forEach(botao => botao.onclick = () => {
            estado.tipo = botao.dataset.tipo;
            document.querySelectorAll('.real-tx-type button').forEach(b => { const ativo = b === botao; b.classList.toggle('on', ativo); b.setAttribute('aria-checked', String(ativo)); });
            redesenhar();
        });
        document.getElementById('real-tx-form').onchange = (event) => { estado.forma = event.target.value; redesenhar(); };
        document.getElementById('real-tx-category').onchange = (event) => { estado.categoria = event.target.value; redesenhar(); };
        document.getElementById('real-tx-search').oninput = (event) => { estado.busca = event.target.value.trim().toLowerCase(); redesenhar(); };
        document.getElementById('real-tx-hide-own').onchange = (event) => { estado.esconderProprias = event.target.checked; redesenhar(); };
        document.getElementById('real-tx-more').onclick = () => { estado.mostrar += 50; this.renderRealTransactions(); };
    }

    async loadRealTransactions() {
        this.bindRealTransactions();
        const estado = this.realTxState();
        document.getElementById('real-tx-month-controls').hidden = estado.periodo !== 'month';
        document.getElementById('real-tx-custom-controls').hidden = estado.periodo !== 'custom';
        const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);
        document.getElementById('real-tx-month').textContent = maiuscula(new Date(estado.ano, estado.mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
        const { de, ate } = this.realTxRange();
        const selecao = this.bankSelection(), bancos = selecao ? [...selecao].sort().join(',') : '';
        const chave = `${de}|${ate}|${bancos}`;
        this.realTxKey = chave;
        document.getElementById('real-tx-list').innerHTML = '<p class="empty-state">Carregando lançamentos…</p>';
        const parametros = new URLSearchParams({ ...(de ? { de } : {}), ...(ate ? { ate } : {}), ...(bancos ? { bancos } : {}) });
        const [resposta, contas] = await Promise.all([
            fetch(`/api/pluggy/lancamentos?${parametros}`, { cache: 'no-store' }).then(r => r.ok ? r.json() : null).catch(() => null),
            this.connectedData()
        ]);
        if (this.realTxKey !== chave || this.currentPage !== 'transactions') return;
        this.realTxData = resposta?.lancamentos || null;
        this.realTxBanks = new Map((contas?.itens || []).map(item => [item.ref, item.banco]));
        this.renderRealTransactions();
    }

    renderRealTransactions() {
        const estado = this.realTxState(), lista = document.getElementById('real-tx-list'), totais = document.getElementById('real-tx-totals'), mais = document.getElementById('real-tx-more');
        const todos = this.realTxData;
        if (!todos) { lista.innerHTML = '<p class="empty-state">Lançamentos indisponíveis no momento.</p>'; totais.textContent = ''; mais.hidden = true; return; }
        // Opções dos filtros a partir do período carregado, mantendo a escolha atual.
        const preencher = (id, valores, rotulo, vazio) => {
            const select = document.getElementById(id), atual = select.value;
            select.replaceChildren(new Option(vazio, ''), ...[...new Set(valores)].sort((a, b) => rotulo(a).localeCompare(rotulo(b), 'pt-BR')).map(valor => new Option(rotulo(valor), valor)));
            select.value = [...select.options].some(opcao => opcao.value === atual) ? atual : '';
        };
        preencher('real-tx-form', todos.map(item => item.forma), valor => valor, 'Todas as formas');
        preencher('real-tx-category', todos.map(item => item.categoria || ''), categoriaPt, 'Todas as categorias');
        estado.forma = document.getElementById('real-tx-form').value; estado.categoria = document.getElementById('real-tx-category').value;
        const filtrados = todos.filter(item => (estado.tipo === 'todos' || item.tipo === estado.tipo)
            && (!estado.forma || item.forma === estado.forma)
            && (!estado.categoria || (item.categoria || '') === estado.categoria)
            && (!estado.esconderProprias || !item.transferenciaPropria)
            && (!estado.busca || `${item.descricao} ${item.contraparte?.nome || ''} ${categoriaPt(item.categoria)} ${item.forma} ${FinanceCore.money(item.valor)} ${item.valor}`.toLowerCase().includes(estado.busca)));
        // Receitas: entradas nas contas correntes; gastos: saídas e compras no cartão. Sem transferências próprias, pagamento de fatura nem investimento.
        const conta = (item) => !item.transferenciaPropria && !item.pagamentoFatura && !item.investimento;
        const receitas = filtrados.filter(item => item.tipo === 'CREDIT' && item.contaTipo === 'BANK' && conta(item)).reduce((soma, item) => soma + Math.round(item.valor * 100), 0) / 100;
        const gastos = filtrados.filter(item => item.tipo === 'DEBIT' && conta(item)).reduce((soma, item) => soma + Math.round(item.valor * 100), 0) / 100;
        totais.innerHTML = `<span>${filtrados.length} ${filtrados.length === 1 ? 'lançamento' : 'lançamentos'}</span><span class="income">Receitas ${esc(FinanceCore.money(receitas))}</span><span class="expense">Gastos ${esc(FinanceCore.money(gastos))}</span>`;
        if (!filtrados.length) { lista.innerHTML = '<p class="empty-state">Nenhum lançamento com esses filtros.</p>'; mais.hidden = true; return; }
        const visiveis = filtrados.slice(0, estado.mostrar);
        let html = '', diaAtual = '';
        for (const item of visiveis) {
            if (item.data !== diaAtual) { diaAtual = item.data; html += this.realTxDayHtml(item.data); }
            html += this.realTxRowHtml(item);
        }
        lista.innerHTML = html;
        mais.hidden = filtrados.length <= estado.mostrar;
        mais.textContent = `Mostrar mais (${filtrados.length - visiveis.length} restantes)`;
    }

    realTxDayHtml(data) {
        const dia = new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
        return `<h4 class="real-tx-day">${esc(dia.charAt(0).toUpperCase() + dia.slice(1))}</h4>`;
    }

    // Uma linha de lançamento real: descrição, outra parte, categoria · forma · banco, etiquetas e valor.
    realTxRowHtml(item) {
        const etiquetas = [item.pendente ? 'Pendente' : null, item.transferenciaPropria ? 'Entre suas contas' : null, item.pagamentoFatura ? 'Pagamento de fatura' : null, item.investimento ? 'Investimento' : null, item.parcela ? `Parcela ${item.parcela.numero}/${item.parcela.total}` : null].filter(Boolean);
        const banco = this.realTxBanks?.get(item.bancoRef) || item.conta;
        return `<div class="real-tx-row${item.transferenciaPropria ? ' propria' : ''}">
            <div><strong>${esc(item.descricao || 'Lançamento')}</strong>
            ${item.contraparte ? `<span class="real-tx-party">${item.tipo === 'CREDIT' ? 'De' : 'Para'}: <b>${esc(item.contraparte.nome)}</b>${item.contraparte.tipo === 'PJ' ? ' <em>empresa</em>' : ''}</span>` : ''}
            <small>${[...new Set([categoriaPt(item.categoria), item.forma, banco].map(parte => String(parte)))].filter((parte, i, lista) => lista.findIndex(outra => outra.toLowerCase() === parte.toLowerCase()) === i).map(esc).join(' · ')}</small>
            ${etiquetas.length ? `<span class="real-tx-tags">${etiquetas.map(etiqueta => `<span>${esc(etiqueta)}</span>`).join('')}</span>` : ''}</div>
            <span class="${item.tipo === 'CREDIT' ? 'income' : 'expense'}">${item.tipo === 'CREDIT' ? '+' : '−'} ${esc(FinanceCore.money(item.valor))}</span>
        </div>`;
    }

    renderRealIncomes() { return this.renderRealMonth('receitas'); }

    // Receitas e Despesas com contas conectadas: o mês real no topo; os itens manuais viram lembretes (fora dos cálculos).
    async renderRealMonth(recurso) {
        const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
        const cfg = recurso === 'receitas' ? {
            secao: 'real-incomes', lembretes: 'income-reminders-title', botao: 'new-income-button', botaoConectado: 'Novo lembrete de receita', botaoManual: 'Nova Receita',
            vista: 'incomeView', classe: 'income', sinal: '+', parte: 'De', vazio: 'Nenhuma entrada neste mês.', indisponivel: 'Entradas indisponíveis no momento.',
            nota: (dados, i) => [plural(dados.lancamentos.length, 'entrada', 'entradas'),
                i.transferencias ? `${plural(i.transferencias, 'transferência', 'transferências')} entre suas contas fora da soma` : null,
                i.investimentos ? `${plural(i.investimentos, 'resgate', 'resgates')} de investimento fora da soma` : null,
                i.pendentes ? plural(i.pendentes, 'pendente', 'pendentes') : null]
        } : {
            secao: 'real-expenses', lembretes: 'expense-reminders-title', botao: 'new-expense-button', botaoConectado: 'Novo lembrete de despesa', botaoManual: 'Nova Despesa',
            vista: 'expenseView', classe: 'expense', sinal: '−', parte: 'Para', vazio: 'Nenhuma saída neste mês.', indisponivel: 'Despesas indisponíveis no momento.',
            nota: (dados, i) => [plural(dados.lancamentos.length, 'saída', 'saídas'),
                dados.pendentes ? `${plural(dados.pendentes, 'pendente', 'pendentes')} no banco` : null,
                i.transferencias ? `${plural(i.transferencias, 'transferência', 'transferências')} entre suas contas fora da soma` : null,
                i.faturas ? `${plural(i.faturas, 'pagamento', 'pagamentos')} de fatura fora da soma (as compras do cartão já contam)` : null,
                i.investimentos ? `${plural(i.investimentos, 'aplicação', 'aplicações')} em investimento fora da soma` : null]
        };
        const secao = document.getElementById(cfg.secao);
        const conectado = this.hasConnectedAccounts();
        secao.hidden = !conectado;
        document.getElementById(cfg.lembretes).hidden = !conectado;
        document.getElementById(cfg.botao).textContent = conectado ? cfg.botaoConectado : cfg.botaoManual;
        if (!conectado) return;
        const chaveAno = `${cfg.vista}Year`, chaveMes = `${cfg.vista}Month`;
        if (this[chaveAno] === undefined) { this[chaveAno] = this.selectedYear; this[chaveMes] = this.selectedMonth; }
        const ano = this[chaveAno], mes = this[chaveMes];
        const mudar = (delta) => { const d = new Date(this[chaveAno], this[chaveMes] + delta, 1); this[chaveAno] = d.getFullYear(); this[chaveMes] = d.getMonth(); this.renderRealMonth(recurso); };
        document.getElementById(`${cfg.secao}-prev`).onclick = () => mudar(-1);
        document.getElementById(`${cfg.secao}-next`).onclick = () => mudar(1);
        document.getElementById(`${cfg.secao}-month`).textContent = new Date(ano, mes, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        const total = document.getElementById(`${cfg.secao}-total`), nota = document.getElementById(`${cfg.secao}-note`), lista = document.getElementById(`${cfg.secao}-list`);
        total.textContent = '…'; nota.textContent = ''; lista.replaceChildren();
        const dados = await this.connectedMonth(recurso, ano, mes + 1);
        if (this[chaveAno] !== ano || this[chaveMes] !== mes) return;
        if (!dados) { total.textContent = '—'; nota.textContent = cfg.indisponivel; return; }
        total.textContent = FinanceCore.money(dados.total);
        nota.textContent = cfg.nota(dados, dados.ignorados || {}).filter(Boolean).join(' · ');
        if (!dados.lancamentos.length) { const vazio = document.createElement('p'); vazio.className = 'empty-state'; vazio.textContent = cfg.vazio; lista.append(vazio); return; }
        for (const item of dados.lancamentos) {
            const linha = document.createElement('div'); linha.className = 'recent-row';
            const texto = document.createElement('div');
            const nome = document.createElement('strong'); nome.textContent = item.descricao || 'Lançamento';
            const partes = [item.data.split('-').reverse().join('/'), item.conta];
            if (recurso === 'despesas') partes.push(item.forma, categoriaPt(item.categoria));
            if (item.parcela) partes.push(`Parcela ${item.parcela.numero}/${item.parcela.total}`);
            if (item.pendente) partes.push('Pendente');
            const detalhe = document.createElement('small');
            detalhe.textContent = partes.filter((parte, i, todas) => todas.findIndex(outra => String(outra).toLowerCase() === String(parte).toLowerCase()) === i).join(' · ');
            texto.append(nome);
            if (item.contraparte) { const quem = document.createElement('span'); quem.className = 'real-tx-party'; quem.textContent = `${cfg.parte}: ${item.contraparte}`; texto.append(quem); }
            texto.append(detalhe);
            const valor = document.createElement('span'); valor.className = cfg.classe; valor.textContent = `${cfg.sinal} ${FinanceCore.money(item.valor)}`;
            linha.append(texto, valor); lista.append(linha);
        }
    }

    async loadIncomes() {
        this.renderRealIncomes();
        const list = document.getElementById('incomes-list');
        list.innerHTML = '';

        if (this.incomes.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma receita cadastrada</p>';
            return;
        }

        this.incomes.forEach(inc => {
            const dateStr = (inc.date || '').split('T')[0];
            const recurrence = inc.recurrence === 'monthly' || inc.recurrence === 'yearly'
                ? inc.recurrence
                : 'specific';
            const recurrenceLabels = {
                specific: 'Data específica',
                monthly: 'Mensal',
                yearly: 'Anual'
            };
            const item = document.createElement('div');
            item.className = 'card';
            item.style.marginBottom = '15px';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h3>${esc(inc.description)}</h3>
                        <p><strong>Categoria:</strong> ${esc(inc.category)}</p>
                        <p><strong>Valor:</strong> R$ ${inc.amount.toFixed(2)}</p>
                        <p><strong>${recurrence === 'specific' ? 'Data' : 'Início'}:</strong> ${dateStr}</p>
                        <span class="income-frequency-badge">${recurrenceLabels[recurrence]}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="margin-top: 8px;">
                            <button class="btn-small" onclick="editIncome(${inc.id})" title="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                            <button class="btn-small btn-danger" onclick="deleteIncome(${inc.id})" title="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
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
        const recurrence = document.getElementById('income-recurrence').value;
        const editId = document.getElementById('income-modal').dataset.editId;

        const income = { description, amount, category, date, recurrence };

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
        const modal = document.getElementById('income-modal');
        if (!modal.dataset.editId) {
            document.getElementById('income-recurrence').value = 'specific';
            const dateInput = document.getElementById('income-date');
            if (!dateInput.value) {
                const now = new Date();
                const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                dateInput.value = localDate.toISOString().slice(0, 10);
            }
        }
        updateIncomeDateLabel();
        document.getElementById('income-modal').style.display = 'block';
    }

    closeIncomeModal() {
        document.getElementById('income-modal').style.display = 'none';
        document.getElementById('income-form').reset();
        document.getElementById('income-recurrence').value = 'specific';
        updateIncomeDateLabel();
        delete document.getElementById('income-modal').dataset.editId;
        document.getElementById('income-modal').querySelector('h2').textContent = 'Nova Receita';
    }

    /** Concluída: a data marcada vale para sempre (data específica), para o mês (mensal) ou para o ano (anual). */
    expenseDone(exp) {
        const feita = String(exp.completed_at || '');
        if (!feita) return false;
        const hoje = new Date(), mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        if (exp.recurrence === 'monthly') return feita.startsWith(mes);
        if (exp.recurrence === 'yearly') return feita.startsWith(String(hoje.getFullYear()));
        return true;
    }

    async loadExpenses() {
        this.renderRealMonth('despesas');
        const list = document.getElementById('expenses-list');
        list.innerHTML = '';

        if (this.expenses.length === 0) {
            list.innerHTML = `<p style="text-align: center; color: #666;">${this.hasConnectedAccounts() ? 'Nenhum lembrete de despesa' : 'Nenhuma despesa cadastrada'}</p>`;
            return;
        }

        const recurrenceLabels = { specific: 'Data específica', monthly: 'Mensal', yearly: 'Anual' };
        const periodo = { specific: '', monthly: ' este mês', yearly: ' este ano' };
        const dataBr = (data) => String(data || '').split('T')[0].split('-').reverse().join('/');
        this.expenses.forEach(exp => {
            const recurrence = exp.recurrence === 'monthly' || exp.recurrence === 'yearly' ? exp.recurrence : 'specific';
            const feita = this.expenseDone(exp);
            const item = document.createElement('div');
            item.className = `card expense-reminder${feita ? ' done' : ''}`;
            item.innerHTML = `
                <div class="expense-reminder-body">
                    <div style="flex: 1;">
                        <h3>${esc(exp.description)}</h3>
                        <p><strong>Categoria:</strong> ${esc(exp.category)}</p>
                        <p><strong>Valor:</strong> ${esc(FinanceCore.money(exp.amount))}</p>
                        <p><strong>${recurrence === 'specific' ? 'Data' : 'Início'}:</strong> ${esc(dataBr(exp.date))}</p>
                        <span class="income-frequency-badge">${recurrenceLabels[recurrence]}</span>
                        ${feita ? `<span class="income-frequency-badge expense-done-badge">Concluída${periodo[recurrence]} · ${esc(dataBr(exp.completed_at))}</span>` : ''}
                    </div>
                    <div class="expense-reminder-actions">
                        <button class="btn-small expense-complete" type="button" aria-pressed="${feita}" onclick="toggleExpenseCompleted(${exp.id})" title="${feita ? 'Desmarcar conclusão' : 'Marcar como concluída'}"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">${feita ? 'check_circle' : 'radio_button_unchecked'}</span> ${feita ? 'Concluída' : 'Concluir'}</button>
                        <button class="btn-small" onclick="editExpense(${exp.id})" title="Editar" aria-label="Editar"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">edit</span></button>
                        <button class="btn-small btn-danger" onclick="deleteExpense(${exp.id})" title="Excluir" aria-label="Excluir"><span class="material-symbols-rounded lucide-icon" aria-hidden="true">delete</span></button>
                    </div>
                </div>
            `;
            list.appendChild(item);
        });
        this.refreshIcons();
    }

    async toggleExpenseCompleted(id) {
        const exp = this.expenses.find(e => e.id == id);
        if (!exp) return;
        try {
            const response = await fetch(`/api/expenses/${id}/completed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !this.expenseDone(exp) }) });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.error || 'Erro ao concluir despesa');
            exp.completed_at = data.data.completed_at;
            this.loadExpenses();
        } catch (error) {
            console.error('Erro ao concluir despesa:', error);
            alert('Não foi possível atualizar a despesa. Tente novamente.');
        }
    }

    async addExpense() {
        const description = document.getElementById('expense-description').value;
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const category = document.getElementById('expense-category').value;
        const date = document.getElementById('expense-date').value;
        const recurrence = document.getElementById('expense-recurrence').value;
        const editId = document.getElementById('expense-modal').dataset.editId;

        const expense = { description, amount, category, date, recurrence };

        try {
            let response;
            if (editId) {
                response = await fetch(`/api/expenses/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expense)
                });
                if (response.ok) {
                    const idx = this.expenses.findIndex(e => e.id == editId);
                    if (idx !== -1) this.expenses[idx] = { ...this.expenses[idx], ...expense, id: parseInt(editId) };
                    delete document.getElementById('expense-modal').dataset.editId;
                    document.getElementById('expense-modal').querySelector('h2').textContent = 'Nova Despesa';
                }
            } else {
                response = await fetch('/api/expenses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(expense)
                });
                const data = await response.json();
                if (data.success) {
                    this.expenses.push({ ...expense, id: data.data.id });
                }
            }
            this.closeExpenseModal();
            this.loadExpenses();
            this.updateDashboard();
        } catch (error) {
            console.error('Erro ao salvar despesa:', error);
        }
    }

    openExpenseModal() {
        const modal = document.getElementById('expense-modal');
        if (!modal.dataset.editId) {
            document.getElementById('expense-recurrence').value = 'specific';
            const dateInput = document.getElementById('expense-date');
            if (!dateInput.value) {
                const now = new Date();
                const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
                dateInput.value = localDate.toISOString().slice(0, 10);
            }
        }
        updateExpenseDateLabel();
        document.getElementById('expense-modal').style.display = 'block';
    }

    closeExpenseModal() {
        document.getElementById('expense-modal').style.display = 'none';
        document.getElementById('expense-form').reset();
        document.getElementById('expense-recurrence').value = 'specific';
        updateExpenseDateLabel();
        delete document.getElementById('expense-modal').dataset.editId;
        document.getElementById('expense-modal').querySelector('h2').textContent = 'Nova Despesa';
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
    document.getElementById('income-recurrence').value = ['monthly', 'yearly'].includes(inc.recurrence)
        ? inc.recurrence
        : 'specific';
    document.getElementById('income-modal').dataset.editId = id;
    document.getElementById('income-modal').querySelector('h2').textContent = 'Editar Receita';
    updateIncomeDateLabel();
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

function openExpenseModal() {
    app.openExpenseModal();
}

function closeExpenseModal() {
    app.closeExpenseModal();
}

function editExpense(id) {
    const exp = app.expenses.find(e => e.id == id);
    if (!exp) return;
    document.getElementById('expense-description').value = exp.description;
    document.getElementById('expense-amount').value = exp.amount;
    document.getElementById('expense-category').value = exp.category;
    document.getElementById('expense-date').value = (exp.date || '').split('T')[0];
    document.getElementById('expense-recurrence').value = ['monthly', 'yearly'].includes(exp.recurrence)
        ? exp.recurrence
        : 'specific';
    document.getElementById('expense-modal').dataset.editId = id;
    document.getElementById('expense-modal').querySelector('h2').textContent = 'Editar Despesa';
    updateExpenseDateLabel();
    openExpenseModal();
}

function toggleExpenseCompleted(id) {
    app.toggleExpenseCompleted(id);
}

async function deleteExpense(id) {
    if (!confirm('Excluir esta despesa?')) return;
    try {
        const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
        const data = await response.json();
        if (data.success) {
            app.expenses = app.expenses.filter(e => e.id != id);
            app.loadExpenses();
            app.updateDashboard();
        }
    } catch (error) {
        console.error('Erro ao excluir despesa:', error);
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

function createInstallmentGroup() {
    app.createInstallmentGroup();
}

function saveInstallmentGroup(groupId) {
    app.updateInstallmentGroup(groupId);
}

function deleteInstallmentGroup(groupId) {
    app.deleteInstallmentGroup(groupId);
}

function createSubscriptionGroup() {
    app.createSubscriptionGroup();
}

function saveSubscriptionGroup(groupId) {
    app.saveSubscriptionGroup(groupId);
}

function deleteSubscriptionGroup(groupId) {
    app.deleteSubscriptionGroup(groupId);
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

async function markInstallmentPaid(id, targetIndex = null, options = {}) {
    try {
        const inst = app.installments.find(i => i.id == id);
        const totalInstallments = Number(inst?.totalInstallments || inst?.total_installments || 0);
        const previousCurrentInstallment = Math.max(0, Math.min(Number(inst?.currentInstallment ?? inst?.current_installment ?? 0), totalInstallments));
        const normalizedTargetIndex = targetIndex === null || targetIndex === undefined ? previousCurrentInstallment : Number(targetIndex);

        if (inst && Number.isFinite(normalizedTargetIndex) && normalizedTargetIndex !== previousCurrentInstallment) {
            if (!options.silent) alert('Só é possível marcar como paga a próxima parcela pendente.');
            return false;
        }

        const response = await fetch(`/api/installments/${id}/mark-paid`, { method: 'POST' });
        const data = await response.json();
        if (data.success) {
            if (inst) {
                const currentInstallment = Number(data.data?.currentInstallment ?? (previousCurrentInstallment + 1));
                inst.currentInstallment = currentInstallment;
                inst.current_installment = currentInstallment;
                app.installmentPreviewIndexes[id] = Math.max(0, Math.min(normalizedTargetIndex, totalInstallments - 1));
            }
            if (!options.skipRefresh) {
                app.loadInstallments();
                app.updateDashboard();
            }
            return true;
        }

        if (!options.silent) alert(data.error || 'Erro ao marcar parcela como paga');
        return false;
    } catch (error) {
        console.error('Erro ao marcar parcela como paga:', error);
        if (!options.silent) alert('Erro ao marcar parcela como paga');
        return false;
    }
}

async function markInstallmentGroupPaid(groupKey) {
    const entries = (app.installments || [])
        .map(inst => ({ inst, entry: app.getInstallmentEntryForMonth(inst) }))
        .filter(item => item.entry)
        .filter(({ inst }) => {
            const group = app.getInstallmentGroupFor(inst);
            const key = group ? String(group.id) : 'none';
            return key === String(groupKey);
        });
    const payableEntries = app.getPayableInstallmentEntries(entries);

    if (payableEntries.length === 0) {
        alert('Nenhuma parcela pendente deste grupo pode ser marcada neste mês.');
        return;
    }

    const groupLabel = app.getInstallmentGroupLabel(payableEntries[0] ? app.getInstallmentGroupFor(payableEntries[0].inst) : null);
    if (!confirm(`Marcar ${payableEntries.length} parcela(s) de ${groupLabel} como paga(s) no mês selecionado?`)) return;

    let paid = 0;
    for (const { inst, entry } of payableEntries) {
        const ok = await markInstallmentPaid(inst.id, entry.index, { silent: true, skipRefresh: true });
        if (ok) paid += 1;
    }

    app.loadInstallments();
    app.updateDashboard();
    if (paid !== payableEntries.length) {
        alert(`${paid} de ${payableEntries.length} parcela(s) foram marcadas como pagas. Algumas falharam ou já estavam atualizadas.`);
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
    document.getElementById('installment-amount').value = inst.installmentAmount || inst.installment_amount || 0;
    document.getElementById('installment-count').value = inst.totalInstallments || inst.total_installments || 0;
    const paidInstallments = Number(inst.currentInstallment ?? inst.current_installment ?? 0);
    const totalInstallments = Number(inst.totalInstallments || inst.total_installments || 0);
    const referenceInstallment = Math.max(1, Math.min(paidInstallments + 1, totalInstallments || paidInstallments + 1));
    document.getElementById('installment-current').value = referenceInstallment;
    document.getElementById('installment-category').value = inst.category || 'compras';
    document.getElementById('installment-previous-paid').checked = paidInstallments > 0;
    const startDateValue = (inst.startDate || inst.start_date || '').split('T')[0];
    document.getElementById('installment-start').value = startDateValue;
    if (startDateValue) {
        const referenceDate = new Date(startDateValue + 'T00:00:00');
        referenceDate.setMonth(referenceDate.getMonth() + (referenceInstallment - 1));
        document.getElementById('installment-reference-month').value = app.formatMonthInputValue(referenceDate);
        document.getElementById('installment-payment-day').value = String(referenceDate.getDate());
    }
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
    // Preencher o grupo por último, imediatamente antes de abrir o modal
    app.populateInstallmentGroupSelect(inst.installmentGroupId ?? inst.installment_group_id ?? '');
    openInstallmentModal();
}

function toggleInstallmentEntryHidden(id, index) {
    app.toggleInstallmentEntryHidden(id, index);
}
async function markSubscriptionPaid(id, date) {
    try {
        const response = await fetch(`/api/goals/${id}/mark-paid`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(date ? { date } : {})
        });
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

async function paySubscriptionGroup(groupKey) {
    await app.paySubscriptionGroup(groupKey);
}

async function cancelSubscription(id) {
    await app.cancelSubscription(id);
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
    const setVal = (fieldId, value) => {
        const el = document.getElementById(fieldId);
        if (el) el.value = value;
    };
    setVal('subscription-name', sub.name);
    setVal('subscription-amount', sub.targetAmount || sub.target_amount || 0);
    setVal('subscription-category', sub.category || 'Streaming');
    setVal('subscription-payment-day', sub.paymentDay ?? sub.payment_day ?? '');
    setVal('subscription-start', sub.startDate ?? sub.start_date ?? '');
    setVal('subscription-end', sub.endDate ?? sub.end_date ?? '');
    app.populateSubscriptionGroupSelect(sub.subscriptionGroupId ?? sub.subscription_group_id ?? '');
    const modal = document.getElementById('subscription-modal');
    modal.dataset.editId = id;
    modal.querySelector('h2').textContent = 'Editar Assinatura';
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
    document.getElementById('shopping-purchase-url').value = item.purchaseUrl || item.purchase_url || '';
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

function confirmStatementPreview(transactions) {
    return new Promise(resolve => {
        const dialog = document.createElement('dialog'); dialog.className = 'import-preview';
        dialog.innerHTML = `<h2>Conferir importação</h2><p>${transactions.length} lançamentos reconhecidos. Revise antes de confirmar; duplicados já existentes serão ignorados.</p><div class="preview-rows">${transactions.map(t=>`<div><span>${esc(t.date)} · ${esc(t.description)}</span><strong>${t.type==='expense'?'−':'+'}${esc(FinanceCore.money(t.amount))}</strong></div>`).join('')}</div><footer><button class="btn secondary" data-cancel>Cancelar</button><button class="btn" data-confirm>Confirmar importação</button></footer>`;
        let accepted=false;
        dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();
        dialog.querySelector('[data-confirm]').onclick=()=>{accepted=true;dialog.close();};
        dialog.onclose=()=>{dialog.remove();resolve(accepted);};
        document.body.append(dialog);dialog.showModal();
    });
}

async function importStatement(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
        const previewResponse = await fetch('/api/import/statement?preview=1', {method:'POST',body:formData});
        const preview = await previewResponse.json();
        if (!preview.success || !preview.recognized) throw new Error(preview.error || 'Nenhuma transação reconhecida.');
        if (!await confirmStatementPreview(preview.transactions)) { input.value=''; return; }
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

function updateIncomeDateLabel() {
    const recurrence = document.getElementById('income-recurrence')?.value || 'specific';
    const label = document.getElementById('income-date-label');
    if (label) label.textContent = recurrence === 'specific' ? 'Data:' : 'Início da recorrência:';
}

function updateExpenseDateLabel() {
    const recurrence = document.getElementById('expense-recurrence')?.value || 'specific';
    const label = document.getElementById('expense-date-label');
    if (label) label.textContent = recurrence === 'specific' ? 'Data:' : 'Início da recorrência:';
}

function updateReportSelectionState() {
    const checkboxes = Array.from(document.querySelectorAll('input[name="report-section"]'));
    const selected = checkboxes.filter(input => input.checked).length;
    const status = document.getElementById('report-selection-status');
    if (status) {
        status.textContent = selected === 0
            ? 'Nenhuma seção selecionada'
            : `${selected} de ${checkboxes.length} seções selecionadas`;
    }
}

function setAllReportSections(checked) {
    document.querySelectorAll('input[name="report-section"]').forEach(input => {
        input.checked = checked;
    });
    updateReportSelectionState();
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
    const bancos = app.bankSelection();
    if (bancos) params.set('bancos', [...bancos].sort().join(','));

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

document.addEventListener("keydown",e=>{if(e.key==="Escape"){const menu=document.getElementById("profile-menu");if(menu?.classList.contains("open")){menu.classList.remove("open");document.querySelector(".pa-trigger")?.setAttribute("aria-expanded","false");document.querySelector(".pa-trigger")?.focus()}}});
