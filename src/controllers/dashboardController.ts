import { Request, Response } from 'express';
import { database } from '../models/database';
import { AuthRequest } from '../middleware/auth';

export class DashboardController {
    // Obter dados do dashboard
    async getDashboard(req: AuthRequest, res: Response) {
        try {
            const { month, year } = req.query;
            const currentDate = new Date();
            const targetMonth = month ? parseInt(month as string) : currentDate.getMonth() + 1;
            const targetYear = year ? parseInt(year as string) : currentDate.getFullYear();

            const transactions = await database.getTransactions(undefined, req.user!.id);
            const budgets = await database.getBudgets(req.user!.id);

            const now = new Date();
            const startOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const endOfMonthDate = new Date(targetYear, targetMonth, 0);
            const endOfMonth = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(endOfMonthDate.getDate()).padStart(2, '0')}`;

            const monthlyTransactions = transactions.filter(t => {
                const dateStr = t.date.split('T')[0];
                return dateStr >= startOfMonth && dateStr <= endOfMonth;
            });

            const totalBalance = transactions.reduce((sum, t) => {
                return sum + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);

            const monthlyIncome = monthlyTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const monthlyExpenses = monthlyTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const categoryTotals: Record<string, number> = {};
            monthlyTransactions
                .filter(t => t.type === 'expense')
                .forEach(t => {
                    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                });

            const budgetStatus: Record<string, any> = {};
            budgets.forEach(budget => {
                const spent = categoryTotals[budget.category] || 0;
                const remaining = budget.amount - spent;
                const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
                budgetStatus[budget.category] = {
                    budget: budget.amount,
                    spent,
                    remaining,
                    percentage,
                    status: percentage > 100 ? 'over' : percentage > 80 ? 'warning' : 'within'
                };
            });

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
        } catch (error) {
            console.error('Erro ao buscar dados do dashboard:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar dados do dashboard'
            });
        }
    }

    // Obter resumo financeiro
    async getFinancialSummary(req: AuthRequest, res: Response) {
        try {
            const transactions = await database.getTransactions(undefined, req.user!.id);
            const budgets = await database.getBudgets(req.user!.id);
            const creditCards = await database.getCreditCards(req.user!.id);
            const goals = await database.getFinancialGoals(req.user!.id);

            // Calcular totais gerais
            const totalIncome = transactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            const totalExpenses = transactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const netWorth = totalIncome - totalExpenses;

            // Calcular totais de orçamento
            const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
            const totalBudgetSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

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
        } catch (error) {
            console.error('Erro ao buscar resumo financeiro:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo financeiro'
            });
        }
    }

    // Obter dados para gráficos
    async getChartData(req: AuthRequest, res: Response) {
        try {
            const { type, period } = req.query;
            const transactions = await database.getTransactions(undefined, req.user!.id);

            let chartData: any = {};

            switch (type) {
                case 'category':
                    // Gráfico de despesas por categoria
                    const categoryTotals: Record<string, number> = {};
                    transactions
                        .filter(t => t.type === 'expense')
                        .forEach(t => {
                            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
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
                    const monthlyData: Record<string, { income: number; expenses: number }> = {};
                    const currentYear = new Date().getFullYear();
                    
                    for (let month = 1; month <= 12; month++) {
                        const monthStr = String(month).padStart(2, '0');
                        const monthTransactions = transactions.filter(t => {
                            const dateStr = t.date.split('T')[0];
                            const parts = dateStr.split('-');
                            return parseInt(parts[1]) === month && parseInt(parts[0]) === currentYear;
                        });

                        const income = monthTransactions
                            .filter(t => t.type === 'income')
                            .reduce((sum, t) => sum + t.amount, 0);

                        const expenses = monthTransactions
                            .filter(t => t.type === 'expense')
                            .reduce((sum, t) => sum + t.amount, 0);

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
                    const weeklyData: Record<string, number> = {};
                    const today = new Date();
                    const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
                    
                    for (let i = 0; i < 4; i++) {
                        const weekStart = new Date(startOfWeek);
                        weekStart.setDate(weekStart.getDate() + (i * 7));
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekEnd.getDate() + 6);

                        const weekTransactions = transactions.filter(t => {
                            const date = new Date(t.date);
                            return date >= weekStart && date <= weekEnd;
                        });

                        const balance = weekTransactions
                            .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

                        weeklyData[`Semana ${i + 1}`] = balance;
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
        } catch (error) {
            console.error('Erro ao buscar dados do gráfico:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar dados do gráfico'
            });
        }
    }

    // Obter atividades recentes
    async getRecentActivity(req: AuthRequest, res: Response) {
        try {
            const transactions = await database.getTransactions(undefined, req.user!.id);
            const creditCards = await database.getCreditCards(req.user!.id);
            const budgets = await database.getBudgets(req.user!.id);

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
        } catch (error) {
            console.error('Erro ao buscar atividades recentes:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar atividades recentes'
            });
        }
    }
}

export const dashboardController = new DashboardController();
