export interface Transaction {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    description: string;
    date: string;
    payment_method: string;
    recurrence?: string | null;
    recurrence_end_date?: string | null;
    created_at: string;
}
export interface ShoppingItem {
    id: number;
    item: string;
    category: string;
    estimatedPrice: number;
    purchased: boolean;
    created_at: string;
    updated_at: string;
}
export interface CreditCard {
    id: number;
    name: string;
    bank: string;
    credit_limit: number;
    creditLimit: number;
    closingDate: string;
    dueDate: string;
    currentBalance: number;
    created_at: string;
}
export interface Budget {
    id: number;
    category: string;
    amount: number;
    period: 'weekly' | 'monthly' | 'yearly';
    spent: number;
    created_at: string;
}
export interface Installment {
    id: number;
    description: string;
    totalAmount: number;
    installmentAmount: number;
    totalInstallments: number;
    currentInstallment: number;
    startDate: string;
    category: string;
    creditCardId?: number;
    card_name?: string;
    card_bank?: string;
    created_at: string;
}
export interface FinancialGoal {
    id: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: string;
    category?: string;
    created_at: string;
}
export interface Category {
    id: number;
    name: string;
    type: 'income' | 'expense';
    color: string;
    created_at: string;
}
export interface DashboardData {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsGoal: number;
    categoryTotals: {
        [key: string]: number;
    };
    recentTransactions: Transaction[];
    budgetStatus: {
        [key: string]: {
            budget: number;
            spent: number;
            remaining: number;
        };
    };
}
export interface Filters {
    type?: 'income' | 'expense' | 'all';
    category?: string;
    startDate?: string;
    endDate?: string;
    minAmount?: number;
    maxAmount?: number;
}
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
//# sourceMappingURL=types.d.ts.map