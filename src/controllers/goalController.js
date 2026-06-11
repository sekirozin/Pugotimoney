"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.goalController = exports.GoalController = void 0;
const express_1 = require("express");
const database_1 = require("../models/database");
const helpers_1 = require("../utils/helpers");
class GoalController {
    // Obter todas as metas financeiras
    async getGoals(req, res) {
        try {
            const goals = await database_1.database.getFinancialGoals();
            // Adicionar progresso detalhado a cada meta
            const goalsWithProgress = goals.map(goal => ({
                ...goal,
                progress: (0, helpers_1.getFinancialGoalProgress)(goal)
            }));
            res.json({
                success: true,
                data: goalsWithProgress,
                total: goals.length
            });
        }
        catch (error) {
            console.error('Erro ao buscar metas financeiras:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas financeiras'
            });
        }
    }
    // Adicionar nova meta financeira
    async addGoal(req, res) {
        try {
            const goalData = req.body;
            const goalId = await database_1.database.addFinancialGoal(goalData);
            res.status(201).json({
                success: true,
                data: { id: goalId, ...goalData },
                message: 'Meta financeira adicionada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao adicionar meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao adicionar meta financeira'
            });
        }
    }
    // Atualizar meta financeira
    async updateGoal(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updated = await database_1.database.updateFinancialGoal(parseInt(id), updates);
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }
            res.json({
                success: true,
                message: 'Meta financeira atualizada com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao atualizar meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar meta financeira'
            });
        }
    }
    // Excluir meta financeira
    async deleteGoal(req, res) {
        try {
            const { id } = req.params;
            const deleted = await database_1.database.deleteFinancialGoal(parseInt(id));
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }
            res.json({
                success: true,
                message: 'Meta financeira excluída com sucesso'
            });
        }
        catch (error) {
            console.error('Erro ao excluir meta financeira:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao excluir meta financeira'
            });
        }
    }
    // Atualizar valor atual da meta
    async updateCurrentAmount(req, res) {
        try {
            const { id } = req.params;
            const { amount } = req.body;
            if (typeof amount !== 'number' || amount < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valor inválido. Deve ser um número positivo.'
                });
            }
            // Buscar meta atual
            const goals = await database_1.database.getFinancialGoals();
            const goal = goals.find(g => g.id === parseInt(id));
            if (!goal) {
                return res.status(404).json({
                    success: false,
                    error: 'Meta não encontrada'
                });
            }
            const updated = await database_1.database.updateFinancialGoal(parseInt(id), {
                currentAmount: amount
            });
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    error: 'Erro ao atualizar valor atual'
                });
            }
            res.json({
                success: true,
                message: 'Valor atual atualizado com sucesso',
                data: {
                    goalId: parseInt(id),
                    newAmount: amount,
                    progress: (0, helpers_1.getFinancialGoalProgress)({ ...goal, currentAmount: amount })
                }
            });
        }
        catch (error) {
            console.error('Erro ao atualizar valor atual da meta:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao atualizar valor atual da meta'
            });
        }
    }
    // Obter metas próximas de serem alcançadas
    async getNearCompletionGoals(req, res) {
        try {
            const goals = await database_1.database.getFinancialGoals();
            const nearCompletion = goals
                .map(goal => ({
                ...goal,
                progress: (0, helpers_1.getFinancialGoalProgress)(goal)
            }))
                .filter(goal => goal.progress.percentage >= 90 && goal.progress.percentage < 100)
                .sort((a, b) => b.progress.percentage - a.progress.percentage);
            res.json({
                success: true,
                data: {
                    totalNearCompletion: nearCompletion.length,
                    goals: nearCompletion
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar metas próximas de conclusão:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas próximas de conclusão'
            });
        }
    }
    // Obter metas concluídas
    async getCompletedGoals(req, res) {
        try {
            const goals = await database_1.database.getFinancialGoals();
            const completed = goals
                .map(goal => ({
                ...goal,
                progress: (0, helpers_1.getFinancialGoalProgress)(goal)
            }))
                .filter(goal => goal.progress.isCompleted);
            res.json({
                success: true,
                data: {
                    totalCompleted: completed.length,
                    totalAmount: completed.reduce((sum, goal) => sum + goal.targetAmount, 0),
                    goals: completed
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar metas concluídas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar metas concluídas'
            });
        }
    }
    // Obter resumo geral das metas
    async getGoalsSummary(req, res) {
        try {
            const goals = await database_1.database.getFinancialGoals();
            const totalGoals = goals.length;
            const completedGoals = goals.filter(goal => {
                const progress = (0, helpers_1.getFinancialGoalProgress)(goal);
                return progress.isCompleted;
            }).length;
            const inProgressGoals = totalGoals - completedGoals;
            const totalTargetAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
            const totalCurrentAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
            const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;
            const byCategory = {};
            goals.forEach(goal => {
                if (!byCategory[goal.category || 'outros']) {
                    byCategory[goal.category || 'outros'] = { count: 0, target: 0, current: 0 };
                }
                byCategory[goal.category || 'outros'].count++;
                byCategory[goal.category || 'outros'].target += goal.targetAmount;
                byCategory[goal.category || 'outros'].current += goal.currentAmount;
            });
            res.json({
                success: true,
                data: {
                    totalGoals,
                    completedGoals,
                    inProgressGoals,
                    totalTargetAmount,
                    totalCurrentAmount,
                    overallProgress,
                    byCategory,
                    averageProgress: totalGoals > 0 ? goals.reduce((sum, goal) => {
                        const progress = (0, helpers_1.getFinancialGoalProgress)(goal);
                        return sum + progress.percentage;
                    }, 0) / totalGoals : 0
                }
            });
        }
        catch (error) {
            console.error('Erro ao buscar resumo das metas:', error);
            res.status(500).json({
                success: false,
                error: 'Erro ao buscar resumo das metas'
            });
        }
    }
}
exports.GoalController = GoalController;
exports.goalController = new GoalController();
//# sourceMappingURL=goalController.js.map