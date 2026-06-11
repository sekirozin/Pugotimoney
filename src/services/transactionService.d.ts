import { Transaction } from '../models/types';
export declare class TransactionService {
    private static instance;
    private transactions;
    static getInstance(): TransactionService;
    addTransaction(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<number>;
    getTransactions(filters?: {
        type?: 'income' | 'expense';
        category?: string;
        startDate?: string;
        endDate?: string;
        minAmount?: number;
        maxAmount?: number;
    }): Promise<Transaction[]>;
    getTransactionById(id: number): Promise<Transaction | null>;
    updateTransaction(id: number, updates: Partial<Transaction>): Promise<boolean>;
    deleteTransaction(id: number): Promise<boolean>;
    getMonthlySummary(year: number, month: number): Promise<{
        income: number;
        expenses: number;
        balance: number;
        transactionCount: number;
        categoryTotals: {
            [key: string]: number;
        };
    }>;
    getYearlySummary(year: number): Promise<{
        yearlyIncome: number;
        yearlyExpenses: number;
        yearlyBalance: number;
        monthlyData: {
            [key: string]: {
                income: number;
                expenses: number;
                balance: number;
            };
        };
    }>;
    getCategoryTotals(type?: 'income' | 'expense' | 'all'): Promise<{
        [key: string]: number;
    }>;
    getRecentTransactions(limit?: number): Promise<Transaction[]>;
    getDailyTransactions(date: string): Promise<Transaction[]>;
    getTransactionsByCategory(category: string): Promise<Transaction[]>;
    getAverageTransactionAmount(type: 'income' | 'expense'): Promise<number>;
    getLargestTransactions(type: 'income' | 'expense', limit?: number): Promise<Transaction[]>;
    getTransactionCountByPeriod(startDate: string, endDate: string): Promise<{
        income: number;
        expense: number;
    }>;
}
//# sourceMappingURL=transactionService.d.ts.map