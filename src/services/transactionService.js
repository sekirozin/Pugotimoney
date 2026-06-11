"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionService = void 0;
const types_1 = require("../models/types");
class TransactionService {
    static instance;
    transactions = [];
    static getInstance() {
        if (!TransactionService.instance) {
            TransactionService.instance = new TransactionService();
        }
        return TransactionService.instance;
    }
    async addTransaction(transaction) {
        const newTransaction = {
            ...transaction,
            id: Date.now(),
            created_at: new Date().toISOString()
        };
        this.transactions.push(newTransaction);
        return newTransaction.id;
    }
    async getTransactions(filters) {
        let filteredTransactions = [...this.transactions];
        if (filters) {
            if (filters.type) {
                filteredTransactions = filteredTransactions.filter(t => t.type === filters.type);
            }
            if (filters.category) {
                filteredTransactions = filteredTransactions.filter(t => t.category === filters.category);
            }
            if (filters.startDate) {
                filteredTransactions = filteredTransactions.filter(t => t.date >= filters.startDate);
            }
            if (filters.endDate) {
                filteredTransactions = filteredTransactions.filter(t => t.date <= filters.endDate);
            }
            if (filters.minAmount) {
                filteredTransactions = filteredTransactions.filter(t => t.amount >= filters.minAmount);
            }
            if (filters.maxAmount) {
                filteredTransactions = filteredTransactions.filter(t => t.amount <= filters.maxAmount);
            }
        }
        return filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async getTransactionById(id) {
        return this.transactions.find(t => t.id === id) || null;
    }
    async updateTransaction(id, updates) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1)
            return false;
        this.transactions[index] = { ...this.transactions[index], ...updates };
        return true;
    }
    async deleteTransaction(id) {
        const index = this.transactions.findIndex(t => t.id === id);
        if (index === -1)
            return false;
        this.transactions.splice(index, 1);
        return true;
    }
    async getMonthlySummary(year, month) {
        const monthTransactions = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year && date.getMonth() === month;
        });
        const income = monthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = monthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const categoryTotals = {};
        monthTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
        });
        return {
            income,
            expenses,
            balance: income - expenses,
            transactionCount: monthTransactions.length,
            categoryTotals
        };
    }
    async getYearlySummary(year) {
        const yearTransactions = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date.getFullYear() === year;
        });
        const monthlyData = {};
        for (let month = 0; month < 12; month++) {
            const monthTransactions = yearTransactions.filter(t => {
                const date = new Date(t.date);
                return date.getMonth() === month;
            });
            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = {
                income,
                expenses,
                balance: income - expenses
            };
        }
        return {
            yearlyIncome: Object.values(monthlyData).reduce((sum, m) => sum + m.income, 0),
            yearlyExpenses: Object.values(monthlyData).reduce((sum, m) => sum + m.expenses, 0),
            yearlyBalance: Object.values(monthlyData).reduce((sum, m) => sum + m.balance, 0),
            monthlyData
        };
    }
    async getCategoryTotals(type = 'all') {
        const filteredTransactions = type === 'all'
            ? this.transactions
            : this.transactions.filter(t => t.type === type);
        const totals = {};
        filteredTransactions.forEach(t => {
            totals[t.category] = (totals[t.category] || 0) + t.amount;
        });
        return totals;
    }
    async getRecentTransactions(limit = 10) {
        return this.transactions
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, limit);
    }
    async getDailyTransactions(date) {
        return this.transactions
            .filter(t => t.date === date)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    async getTransactionsByCategory(category) {
        return this.transactions
            .filter(t => t.category === category)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    async getAverageTransactionAmount(type) {
        const typeTransactions = this.transactions.filter(t => t.type === type);
        if (typeTransactions.length === 0)
            return 0;
        const total = typeTransactions.reduce((sum, t) => sum + t.amount, 0);
        return total / typeTransactions.length;
    }
    async getLargestTransactions(type, limit = 5) {
        return this.transactions
            .filter(t => t.type === type)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, limit);
    }
    async getTransactionCountByPeriod(startDate, endDate) {
        const periodTransactions = this.transactions.filter(t => {
            const date = new Date(t.date);
            return date >= new Date(startDate) && date <= new Date(endDate);
        });
        return {
            income: periodTransactions.filter(t => t.type === 'income').length,
            expense: periodTransactions.filter(t => t.type === 'expense').length
        };
    }
}
exports.TransactionService = TransactionService;
//# sourceMappingURL=transactionService.js.map