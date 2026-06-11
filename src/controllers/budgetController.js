"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.budgetController = exports.BudgetController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
const types_1 = require("../models/types");
const helpers_1 = require("../utils/helpers");
class BudgetController {
    // Obter todos os orçamentos
    async getBudgets(req, res) {
        try {
            const budgets = await database_1.database.getBudgets();
            // Adicionar status detalhado a cada orçamento
            const budgetsWithStatus = budgets.map(budget => ({
                ...budget,
                periodName: (0, helpers_1.getPeriodName)(budget.period),
                status: (0, helpers_1.getBudgetStatus)(budget)
            }));
            res.json({
                success: true,
                data: budgetsWithStatus,
                total: budgets.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar orçamentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar orçamentos'
            });
        }
    }
    // Adicionar novo orçamento
    async addBudget(req, res) {
        try {
            const budgetData = req.body;
            const budgetId = await database_1.database.addBudget(budgetData);
            res.status(201).json({
                success: true,
                data: { id: budgetId, ...budgetData },
                message: 'Orçamento adicionado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao adicionar orçamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar orçamento'
            });
        }
    }
    // Atualizar orçamento
    async updateBudget(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updated = await database_1.database.updateBudget(parseInt(id), updates);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Orçamento não encontrado'
                });
            }
            res.json({
                success: true,
                message: 'Orçamento atualizado com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar orçamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar orçamento'
            });
        }
    }
    // Excluir orçamento
    async deleteBudget(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteBudget(parseInt(id));
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Orçamento não encontrado'
                });
            }
            res.json({
                success: true,
                message: 'Orçamento excluído com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir orçamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir orçamento'
            });
        }
    }
    // Atualizar valor gasto do orçamento
    async updateSpentAmount(req, res) {
        try {
            const { id } = req.params;
            const { amount } = req.body;
            if (typeof amount !== 'number' || amount < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor inválido. Deve ser um número positivo.'
                });
            }
            // Buscar orçamento atual
            const budgets = await database_1.database.getBudgets();
            const budget = budgets.find(b => b.id === parseInt(id));
            if (!budget) {
                return res.status(404).json({
                    success: false,
                    error: 'Orçamento não encontrado'
                });
            }
            const updated = await database_1.database.updateBudget(parseInt(id), {
                spent: amount
            });
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar valor gasto'
                });
            }
            res.json({
                success: true,
                message: 'Valor gasto atualizado com sucesso',
                data: {
                    budgetId: parseInt(id),
                    newSpent: amount,
                    status: (0, helpers_1.getBudgetStatus)({ ...budget, spent: amount })
                }
            });
        }
        catch (error) {
            console.error('Erro ao atualizar valor gasto:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar valor gasto'
            });
        }
    }
    // Obter status dos orçamentos
    async getBudgetsStatus(req, res) {
        try {
            const budgets = await database_1.database.getBudgets();
            const now = new Date();
            // Calcular totais por categoria para o período atual
            const categoryTotals = {};
            let totalBudgeted = 0;
            let totalSpent = 0;
            let overBudget = 0;
            let warningBudget = 0;
            budgets.forEach(budget => {
                totalBudgeted += budget.amount;
                totalSpent += budget.spent;
                const status = (0, helpers_1.getBudgetStatus)(budget);
                if (status.status === 'over')
                    overBudget++;
                else if (status.status === 'warning')
                    warningBudget++;
                categoryTotals[budget.category] = status.remaining;
            });
            res.json({
                success: true,
                data: {
                    totalBudgets: budgets.length,
                    totalBudgeted,
                    totalSpent,
                    remaining: totalBudgeted - totalSpent,
                    overBudget,
                    warningBudget,
                    onBudget: budgets.length - overBudget - warningBudget,
                    categoryTotals,
                    overallStatus: totalSpent > totalBudgeted ? 'over' : totalSpent / totalBudgeted > 0.8 ? 'warning' : 'within'
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar status dos orçamentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar status dos orçamentos'
            });
        }
    }
    // Obter alertas de orçamento
    async getBudgetAlerts(req, res) {
        try {
            const budgets = await database_1.database.getBudgets();
            const alerts = [];
            for (const budget of budgets) {
                const status = (0, helpers_1.getBudgetStatus)(budget);
                if (status.status === 'over' || status.status === 'warning') {
                    alerts.push({
                        budget: {
                            id: budget.id,
                            category: budget.category,
                            amount: budget.amount,
                            spent: budget.spent,
                            period: budget.period
                        },
                        status: status.status,
                        percentage: status.percentage,
                        remaining: status.remaining,
                        message: status.status === 'over'
                            ? `Orçamento de ${budget.category} estourado! ${status.percentage.toFixed(1)}% utilizado.`
                            : `Atenção: Orçamento de ${budget.category} está próximo do limite. ${status.percentage.toFixed(1)}% utilizado.`
                    });
                }
            }
            res.json({
                success: true,
                data: {
                    totalAlerts: alerts.length,
                    alerts,
                    hasCriticalAlerts: alerts.some(a => a.status === 'over')
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar alertas de orçamento:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar alertas de orçamento'
            });
        }
    }
    // Obter resumo mensal dos orçamentos
    async getMonthlyBudgetSummary(req, res) {
        try {
            const { year, month } = req.query;
            if (!year || !month) {
                return res.status(400).json({
                    success: false,
                    error: 'Ano e mês são obrigatórios'
                });
            }
            const budgets = await database_1.database.getBudgets();
            const now = new Date();
            const currentMonth = parseInt(month);
            const currentYear = parseInt(year);
            const monthlySummary = budgets.map(budget => {
                const status = (0, helpers_1.getBudgetStatus)(budget);
                return {
                    ...budget,
                    periodName: (0, helpers_1.getPeriodName)(budget.period),
                    status,
                    isCurrentMonth: currentMonth === now.getMonth() + 1 && currentYear === now.getFullYear()
                };
            });
            res.json({
                success: true,
                data: {
                    month: parseInt(month),
                    year: parseInt(year),
                    totalBudgets: budgets.length,
                    totalBudgeted: budgets.reduce((sum, b) => sum + b.amount, 0),
                    totalSpent: budgets.reduce((sum, b) => sum + b.spent, 0),
                    monthlySummary
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar resumo mensal dos orçamentos:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo mensal dos orçamentos'
            });
        }
    }
}
exports.BudgetController = BudgetController;
exports.budgetController = new BudgetController();
//# sourceMappingURL=budgetController.js.map