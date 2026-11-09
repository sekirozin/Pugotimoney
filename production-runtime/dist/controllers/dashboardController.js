"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardController = exports.DashboardController = void 0;
const financeService_1 = require("../services/financeService");
const database_1 = require("../models/database");
class DashboardController {
    // Obter dados do dashboard
    async getDashboard(req, res) {
        try {
            const { month, year } = req.query;
            const currentDate = new Date();
            const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
            const targetYear = year ? parseInt(year) : currentDate.getFullYear();
            const data = await (0, financeService_1.financialData)(req.user.id);
            const transactions = data.transactions;
            const budgets = await database_1.database.getBudgets(req.user.id);
            const now = new Date();
            const startOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const endOfMonthDate = new Date(targetYear, targetMonth, 0);
            const endOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endOfMonthDate.getDate()).padStart(2, '0')}`;
            if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12 || !Number.isInteger(targetYear)) {
                res.status(400).json({ success: false, error: 'Período inválido' });
                return;
            }
            const totals = financeService_1.finance.summary(data, targetYear, targetMonth);
            const monthlyTransactions = totals.entries;
            const totalBalance = totals.balance;
            const monthlyIncome = totals.income, monthlyExpenses = totals.expenses, categoryTotals = totals.categoryTotals;
            const budgetStatus = {};
            for (const budget of budgets) {
                const status = financeService_1.finance.budget(data, budget, targetYear, targetMonth, targetYear === now.getFullYear() && targetMonth === now.getMonth() + 1 ? now.getDate() : undefined);
                budgetStatus[budget.category] = { ...status, budget: budget.amount };
            }
            const recentTransactions = transactions
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10);
            const monthlyStats = {
                income: monthlyIncome,
                expenses: monthlyExpenses,
                transactionCount: monthlyTransactions.length
            };
            res.json({
                success: true,
                data: {
                    totalBalance,
                    monthlyIncome,
                    monthlyExpenses,
                    categoryTotals,
                    budgetStatus,
                    recentTransactions,
                    monthlyStats,
                    currentPeriod: {
                        month: targetMonth,
                        year: targetYear,
                        startOfMonth,
                        endOfMonth
                    }
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar dados do dashboard'
            });
        }
    }
    // Obter resumo financeiro
    async getFinancialSummary(req, res) {
        try {
            const data = await (0, financeService_1.financialData)(req.user.id);
            const now = new Date();
            const totals = financeService_1.finance.summary(data, now.getFullYear(), now.getMonth() + 1);
            const transactions = totals.entries;
            const budgets = await database_1.database.getBudgets(req.user.id);
            const creditCards = await database_1.database.getCreditCards(req.user.id);
            const goals = await database_1.database.getFinancialGoals(req.user.id);
            const totalIncome = totals.income, totalExpenses = totals.expenses, netWorth = totals.balance;
            const totalBudgeted = financeService_1.finance.sum(budgets.map(b => b.amount));
            const totalBudgetSpent = financeService_1.finance.sum(budgets.map(b => financeService_1.finance.budget(data, b, now.getFullYear(), now.getMonth() + 1, now.getDate()).spent));
            // Calcular totais de cartão
            const totalCardLimit = creditCards.reduce((sum, c) => sum + (c.creditLimit || c.credit_limit || 0), 0);
            const totalCardBalance = creditCards.reduce((sum, c) => sum + c.currentBalance, 0);
            // Calcular progresso de metas
            const totalGoalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
            const totalGoalCurrent = goals.reduce((sum, g) => sum + g.currentAmount, 0);
            res.json({
                success: true,
                data: {
                    income: {
                        total: totalIncome,
                        transactionCount: transactions.filter(t => t.type === 'income').length
                    },
                    expenses: {
                        total: totalExpenses,
                        transactionCount: transactions.filter(t => t.type === 'expense').length
                    },
                    netWorth,
                    budgets: {
                        totalBudgeted,
                        totalSpent: totalBudgetSpent,
                        remaining: totalBudgeted - totalBudgetSpent,
                        utilization: totalBudgeted > 0 ? (totalBudgetSpent / totalBudgeted) * 100 : 0
                    },
                    creditCards: {
                        totalLimit: totalCardLimit,
                        totalBalance: totalCardBalance,
                        available: totalCardLimit - totalCardBalance,
                        utilization: totalCardLimit > 0 ? (totalCardBalance / totalCardLimit) * 100 : 0
                    },
                    goals: {
                        totalTarget: totalGoalTarget,
                        totalCurrent: totalGoalCurrent,
                        progress: totalGoalTarget > 0 ? (totalGoalCurrent / totalGoalTarget) * 100 : 0,
                        completed: goals.filter(g => g.currentAmount >= g.targetAmount).length
                    },
                    period: {
                        currentMonth: new Date().getMonth() + 1,
                        currentYear: new Date().getFullYear()
                    }
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar resumo financeiro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo financeiro'
            });
        }
    }
    // Obter dados para gráficos
    async getChartData(req, res) {
        try {
            const { type, period } = req.query;
            const data = await (0, financeService_1.financialData)(req.user.id);
            const now = new Date();
            const transactions = financeService_1.finance.summary(data, now.getFullYear(), now.getMonth() + 1).entries;
            let chartData = {};
            switch (type) {
                case 'category':
                    // Gráfico de despesas por categoria
                    const categoryTotals = {};
                    transactions
                        .filter(t => t.type === 'expense')
                        .forEach(t => {
                        categoryTotals[t.category] = financeService_1.finance.sum([categoryTotals[t.category] || 0, t.amount]);
                    });
                    chartData = {
                        labels: Object.keys(categoryTotals),
                        datasets: [{
                                data: Object.values(categoryTotals),
                                backgroundColor: [
                                    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'
                                ]
                            }]
                    };
                    break;
                case 'monthly':
                    const monthlyData = {};
                    const currentYear = new Date().getFullYear();
                    for (let month = 1; month <= 12; month++) {
                        const { income, expenses } = financeService_1.finance.summary(data, currentYear, month);
                        monthlyData[`${String(month).padStart(2, '0')}`] = { income, expenses };
                    }
                    chartData = {
                        labels: Object.keys(monthlyData),
                        datasets: [
                            {
                                label: 'Receitas',
                                data: Object.values(monthlyData).map(d => d.income),
                                borderColor: '#2ecc71',
                                backgroundColor: 'rgba(46, 204, 113, 0.1)'
                            },
                            {
                                label: 'Despesas',
                                data: Object.values(monthlyData).map(d => d.expenses),
                                borderColor: '#e74c3c',
                                backgroundColor: 'rgba(231, 76, 60, 0.1)'
                            }
                        ]
                    };
                    break;
                case 'weekly':
                    // Gráfico semanal
                    const weeklyData = {};
                    const today = new Date();
                    const startOfWeek = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12));
                    startOfWeek.setUTCDate(startOfWeek.getUTCDate() - ((startOfWeek.getUTCDay() + 6) % 7) - 21);
                    for (let i = 0; i < 4; i++) {
                        const start = new Date(startOfWeek);
                        start.setUTCDate(start.getUTCDate() + i * 7);
                        const end = new Date(start);
                        end.setUTCDate(end.getUTCDate() + 6);
                        let entries = financeService_1.finance.summary(data, start.getUTCFullYear(), start.getUTCMonth() + 1).entries;
                        if (start.getUTCMonth() !== end.getUTCMonth())
                            entries = entries.concat(financeService_1.finance.summary(data, end.getUTCFullYear(), end.getUTCMonth() + 1).entries);
                        weeklyData[start.toISOString().slice(0, 10)] = financeService_1.finance.sum(entries
                            .filter(t => t.date >= start.toISOString().slice(0, 10) && t.date <= end.toISOString().slice(0, 10))
                            .map(t => t.type === 'income' ? t.amount : -t.amount));
                    }
                    chartData = {
                        labels: Object.keys(weeklyData),
                        datasets: [{
                                label: 'Saldo',
                                data: Object.values(weeklyData),
                                borderColor: '#36A2EB',
                                backgroundColor: 'rgba(54, 162, 235, 0.1)'
                            }]
                    };
                    break;
                default:
                    return res.status(400).json({
                        success: false,
                        error: 'Tipo de gráfico inválido'
                    });
            }
            res.json({
                success: true,
                data: chartData
            });
        }
        catch (error) {
            console.error('Erro ao buscar dados do gráfico:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar dados do gráfico'
            });
        }
    }
    // Obter atividades recentes
    async getRecentActivity(req, res) {
        try {
            const transactions = await database_1.database.getTransactions(undefined, req.user.id);
            const creditCards = await database_1.database.getCreditCards(req.user.id);
            const budgets = await database_1.database.getBudgets(req.user.id);
            // Combinar atividades recentes
            const activities = [
                ...transactions.map(t => ({
                    type: 'transaction',
                    description: t.description,
                    amount: t.amount,
                    date: t.date,
                    category: t.category,
                    transactionType: t.type
                })),
                ...creditCards.map(c => ({
                    type: 'credit_card',
                    description: `Cartão ${c.name}`,
                    amount: c.currentBalance,
                    date: c.created_at,
                    category: 'cartao_credito',
                    bank: c.bank
                })),
                ...budgets.map(b => ({
                    type: 'budget',
                    description: `Orçamento de ${b.category}`,
                    amount: b.spent,
                    date: b.created_at,
                    category: b.category,
                    budgetLimit: b.amount
                }))
            ];
            // Ordenar por data e limitar
            const recentActivities = activities
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10);
            res.json({
                success: true,
                data: {
                    totalActivities: activities.length,
                    recentActivities
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar atividades recentes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar atividades recentes'
            });
        }
    }
}
exports.DashboardController = DashboardController;
exports.dashboardController = new DashboardController();
//# sourceMappingURL=dashboardController.js.map