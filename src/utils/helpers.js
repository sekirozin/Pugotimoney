"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BUDGET_PERIODS = exports.CATEGORIES = void 0;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatDateTime = formatDateTime;
exports.getCategoryName = getCategoryName;
exports.getCategoryColor = getCategoryColor;
exports.getPeriodName = getPeriodName;
exports.calculatePercentage = calculatePercentage;
exports.getBudgetStatus = getBudgetStatus;
exports.getCardAvailableLimit = getCardAvailableLimit;
exports.getInstallmentStatus = getInstallmentStatus;
exports.getFinancialGoalProgress = getFinancialGoalProgress;
exports.generateTransactionId = generateTransactionId;
exports.validateTransaction = validateTransaction;
exports.validateCreditCard = validateCreditCard;
exports.getDashboardData = getDashboardData;
exports.exportToCSV = exportToCSV;
exports.debounce = debounce;
const types_1 = require("../models/types");
exports.CATEGORIES = {
    INCOME: [
        { id: 'salario', name: 'Salário', color: '#2ecc71' },
        { id: 'investimentos', name: 'Investimentos', color: '#9b59b6' },
        { id: 'servicos', name: 'Serviços', color: '#3498db' },
        { id: 'outros_receitas', name: 'Outros Receitas', color: '#95a5a6' }
    ],
    EXPENSE: [
        { id: 'alimentacao', name: 'Alimentação', color: '#e74c3c' },
        { id: 'transporte', name: 'Transporte', color: '#3498db' },
        { id: 'moradia', name: 'Moradia', color: '#f39c12' },
        { id: 'saude', name: 'Saúde', color: '#1abc9c' },
        { id: 'lazer', name: 'Lazer', color: '#e67e22' },
        { id: 'educacao', name: 'Educação', color: '#34495e' },
        { id: 'compras', name: 'Compras', color: '#8e44ad' },
        { id: 'assinaturas', name: 'Assinaturas', color: '#2980b9' },
        { id: 'eletronicos', name: 'Eletrônicos', color: '#16a085' },
        { id: 'servicos', name: 'Serviços', color: '#c0392b' },
        { id: 'outros_despesas', name: 'Outras Despesas', color: '#95a5a6' }
    ]
};
exports.BUDGET_PERIODS = [
    { id: 'weekly', name: 'Semanal' },
    { id: 'monthly', name: 'Mensal' },
    { id: 'yearly', name: 'Anual' }
];
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}
function formatDate(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR');
}
function formatDateTime(date) {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('pt-BR');
}
function getCategoryName(categoryId) {
    const allCategories = [...exports.CATEGORIES.INCOME, ...exports.CATEGORIES.EXPENSE];
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
}
function getCategoryColor(categoryId) {
    const allCategories = [...exports.CATEGORIES.INCOME, ...exports.CATEGORIES.EXPENSE];
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.color : '#667eea';
}
function getPeriodName(periodId) {
    const period = exports.BUDGET_PERIODS.find(p => p.id === periodId);
    return period ? period.name : periodId;
}
function calculatePercentage(value, total) {
    if (total === 0)
        return 0;
    return (value / total) * 100;
}
function getBudgetStatus(budget) {
    const percentage = calculatePercentage(budget.spent, budget.amount);
    const remaining = budget.amount - budget.spent;
    let status = 'within';
    let color = '#2ecc71';
    if (percentage > 100) {
        status = 'over';
        color = '#e74c3c';
    }
    else if (percentage > 80) {
        status = 'warning';
        color = '#f39c12';
    }
    return {
        percentage,
        remaining,
        status,
        color
    };
}
function getCardAvailableLimit(card, transactions) {
    const limit = card.creditLimit || card.credit_limit || 0;
    if (!transactions) {
        return limit - card.currentBalance;
    }
    const cardTransactions = transactions.filter(t => {
        return t.category === 'cartao_credito' || t.category === 'credito';
    });
    const totalSpent = cardTransactions.reduce((sum, t) => sum + t.amount, 0);
    return limit - totalSpent;
}
function getInstallmentStatus(installment) {
    const progress = installment.currentInstallment;
    const total = installment.totalInstallments;
    const remaining = total - progress;
    const progressPercentage = calculatePercentage(progress, total);
    return {
        progress,
        remainingInstallments: remaining,
        isCompleted: progress >= total,
        progressPercentage
    };
}
function getFinancialGoalProgress(goal) {
    const percentage = calculatePercentage(goal.currentAmount, goal.targetAmount);
    const remaining = goal.targetAmount - goal.currentAmount;
    const isCompleted = percentage >= 100;
    let estimatedCompletion;
    if (!isCompleted && goal.targetDate) {
        const targetDate = new Date(goal.targetDate);
        const today = new Date();
        const daysRemaining = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysRemaining > 0) {
            const monthlyNeeded = remaining / (daysRemaining / 30);
            estimatedCompletion = new Date(today.getTime() + (remaining / monthlyNeeded) * 30 * 24 * 60 * 60 * 1000);
        }
    }
    return {
        percentage,
        remaining,
        estimatedCompletion,
        isCompleted
    };
}
function generateTransactionId() {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}
function validateTransaction(transaction) {
    const errors = [];
    if (!transaction.type || !['income', 'expense'].includes(transaction.type)) {
        errors.push('Tipo de transação inválido');
    }
    if (!transaction.amount || transaction.amount <= 0) {
        errors.push('Valor deve ser maior que zero');
    }
    if (!transaction.category) {
        errors.push('Categoria é obrigatória');
    }
    if (!transaction.description || transaction.description.trim().length === 0) {
        errors.push('Descrição é obrigatória');
    }
    if (!transaction.date) {
        errors.push('Data é obrigatória');
    }
    else {
        const transactionDate = new Date(transaction.date);
        const today = new Date();
        if (transactionDate > today) {
            errors.push('Data da transação não pode ser futura');
        }
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function validateCreditCard(card) {
    const errors = [];
    if (!card.name || card.name.trim().length === 0) {
        errors.push('Nome do cartão é obrigatório');
    }
    if (!card.bank || card.bank.trim().length === 0) {
        errors.push('Banco é obrigatório');
    }
    if (!card.creditLimit || card.creditLimit <= 0) {
        errors.push('Limite deve ser maior que zero');
    }
    if (card.closingDate && new Date(card.closingDate) > new Date()) {
        errors.push('Data de fechamento não pode ser futura');
    }
    if (card.dueDate && new Date(card.dueDate) > new Date()) {
        errors.push('Data de vencimento não pode ser futura');
    }
    return {
        isValid: errors.length === 0,
        errors
    };
}
function getDashboardData(transactions, budgets) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    // Calcular saldos
    const totalBalance = transactions.reduce((sum, t) => {
        return sum + (t.type === 'income' ? t.amount : -t.amount);
    }, 0);
    const monthlyTransactions = transactions.filter(t => {
        const date = new Date(t.date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    // Calcular totais por categoria
    const categoryTotals = {};
    monthlyTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
        categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    // Calcular status dos orçamentos
    const budgetStatus = {};
    budgets.forEach(budget => {
        const spent = categoryTotals[budget.category] || 0;
        const remaining = budget.amount - spent;
        const percentage = calculatePercentage(spent, budget.amount);
        budgetStatus[budget.category] = {
            budget: budget.amount,
            spent,
            remaining,
            percentage,
            status: percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'within'
        };
    });
    // Obter transações recentes
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    return {
        totalBalance,
        monthlyIncome,
        monthlyExpenses,
        categoryTotals,
        budgetStatus,
        recentTransactions
    };
}
function exportToCSV(data, filename) {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(','))
    ].join('\n');
    // @ts-ignore - Browser only
    if (typeof document !== 'undefined') {
        // @ts-ignore
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        // @ts-ignore
        const link = document.createElement('a');
        // @ts-ignore
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        // @ts-ignore
        document.body.appendChild(link);
        link.click();
        // @ts-ignore
        document.body.removeChild(link);
    }
}
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
//# sourceMappingURL=helpers.js.map