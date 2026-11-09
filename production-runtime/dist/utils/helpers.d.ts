import { Transaction, CreditCard, Budget, FinancialGoal } from '../models/types';
export declare const CATEGORIES: {
    INCOME: {
        id: string;
        name: string;
        color: string;
    }[];
    EXPENSE: {
        id: string;
        name: string;
        color: string;
    }[];
};
export declare const BUDGET_PERIODS: {
    id: string;
    name: string;
}[];
export declare function formatCurrency(value: number): string;
export declare function formatDate(date: string | Date): string;
export declare function formatDateTime(date: string | Date): string;
export declare function getCategoryName(categoryId: string): string;
export declare function getCategoryColor(categoryId: string): string;
export declare function getPeriodName(periodId: string): string;
export declare function calculatePercentage(value: number, total: number): number;
export declare function getBudgetStatus(budget: Budget): {
    percentage: number;
    remaining: number;
    status: 'within' | 'warning' | 'over';
    color: string;
};
export declare function getCardAvailableLimit(card: CreditCard, transactions?: Transaction[]): number;
export declare function getInstallmentStatus(installment: any): {
    progress: number;
    remainingInstallments: number;
    isCompleted: boolean;
    progressPercentage: number;
};
export declare function getFinancialGoalProgress(goal: FinancialGoal): {
    percentage: number;
    remaining: number;
    estimatedCompletion?: Date;
    isCompleted: boolean;
};
export declare function generateTransactionId(): string;
export declare function validateTransaction(transaction: Partial<Transaction>): {
    isValid: boolean;
    errors: string[];
};
export declare function validateCreditCard(card: Partial<CreditCard>): {
    isValid: boolean;
    errors: string[];
};
export declare function getDashboardData(transactions: Transaction[], budgets: Budget[]): {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    categoryTotals: {
        [key: string]: number;
    };
    budgetStatus: {
        [key: string]: any;
    };
    recentTransactions: Transaction[];
};
export declare function exportToCSV(data: any[], filename: string): void;
export declare function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void;
//# sourceMappingURL=helpers.d.ts.map