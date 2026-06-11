import { Transaction, ShoppingItem, CreditCard, Budget, FinancialGoal } from '../models/types';

export const CATEGORIES = {
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

export const BUDGET_PERIODS = [
    { id: 'weekly', name: 'Semanal' },
    { id: 'monthly', name: 'Mensal' },
    { id: 'yearly', name: 'Anual' }
];

export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

export function formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleString('pt-BR');
}

export function getCategoryName(categoryId: string): string {
    const allCategories = [...CATEGORIES.INCOME, ...CATEGORIES.EXPENSE];
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.name : categoryId;
}

export function getCategoryColor(categoryId: string): string {
    const allCategories = [...CATEGORIES.INCOME, ...CATEGORIES.EXPENSE];
    const category = allCategories.find(c => c.id === categoryId);
    return category ? category.color : '#667eea';
}

export function getPeriodName(periodId: string): string {
    const period = BUDGET_PERIODS.find(p => p.id === periodId);
    return period ? period.name : periodId;
}

export function calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return (value / total) * 100;
}

export function getBudgetStatus(budget: Budget): {
    percentage: number;
    remaining: number;
    status: 'within' | 'warning' | 'over';
    color: string;
} {
    const percentage = calculatePercentage(budget.spent, budget.amount);
    const remaining = budget.amount - budget.spent;
    
    let status: 'within' | 'warning' | 'over' = 'within';
    let color: string = '#2ecc71';

    if (percentage > 100) {
        status = 'over';
        color = '#e74c3c';
    } else if (percentage > 80) {
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

export function getCardAvailableLimit(card: CreditCard, transactions?: Transaction[]): number {
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

export function getInstallmentStatus(installment: any): {
    progress: number;
    remainingInstallments: number;
    isCompleted: boolean;
    progressPercentage: number;
} {
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

export function getFinancialGoalProgress(goal: FinancialGoal): {
    percentage: number;
    remaining: number;
    estimatedCompletion?: Date;
    isCompleted: boolean;
} {
    const percentage = calculatePercentage(goal.currentAmount, goal.targetAmount);
    const remaining = goal.targetAmount - goal.currentAmount;
    const isCompleted = percentage >= 100;

    let estimatedCompletion: Date | undefined;

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

export function generateTransactionId(): string {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

export function validateTransaction(transaction: Partial<Transaction>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

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
    } else {
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

export function validateCreditCard(card: Partial<CreditCard>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!card.name || card.name.trim().length === 0) {
        errors.push('Nome do cartão é obrigatório');
    }

    if (!card.bank || card.bank.trim().length === 0) {
        errors.push('Banco é obrigatório');
    }

    if (!card.creditLimit || card.creditLimit <= 0) {
        errors.push('Limite deve ser maior que zero');
    }

    if (card.closingDate && Number.isNaN(new Date(card.closingDate).getTime())) {
        errors.push('Data de fechamento inválida');
    }

    if (card.dueDate && Number.isNaN(new Date(card.dueDate).getTime())) {
        errors.push('Data de vencimento inválida');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

export function getDashboardData(transactions: Transaction[], budgets: Budget[]): {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    categoryTotals: { [key: string]: number };
    budgetStatus: { [key: string]: any };
    recentTransactions: Transaction[];
} {
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
    const categoryTotals: { [key: string]: number } = {};
    monthlyTransactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });

    // Calcular status dos orçamentos
    const budgetStatus: { [key: string]: any } = {};
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

export function exportToCSV(data: any[], filename: string): void {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
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

export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
